import {HttpError,fail,json,uuid,first,session,requireDB} from './core.mjs';
import {authRoute} from './auth.mjs';
import {listingRoute} from './listings.mjs';
import {mediaRoute,maintenance} from './media.mjs';
import {operationsRoute} from './operations.mjs';

export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url),start=performance.now(),requestId=uuid();
  if(url.pathname==='/runtime-config.js')return new Response('window.OROO_CONFIG={mode:"cloud",apiVersion:1};document.documentElement.dataset.orooMode="cloud";',{headers:{'content-type':'application/javascript; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
  if(!url.pathname.startsWith('/api/'))return env.ASSETS.fetch(request);
  let response;try{
   if(request.method==='OPTIONS')fail(405,'method_not_allowed');requireDB(env);
   if(url.pathname==='/api/health'&&request.method==='GET'){const meta=await first(env,"SELECT value FROM app_meta WHERE key='schema_version'");const ready=meta?.value==='1'&&!!env.MEDIA;response=json({ok:ready,schemaVersion:meta?.value||null,database:!!env.DB,media:!!env.MEDIA},ready?200:503)}
   else {
    const cacheable=request.method==='GET'&&['/api/listings','/api/map/clusters','/api/regions/summary'].includes(url.pathname)&&url.search.length<1600;
    let cacheKey,cache=cacheable&&globalThis.caches?.default;
    if(cache){const version=await first(env,"SELECT value FROM app_meta WHERE key='public_version'");const cacheUrl=new URL(request.url);cacheUrl.pathname='/api/_search-cache'+url.pathname;cacheUrl.searchParams.set('_version',version.value);cacheUrl.searchParams.set('_day',new Date().toISOString().slice(0,10));cacheKey=new Request(cacheUrl);const cached=await cache.match(cacheKey);if(cached){response=new Response(cached.body,{headers:{...Object.fromEntries(cached.headers),'cache-control':'no-store','x-oroo-cache':'HIT'}})}}
    if(!response)response=await authRoute(request,env,url.pathname,requestId);
    if(!response){const user=await session(env,request);response=await mediaRoute(request,env,url,user,ctx)||await listingRoute(request,env,url,user,requestId)||await operationsRoute(request,env,url,user,requestId)}
    if(!response)fail(404,'not_found');
    if(cache&&response.ok&&!response.headers.has('x-oroo-cache')){const copy=response.clone();ctx.waitUntil(cache.put(cacheKey,new Response(copy.body,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, max-age=30'}})))}
   }
  }catch(error){if(error instanceof HttpError)response=json({error:error.code,message:error.message,requestId},error.status,error.status===429?{'retry-after':'900'}:{});else{console.error(JSON.stringify({event:'api_error',requestId,path:url.pathname,errorType:error?.name||'Error'}));response=json({error:'server_error',message:'Сервер түр боломжгүй байна. Түр хүлээгээд дахин оролдоно уу.',requestId},500)}}
  const headers=new Headers(response.headers);headers.set('x-request-id',requestId);headers.set('server-timing','app;dur='+(performance.now()-start).toFixed(1));headers.set('x-content-type-options','nosniff');headers.set('referrer-policy','same-origin');
  return new Response(response.body,{status:response.status,headers});
 },
 async scheduled(event,env,ctx){ctx.waitUntil(maintenance(env))}
};
