import {fail,json,now,seconds,uuid,sha,text,email,readJson,originGuard,rate,first,run,stmt,session,mutation,publicUser,passwordHash,verifyPassword,createSession,sessionCookie,randomToken,auditStatement,bumpPublic} from './core.mjs';

export async function authRoute(request,env,path,requestId){
 if(path==='/api/session'&&request.method==='GET'){const user=await session(env,request);return json({user:publicUser(user),csrf:user?.csrf_token||null})}
 if(path==='/api/auth/logout'&&request.method==='POST'){const user=await mutation(env,request);await run(env,'DELETE FROM sessions WHERE token_hash=?',user.token_hash);return json({ok:true},200,{'set-cookie':sessionCookie('',0)})}
 if(path==='/api/auth/profile'&&request.method==='PATCH'){const user=await mutation(env,request),body=await readJson(request,4096),name=text(body.name,60,true);await run(env,'UPDATE users SET display_name=?,updated_at=? WHERE id=?',name,now(),user.id);return json({user:{...publicUser(user),name}})}
 if(path==='/api/auth/password'&&request.method==='POST'){
  const user=await mutation(env,request);await rate(env,request,'password-change',5,3600,user.id);const body=await readJson(request,4096);
  if(!await verifyPassword(body.currentPassword,user.password_hash))fail(401,'invalid_login');const hash=await passwordHash(body.password);
  await env.DB.batch([stmt(env,'UPDATE users SET password_hash=?,updated_at=? WHERE id=?',hash,now(),user.id),stmt(env,'DELETE FROM sessions WHERE user_id=?',user.id),auditStatement(env,user.id,'password_changed','user',user.id,{},requestId)]);
  const created=await createSession(env,user.id);return json({user:publicUser(user),csrf:created.csrf},200,{'set-cookie':sessionCookie(created.token)});
 }
 if(path==='/api/auth/close'&&request.method==='POST'){
  const user=await mutation(env,request);if(user.role!=='user')fail(409,'protected_account');await env.DB.batch([stmt(env,"UPDATE users SET status='closed',updated_at=? WHERE id=? AND role='user'",now(),user.id),stmt(env,"UPDATE listings SET state='hidden',revision=revision+1,updated_at=? WHERE owner_id=?",now(),user.id),stmt(env,'DELETE FROM sessions WHERE user_id=?',user.id),bumpPublic(env)]);return json({ok:true},200,{'set-cookie':sessionCookie('',0)});
 }
 if(!['/api/auth/register','/api/auth/login','/api/auth/activate-admin'].includes(path)||request.method!=='POST')return null;
 originGuard(request);const body=await readJson(request,8192);
 if(path==='/api/auth/activate-admin'){
  await rate(env,request,'activate-admin',8,900);const token=text(body.token,100,true);if(!/^[a-zA-Z0-9_-]{43}$/.test(token))fail(400,'invalid_activation');
  const bootstrap=await first(env,'SELECT email FROM admin_bootstrap WHERE token_hash=? AND expires_at>? AND consumed_at IS NULL',sha(token),seconds());if(!bootstrap)fail(400,'invalid_activation','Идэвхжүүлэх холбоос хүчингүй эсвэл хугацаа дууссан.');
  const hash=await passwordHash(body.password),nonce=randomToken(),sessionToken=randomToken(),csrf=randomToken(),stamp=now();
  const result=await env.DB.batch([
   stmt(env,"UPDATE users SET password_hash=?,status='active',setup_nonce=?,updated_at=? WHERE email=? AND status='pending_setup' AND EXISTS(SELECT 1 FROM admin_bootstrap WHERE token_hash=? AND expires_at>? AND consumed_at IS NULL) RETURNING id",hash,nonce,stamp,bootstrap.email,sha(token),seconds()),
   stmt(env,'UPDATE admin_bootstrap SET consumed_at=? WHERE token_hash=? AND EXISTS(SELECT 1 FROM users WHERE setup_nonce=?)',seconds(),sha(token),nonce),
   stmt(env,'INSERT INTO sessions(token_hash,user_id,csrf_token,created_at,expires_at) SELECT ?,id,?,?,? FROM users WHERE setup_nonce=?',sha(sessionToken),csrf,stamp,seconds()+604800,nonce)
  ]);
  if(!result[0].results?.length)fail(409,'activation_already_used');const user=await first(env,'SELECT * FROM users WHERE setup_nonce=?',nonce);await auditStatement(env,user.id,'admin_activated','user',user.id,{},requestId).run();
  return json({user:publicUser(user),csrf},200,{'set-cookie':sessionCookie(sessionToken)});
 }
 const address=email(body.email);await rate(env,request,path.endsWith('login')?'login':'register',path.endsWith('login')?12:5,900);await rate(env,request,'account:'+path,8,900,address);
 if(path.endsWith('register')){
  const name=text(body.name,60,true);if(await first(env,'SELECT id FROM users WHERE email=?',address))fail(409,'account_unavailable','Энэ мэдээллээр бүртгэх боломжгүй. Нэвтрэхийг оролдоно уу.');
  const hash=await passwordHash(body.password),id=uuid(),stamp=now();
  try{await env.DB.batch([stmt(env,'INSERT INTO users(id,email,display_name,password_hash,created_at,updated_at) VALUES(?,?,?,?,?,?)',id,address,name,hash,stamp,stamp),auditStatement(env,id,'account_created','user',id,{},requestId)])}catch(e){if(String(e).includes('UNIQUE'))fail(409,'account_unavailable');throw e}
  const user=await first(env,'SELECT * FROM users WHERE id=?',id),created=await createSession(env,id);return json({user:publicUser(user),csrf:created.csrf},201,{'set-cookie':sessionCookie(created.token)});
 }
 const user=await first(env,'SELECT * FROM users WHERE email=?',address);const correct=await verifyPassword(body.password,user?.password_hash);
 if(!user||!correct||user.status!=='active')fail(401,'invalid_login','Имэйл эсвэл нууц үгээ шалгана уу.');
 const created=await createSession(env,user.id);return json({user:publicUser(user),csrf:created.csrf},200,{'set-cookie':sessionCookie(created.token)});
}
