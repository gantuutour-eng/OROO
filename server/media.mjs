import {fail,json,now,seconds,uuid,text,readJson,first,all,run,stmt,mutation,session,rate,mediaDTO,publicPredicate} from './core.mjs';

export function jpegSize(bytes){
 if(bytes.length<4||bytes[0]!==255||bytes[1]!==216)return null;
 for(let at=2;at+4<bytes.length;){if(bytes[at]!==255){at++;continue}const marker=bytes[at+1];if(marker===216||marker===1){at+=2;continue}if(marker===218||marker===217)break;const length=bytes[at+2]*256+bytes[at+3];if(length<2)return null;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){if(at+9>bytes.length)return null;return {height:bytes[at+5]*256+bytes[at+6],width:bytes[at+7]*256+bytes[at+8]}}at+=length+2}
 return null;
}
function checkedJPEG(stream,length,variant){
 let bytes=0,prefix=new Uint8Array(),checked=false,last=[];const cap=variant==='thumb'?200*1024:2*1024*1024,maxEdge=variant==='thumb'?640:2400;
 return stream.pipeThrough(new TransformStream({
  transform(chunk,controller){bytes+=chunk.byteLength;if(bytes>cap||bytes>length)throw new Error('invalid_image_size');
   if(!checked){const next=new Uint8Array(Math.min(65536,prefix.length+chunk.length));next.set(prefix);next.set(chunk.subarray(0,next.length-prefix.length),prefix.length);prefix=next;const size=jpegSize(prefix);if(size){if(!size.width||!size.height||Math.max(size.width,size.height)>maxEdge||size.width*size.height>5760000)throw new Error('invalid_image_dimensions');checked=true}else if(prefix.length>=65536)throw new Error('invalid_jpeg_header')}
   last=chunk.length>=2?[chunk[chunk.length-2],chunk[chunk.length-1]]:[last.at(-1),chunk[0]];controller.enqueue(chunk);
  },
  flush(){if(!checked||bytes!==length||last[0]!==255||last[1]!==217)throw new Error('incomplete_jpeg')}
 }));
}
export async function mediaRoute(request,env,url,user,ctx){
 const path=url.pathname,method=request.method;
 if(path==='/api/uploads/start'&&method==='POST'){
  user=await mutation(env,request);if(!env.MEDIA)fail(503,'storage_unavailable');await rate(env,request,'upload-start',60,3600,user.id);
  const body=await readJson(request,4096),key=text(body.requestKey,100,true);if(!/^[a-zA-Z0-9_-]{12,100}$/.test(key))fail(422,'invalid_request_key');const old=await first(env,'SELECT * FROM media WHERE owner_id=? AND request_key=?',user.id,key);if(old)return json({item:mediaDTO(old),fullReady:old.full_ready===1,thumbReady:old.thumb_ready===1});
  const pending=await first(env,'SELECT COUNT(*) AS count FROM media WHERE owner_id=? AND listing_id IS NULL AND expires_at>?',user.id,seconds());if(pending.count>=30)fail(429,'too_many_pending_photos');
  const id=uuid(),root='uploads/'+user.id+'/'+id;await run(env,'INSERT INTO media(id,owner_id,request_key,full_key,thumb_key,created_at,expires_at) VALUES(?,?,?,?,?,?,?)',id,user.id,key,root+'/full.jpg',root+'/thumb.jpg',now(),seconds()+172800);
  return json({item:mediaDTO({id}),fullReady:false,thumbReady:false},201);
 }
 const upload=path.match(/^\/api\/uploads\/([a-f0-9-]{36})\/(full|thumb)$/);
 if(upload&&method==='PUT'){
  user=await mutation(env,request);if(!env.MEDIA)fail(503,'storage_unavailable');const [,id,variant]=upload,record=await first(env,'SELECT * FROM media WHERE id=? AND owner_id=?',id,user.id);
  if(!record||record.listing_id!==null||record.expires_at<seconds())fail(404,'upload_not_found');if(record[variant+'_ready']===1)return json({ok:true,replayed:true});
  if(request.headers.get('content-type')!=='image/jpeg')fail(415,'jpeg_required');const length=Number(request.headers.get('content-length'));if(!Number.isSafeInteger(length)||length<32||length>(variant==='thumb'?200*1024:2*1024*1024)||!request.body)fail(413,'invalid_image_size');
  const lock=await first(env,`UPDATE media SET ${variant}_ready=-1 WHERE id=? AND owner_id=? AND listing_id IS NULL AND ${variant}_ready=0 RETURNING id`,id,user.id);if(!lock)fail(409,'upload_in_progress');
  try{await env.MEDIA.put(record[variant+'_key'],checkedJPEG(request.body,length,variant),{httpMetadata:{contentType:'image/jpeg'},customMetadata:{ownerId:user.id,mediaId:id}})}catch{await run(env,`UPDATE media SET ${variant}_ready=0 WHERE id=? AND ${variant}_ready=-1`,id);fail(422,'invalid_image','JPEG зураг бүрэн, зөв эсэхийг шалгана уу.')}
  await run(env,`UPDATE media SET ${variant}_ready=1,${variant}_size=? WHERE id=? AND owner_id=?`,length,id,user.id);return json({ok:true},201);
 }
 const image=path.match(/^\/api\/media\/([a-f0-9-]{36})\/(full|thumb)$/);
 if(image&&method==='GET'){
  if(!env.MEDIA)fail(503,'storage_unavailable');const [,id,variant]=image,record=await first(env,'SELECT m.*,l.owner_id AS listing_owner FROM media m LEFT JOIN listings l ON l.id=m.listing_id WHERE m.id=?',id);
  if(!record||!record[variant+'_ready'])fail(404,'image_not_found');
  const publicRow=record.listing_id&&await first(env,'SELECT l.id FROM listings l LEFT JOIN organizations o ON o.id=l.organization_id WHERE l.id=? AND '+publicPredicate,record.listing_id);
  const own=user&&(record.owner_id===user.id||['admin','moderator'].includes(user.role));if(!publicRow&&!own)fail(404,'image_not_found');
  const cache=publicRow&&globalThis.caches?.default,cacheKey=new Request(new URL('/api/_media-cache/'+id+'/'+variant,url).href);const cached=cache&&await cache.match(cacheKey);
  if(cached){const headers=new Headers(cached.headers);headers.set('cache-control','private, max-age=60');if(request.headers.get('if-none-match')===headers.get('etag'))return new Response(null,{status:304,headers});return new Response(cached.body,{headers})}
  const object=await env.MEDIA.get(record[variant+'_key']);if(!object)fail(404,'image_not_found');
  const headers=new Headers({'content-type':'image/jpeg','x-content-type-options':'nosniff','cache-control':publicRow?'private, max-age=60':'no-store','etag':object.httpEtag,'content-disposition':'inline'});
  if(request.headers.get('if-none-match')===object.httpEtag)return new Response(null,{status:304,headers});headers.set('content-length',String(object.size));const response=new Response(object.body,{headers});if(cache){const copy=response.clone(),cacheHeaders=new Headers(copy.headers);cacheHeaders.set('cache-control','public, max-age=86400');ctx?.waitUntil(cache.put(cacheKey,new Response(copy.body,{headers:cacheHeaders})))}return response;
 }
 return null;
}
export async function maintenance(env){
 if(!env.DB)return;const expired=await all(env,'SELECT id,full_key,thumb_key FROM media WHERE listing_id IS NULL AND expires_at<? ORDER BY expires_at LIMIT 10',seconds());
 for(const item of expired){if(env.MEDIA)await env.MEDIA.delete([item.full_key,item.thumb_key]);await run(env,'DELETE FROM media WHERE id=? AND listing_id IS NULL',item.id)}
 await env.DB.batch([stmt(env,'DELETE FROM sessions WHERE token_hash IN (SELECT token_hash FROM sessions WHERE expires_at<? LIMIT 500)',seconds()),stmt(env,'DELETE FROM rate_limits WHERE rowid IN (SELECT rowid FROM rate_limits WHERE window<? LIMIT 500)',seconds()-86400)]);
}
