import {randomBytes,createHash,scrypt,timingSafeEqual} from 'node:crypto';

export class HttpError extends Error {constructor(status,code,message=code){super(message);this.status=status;this.code=code}}
export const fail=(status,code,message)=>{throw new HttpError(status,code,message)};
export const now=()=>new Date().toISOString();
export const seconds=()=>Math.floor(Date.now()/1000);
export const uuid=()=>crypto.randomUUID();
export const randomToken=()=>randomBytes(32).toString('base64url');
export const sha=value=>createHash('sha256').update(value).digest('hex');
export function json(value,status=200,headers={}){return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff',...headers}})}
export function stmt(env,sql,...args){return env.DB.prepare(sql).bind(...args)}
export const first=(env,sql,...args)=>stmt(env,sql,...args).first();
export async function all(env,sql,...args){return (await stmt(env,sql,...args).all()).results||[]}
export const run=(env,sql,...args)=>stmt(env,sql,...args).run();
export function requireDB(env){if(!env.DB)fail(503,'database_unavailable','Өгөгдлийн сан түр боломжгүй байна.')}
export function originGuard(request){const origin=request.headers.get('origin');if(origin!==new URL(request.url).origin)fail(403,'invalid_origin');if(request.headers.get('sec-fetch-site')==='cross-site')fail(403,'invalid_origin')}
export async function readJson(request,max=96*1024){
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))fail(415,'json_required');
 const length=Number(request.headers.get('content-length')||0);if(length>max)fail(413,'payload_too_large');
 const reader=request.body?.getReader();if(!reader)fail(400,'body_required');const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();fail(413,'payload_too_large')}chunks.push(value)}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 try{const result=JSON.parse(new TextDecoder().decode(bytes));if(!result||Array.isArray(result)||typeof result!=='object')fail(400,'invalid_json');return result}catch(e){if(e instanceof HttpError)throw e;fail(400,'invalid_json')}
}
export function text(value,max=500,required=false){if(typeof value!=='string'){if(required)fail(422,'required_text');return ''}const out=value.normalize('NFC').trim();if(out.length>max||required&&!out.length)fail(422,'invalid_text');return out}
export function email(value){const v=text(value,254,true).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))fail(422,'invalid_email');return v}
export function number(value,min,max,required=false,integer=false){if(value===''||value===null||value===undefined){if(required)fail(422,'required_number');return null}const n=Number(value);if(!Number.isFinite(n)||n<min||n>max||integer&&!Number.isInteger(n))fail(422,'invalid_number');return n}
export function enumValue(value,values,fallback){if(value===undefined&&fallback!==undefined)return fallback;if(!values.includes(value))fail(422,'invalid_choice');return value}
export function httpsLink(value){if(!value)return '';let url;try{url=new URL(value)}catch{fail(422,'invalid_link')}if(url.protocol!=='https:'||url.username||url.password||value.length>500)fail(422,'invalid_link');return url.toString()}
export function pageLimit(url,max=60){return number(url.searchParams.get('limit')||30,1,max,true,true)}
export function encodeCursor(value){return Buffer.from(JSON.stringify(value)).toString('base64url')}
export function decodeCursor(value){if(!value)return null;if(value.length>300)fail(400,'invalid_cursor');try{const c=JSON.parse(Buffer.from(value,'base64url').toString());if(!Array.isArray(c)||c.length!==2||!['number','string'].includes(typeof c[0])||typeof c[1]!=='number'&&!/^[a-z0-9-]{1,60}$/i.test(c[1]))fail(400,'invalid_cursor');return c}catch{fail(400,'invalid_cursor')}}
export async function rate(env,request,action,limit=10,period=900,subject=''){
 const key=sha(action+':'+(request.headers.get('cf-connecting-ip')||'unknown')+':'+subject),window=Math.floor(seconds()/period)*period;
 const row=await first(env,'INSERT INTO rate_limits(key,window,counter) VALUES(?,?,1) ON CONFLICT(key,window) DO UPDATE SET counter=counter+1 WHERE counter<? RETURNING counter',key,window,limit);
 if(!row)fail(429,'rate_limited','Хэт олон хүсэлт. Түр хүлээгээд дахин оролдоно уу.');
}
const SCRYPT={N:32768,r:8,p:3,maxmem:64*1024*1024};
let activeHash=false;const hashQueue=[];
async function derive(password,salt){
 if(activeHash){if(hashQueue.length>=3)fail(503,'auth_busy','Нэвтрэх хүсэлт их байна. Түр хүлээгээд дахин оролдоно уу.');await new Promise(resolve=>hashQueue.push(resolve))}else activeHash=true;
 try{return await new Promise((resolve,reject)=>scrypt(password,salt,32,SCRYPT,(error,key)=>error?reject(error):resolve(key)))}finally{const next=hashQueue.shift();if(next)next();else activeHash=false}
}
export function validatePassword(value){if(typeof value!=='string'||value.length<15||value.length>128)fail(422,'password_length','Нууц үг 15–128 тэмдэгттэй байна.')}
export async function passwordHash(password){validatePassword(password);const salt=randomBytes(16);const key=await derive(password,salt);return 'scrypt$32768$8$3$'+salt.toString('base64url')+'$'+key.toString('base64url')}
export async function verifyPassword(password,stored){
 if(typeof password!=='string'||password.length>128)return false;
 const parts=String(stored||'').split('$');const valid=parts.length===6&&parts[0]==='scrypt'&&parts[1]==='32768'&&parts[2]==='8'&&parts[3]==='3';
 const salt=valid?Buffer.from(parts[4],'base64url'):Buffer.alloc(16,1),expected=valid?Buffer.from(parts[5],'base64url'):Buffer.alloc(32,1);
 if(salt.length!==16||expected.length!==32)return false;const actual=await derive(password,salt);return timingSafeEqual(actual,expected)&&valid;
}
const COOKIE='__Host-oroo_session';
export function sessionCookie(token,age=604800){return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`}
export async function session(env,request,required=false){
 const token=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 const row=token&&/^[a-zA-Z0-9_-]{43}$/.test(token)?await first(env,'SELECT u.*,s.token_hash,s.csrf_token FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.status=\'active\'',sha(token),seconds()):null;
 if(!row&&required)fail(401,'login_required','Эхлээд нэвтэрнэ үү.');return row||null;
}
export function publicUser(user){return user?{id:user.id,email:user.email,name:user.display_name,role:user.role,emailVerified:!!user.email_verified}:null}
export function requireRole(user,...roles){if(!user||!roles.includes(user.role))fail(403,'permission_denied','Энэ үйлдлийг хийх эрхгүй байна.')}
export async function mutation(env,request){originGuard(request);const user=await session(env,request,true);if(request.headers.get('x-csrf-token')!==user.csrf_token)fail(403,'invalid_csrf');return user}
export async function createSession(env,userId){const token=randomToken(),csrf=randomToken();await run(env,'INSERT INTO sessions(token_hash,user_id,csrf_token,created_at,expires_at) VALUES(?,?,?,?,?)',sha(token),userId,csrf,now(),seconds()+604800);return {token,csrf}}
export function auditStatement(env,actor,action,type,id,detail,requestId){return stmt(env,'INSERT INTO audit(actor_id,action,target_type,target_id,detail,request_id,created_at) VALUES(?,?,?,?,?,?,?)',actor||null,action,type,String(id),JSON.stringify(detail||{}),requestId,now())}
export async function audit(env,...args){return auditStatement(env,...args).run()}
export const bumpPublic=env=>stmt(env,"UPDATE app_meta SET value=CAST(CAST(value AS INTEGER)+1 AS TEXT) WHERE key='public_version'");
export const publicPredicate="l.moderation='approved' AND l.state='published' AND EXISTS(SELECT 1 FROM users pu WHERE pu.id=l.owner_id AND pu.status='active') AND (l.organization_id IS NULL OR (o.status='approved' AND o.verified_until>=date('now')))";
export async function ownOrg(env,user){return first(env,'SELECT * FROM organizations WHERE owner_id=?',user.id)}
export function mediaDTO(row){return {id:row.id,fullUrl:'/api/media/'+row.id+'/full',thumbUrl:'/api/media/'+row.id+'/thumb'}}
export async function listingDTOs(env,rows,privateView=false){
 if(!rows.length)return [];const ids=rows.map(r=>r.id);const media=await all(env,`SELECT id,listing_id,position FROM media WHERE listing_id IN (${ids.map(()=>'?').join(',')}) AND full_ready=1 AND thumb_ready=1 ORDER BY position,id`,...ids);
 return rows.map(row=>{const d=JSON.parse(row.data);if(!privateView){if(!d.showUnit)delete d.unit;if(!d.showContactPhone)delete d.contactPhone;delete d.contactHours}
 const pictures=media.filter(m=>m.listing_id===row.id).map(mediaDTO);return {...d,id:row.id,cloud:true,local:true,ownerId:privateView?row.owner_id:undefined,brokerId:row.organization_id||undefined,brokerVerified:row.organization_status==='approved'&&row.verified_until>=now().slice(0,10),moderationStatus:row.moderation,listingStatus:row.state,reviewReason:privateView?row.review_reason:undefined,revision:row.revision,currency:'MNT',createdAt:row.created_at,updatedAt:row.updated_at,media:pictures,photos:pictures.map(m=>m.fullUrl),photoIds:pictures.map(m=>m.id)}});
}
