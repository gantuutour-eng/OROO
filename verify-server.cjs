/* Real SQLite constraints/FTS and streamed object storage, no production data. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {DatabaseSync}=require('node:sqlite');
const {randomUUID}=require('node:crypto');
function database(){
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync('migrations/0001_core.sql','utf8'));
 const wrap=(sql,args=[])=>({bind(...values){return wrap(sql,values)},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args),success:true}},async run(){const q=db.prepare(sql);if(q.columns().length)return {results:q.all(...args),success:true};return {results:[],meta:q.run(...args),success:true}},sql,args});
 return {db,prepare:wrap,async batch(statements){db.exec('BEGIN');try{const out=[];for(const q of statements)out.push(await q.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}}};
}
async function main(){
 globalThis.FixedLengthStream=class extends TransformStream{constructor(expected){let size=0;super({transform(chunk,controller){size+=chunk.length;if(size>expected)throw Error('length_mismatch');controller.enqueue(chunk)},flush(){if(size!==expected)throw Error('length_mismatch')}})}};
 const {default:worker}=await import('./server/worker.mjs'),core=await import('./server/core.mjs');const DB=database(),objects=new Map();
 const env={DB,MEDIA:{async put(key,body){const bytes=Buffer.from(await new Response(body).arrayBuffer());objects.set(key,bytes)},async get(key){const data=objects.get(key);return data?{body:data,size:data.length,httpEtag:'"'+core.sha(data)+'"'}:null},async delete(keys){for(const key of [].concat(keys))objects.delete(key)}},ASSETS:{fetch:()=>new Response('asset')}};
 let count=0;async function call(path,{actor=null,method='GET',body,origin='https://oroo.test',csrf=true,headers={}}={}){
  const opts={method,headers:{...headers}};if(method!=='GET'){opts.headers.origin=origin;if(!(body instanceof Uint8Array)){opts.headers['content-type']='application/json';opts.body=JSON.stringify(body||{})}else{opts.headers['content-type']='image/jpeg';opts.headers['content-length']=String(body.length);opts.body=body}}
  if(actor){opts.headers.cookie=actor.cookie;if(csrf)opts.headers['x-csrf-token']=actor.csrf}
  const res=await worker.fetch(new Request('https://oroo.test'+path,opts),env,{waitUntil(){}});let data;try{data=await res.clone().json()}catch{data=null}count++;return {res,data};
 }
 async function signup(name){const r=await call('/api/auth/register',{method:'POST',body:{name,email:name+'@example.invalid',password:'A synthetic password '+name+' 2026!',role:'admin'}});assert.equal(r.res.status,201,JSON.stringify(r.data));assert.equal(r.data.user.role,'user');return {...r.data,cookie:r.res.headers.get('set-cookie').split(';')[0]}}
 const a=await signup('alpha'),b=await signup('beta');
 assert.equal((await call('/api/admin/summary')).res.status,401);assert.equal((await call('/api/admin/summary',{actor:a})).res.status,403);
 assert.equal((await call('/api/auth/profile',{actor:a,method:'PATCH',body:{name:'forged'},csrf:false})).res.status,403);
 assert.equal((await call('/api/auth/profile',{actor:a,method:'PATCH',body:{name:'forged'},origin:'https://evil.test'})).res.status,403);
 assert.equal((await call('/api/auth/login',{method:'POST',body:{email:'alpha@example.invalid',password:'wrong'}})).res.status,401);
 assert.equal((await call('/api/auth/register',{method:'POST',body:{email:'weak@example.invalid',name:'weak',password:'1234'}})).res.status,422);
 const admins=[];for(const name of ['reviewer1','reviewer2']){const actor=await signup(name);DB.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(actor.user.id);admins.push(actor)}
 const jpeg=Uint8Array.from([255,216,255,192,0,17,8,0,10,0,10,3,1,17,0,2,17,0,3,17,0,255,218,0,8,1,1,0,0,63,0,0,0,255,217]);
 async function photo(actor,key=randomUUID()){
  const start=await call('/api/uploads/start',{actor,method:'POST',body:{requestKey:key}});assert.ok(start.res.ok,JSON.stringify(start.data));const id=start.data.item.id;
  for(const variant of ['full','thumb'])assert.equal((await call('/api/uploads/'+id+'/'+variant,{actor,method:'PUT',body:jpeg})).res.status,201);
  return id;
 }
 const p=await photo(a);assert.equal((await call('/api/media/'+p+'/full')).res.status,404);assert.equal((await call('/api/media/'+p+'/full',{actor:b})).res.status,404);assert.equal((await call('/api/media/'+p+'/full',{actor:a})).res.status,200);
 const invalid=await call('/api/uploads/start',{actor:a,method:'POST',body:{requestKey:randomUUID()}});assert.equal((await call('/api/uploads/'+invalid.data.item.id+'/full',{actor:a,method:'PUT',body:new Uint8Array(40)})).res.status,422);
 const listing={type:0,province:'Улаанбаатар',area:'Сүхбаатар',khoroo:'1-р хороо',address:'Test street',name:'Synthetic apartment',latitude:47.92,longitude:106.92,size:40,totalSize:45,floor:2,totalFloors:10,rooms:2,bathrooms:1,year:2020,deal:'rent',rentPeriod:'month',price:1500000,deposit:1500000,feeMode:'none',moveIn:'immediate',parkingStatus:'none',petPolicy:'no',furnishing:'none',smoking:'no',contactRole:'owner',contactName:'Synthetic owner',contactPhone:'+976 99999999',unit:'Private unit 123',desc:'Good apartment',description:'A synthetic listing for isolation tests',photoIds:[p],requestKey:randomUUID(),role:'admin',moderationStatus:'approved'};
 assert.equal((await call('/api/listings',{actor:b,method:'POST',body:listing})).res.status,403);
 let r=await call('/api/listings',{actor:a,method:'POST',body:listing});assert.equal(r.res.status,201,JSON.stringify(r.data));const id=r.data.item.id;assert.equal(r.data.item.moderationStatus,'pending');
 assert.equal((await call('/api/listings')).data.items.length,0);assert.equal((await call('/api/listings/'+id)).res.status,404);
 assert.equal((await call('/api/listings',{actor:a,method:'POST',body:listing})).data.item.id,id);assert.equal((await call('/api/listings',{actor:a,method:'POST',body:{...listing,price:2}})).res.status,409);
 assert.equal((await call('/api/listings/'+id,{actor:b,method:'PUT',body:{...listing,revision:1}})).res.status,404);
 assert.equal((await call('/api/listings/'+id,{actor:a,method:'PUT',body:{...listing,revision:99}})).res.status,409);
 assert.equal((await call('/api/admin/listings/'+id+'/review',{actor:admins[0],method:'POST',body:{status:'approved',revision:1,reason:'Synthetic review'}})).res.status,200);
 const publicItem=(await call('/api/listings/'+id)).data.item;assert.equal(publicItem.unit,undefined);assert.equal(publicItem.contactPhone,undefined);assert.equal(publicItem.ownerId,undefined);assert.equal((await call('/api/media/'+p+'/full')).res.status,200);
 assert.equal((await call('/api/listings?q=Synthetic&sort=price')).data.items.length,1);
 assert.equal((await call('/api/listings?bounds=107,48,108,49')).data.items.length,0);assert.equal((await call('/api/listings?bounds=1,1,2,2')).res.status,400);
 assert.equal((await call('/api/map/clusters?bounds=106,47,108,49&zoom=10')).data.items[0].count,1);
 r=await call('/api/records/inquiries',{actor:b,method:'POST',body:{title:'Question',message:'Synthetic',propertyId:id}});assert.equal(r.res.status,201);assert.equal((await call('/api/records/inquiries',{actor:a})).data.items.length,1);
 assert.equal((await call('/api/favorites',{actor:b,method:'POST',body:{id}})).res.status,200);assert.deepEqual((await call('/api/favorites',{actor:b})).data.ids,[id]);assert.deepEqual((await call('/api/favorites',{actor:a})).data.ids,[]);
 DB.db.prepare("UPDATE users SET status='blocked' WHERE id=?").run(a.user.id);assert.equal((await call('/api/listings')).data.items.length,0);assert.equal((await call('/api/media/'+p+'/full')).res.status,404);assert.equal((await call('/api/session',{actor:a})).data.user,null);DB.db.prepare("UPDATE users SET status='active' WHERE id=?").run(a.user.id);
 r=await call('/api/listings/'+id,{actor:a,method:'PUT',body:{...listing,revision:2}});assert.equal(r.res.status,200,JSON.stringify(r.data));assert.equal(r.data.item.moderationStatus,'pending');assert.equal((await call('/api/listings')).data.items.length,0);
 const rollbackPhoto=await photo(a),rollbackKey=randomUUID();DB.db.exec("CREATE TRIGGER test_abort_audit BEFORE INSERT ON audit WHEN new.action='listing_created' BEGIN SELECT RAISE(ABORT,'synthetic_failure'); END;");
 assert.equal((await call('/api/listings',{actor:a,method:'POST',body:{...listing,requestKey:rollbackKey,photoIds:[rollbackPhoto]}})).res.status,500);assert.equal(DB.db.prepare('SELECT COUNT(*) AS count FROM listings WHERE request_key=?').get(rollbackKey).count,0);assert.equal(DB.db.prepare('SELECT listing_id FROM media WHERE id=?').get(rollbackPhoto).listing_id,null);DB.db.exec('DROP TRIGGER test_abort_audit');
 const second=await call('/api/listings',{actor:a,method:'POST',body:{...listing,requestKey:rollbackKey,photoIds:[rollbackPhoto]}});assert.equal(second.res.status,201);assert.equal((await call('/api/admin/listings/'+second.data.item.id+'/review',{actor:admins[0],method:'POST',body:{status:'approved',revision:1,reason:'Synthetic second review'}})).res.status,200);
 assert.equal((await call('/api/admin/listings/'+id+'/review',{actor:admins[0],method:'POST',body:{status:'approved',revision:3,reason:'Synthetic updated review'}})).res.status,200);
 const page1=(await call('/api/listings?limit=1&sort=price')).data,page2=(await call('/api/listings?limit=1&sort=price&cursor='+encodeURIComponent(page1.cursor))).data;assert.ok(page1.cursor);assert.notEqual(page1.items[0].id,page2.items[0].id);assert.equal(page2.cursor,null);
 assert.equal((await call('/api/listings?locations='+encodeURIComponent(JSON.stringify(['Улаанбаатар/Баянзүрх'])))).data.items.length,0);assert.equal((await call('/api/listings?minDeposit=2000000')).data.items.length,0);
 const staffBody={role:'moderator',reason:'Synthetic review staff',password:'A synthetic password reviewer1 2026!'};
 assert.equal((await call('/api/admin/users/'+b.user.id+'/role',{actor:a,method:'POST',body:staffBody})).res.status,403);assert.equal((await call('/api/admin/users/'+b.user.id+'/role',{actor:admins[0],method:'POST',body:{...staffBody,password:'wrong'}})).res.status,401);
 assert.equal((await call('/api/admin/users/'+b.user.id+'/role',{actor:admins[0],method:'POST',body:staffBody})).res.status,200);assert.equal((await call('/api/session',{actor:b})).data.user,null);DB.db.prepare("UPDATE users SET role='user' WHERE id=?").run(b.user.id);const bs=await core.createSession(env,b.user.id);b.cookie=core.sessionCookie(bs.token).split(';')[0];b.csrf=bs.csrf;
 assert.throws(()=>DB.db.prepare('DELETE FROM audit').run(),/append.only/);
 const org={name:'Synthetic agency',agent:'Synthetic person',phone:'+976 99999999',address:'Synthetic office',registration:'TEST-REG',licenseNumber:'TEST-LIC',licenseValidUntil:'2027-12-31',refs:{registry:'TEST registry evidence',license:'TEST license evidence',authority:'TEST authority evidence',office:'TEST office evidence'}};
 r=await call('/api/organization',{actor:b,method:'PUT',body:org});assert.equal(r.res.status,200,JSON.stringify(r.data));const oid=r.data.item.id;
 const checks=Object.fromEntries(['registry','license','authority','identity','office','contact'].map(k=>[k,true])),refs=Object.fromEntries(Object.keys(checks).map(k=>[k,'Synthetic '+k+' evidence']));
 assert.equal((await call('/api/admin/organizations/'+oid+'/review',{actor:admins[0],method:'POST',body:{step:'first',revision:1,reason:'Synthetic checks',checks,refs}})).res.status,200);
 const final={step:'final',revision:2,reason:'Synthetic independent review',independent:true,validUntil:new Date(Date.now()+86400000).toISOString().slice(0,10)};
 assert.equal((await call('/api/admin/organizations/'+oid+'/review',{actor:admins[0],method:'POST',body:final})).res.status,403);
 assert.equal((await call('/api/admin/organizations/'+oid+'/review',{actor:admins[1],method:'POST',body:final})).res.status,200);assert.equal((await call('/api/offices/'+oid)).data.office.verified,true);
 const token=core.randomToken(),uid=randomUUID();DB.db.prepare("INSERT INTO users(id,email,display_name,role,status,created_at,updated_at) VALUES(?,?,'Reserved','admin','pending_setup',?,?)").run(uid,'reserved@example.invalid',core.now(),core.now());DB.db.prepare('INSERT INTO admin_bootstrap(token_hash,email,expires_at) VALUES(?,?,?)').run(core.sha(token),'reserved@example.invalid',core.seconds()+600);
 DB.db.exec('DELETE FROM rate_limits');assert.equal((await call('/api/auth/register',{method:'POST',body:{name:'Intruder',email:'reserved@example.invalid',password:'Intruder synthetic password 2026'}})).res.status,409);
 r=await call('/api/auth/activate-admin',{method:'POST',body:{token,password:'Synthetic reserved password 2026'}});assert.equal(r.res.status,200,JSON.stringify(r.data));assert.equal(r.data.user.role,'admin');assert.equal((await call('/api/auth/activate-admin',{method:'POST',body:{token,password:'Synthetic reserved password 2026'}})).res.status,400);
 assert.equal((await call('/api/auth/logout',{actor:a,method:'POST'})).res.status,200);assert.equal((await call('/api/me/listings',{actor:a})).res.status,401);
 const closing=await core.createSession(env,a.user.id);a.cookie=core.sessionCookie(closing.token).split(';')[0];a.csrf=closing.csrf;await call('/api/listings/'+id,{actor:a,method:'DELETE'});assert.equal((await call('/api/auth/close',{actor:a,method:'POST'})).res.status,200);assert.equal(DB.db.prepare('SELECT state FROM listings WHERE id=?').get(id).state,'deleted');assert.equal((await call('/api/listings')).data.items.length,0);
 const plan=DB.db.prepare("EXPLAIN QUERY PLAN SELECT * FROM listings WHERE moderation='approved' AND state='published' ORDER BY created_at DESC,id DESC LIMIT 31").all();assert.ok(plan.some(r=>/INDEX/.test(r.detail)));
 console.log('Server: '+count+' requests passed; real SQLite/FTS, account isolation, CSRF, streaming media, idempotency, review gates and one-use activation.');DB.db.close();
}
main().catch(e=>{console.error(e);process.exitCode=1});
