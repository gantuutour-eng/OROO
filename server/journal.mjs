import {fail,json,now,seconds,uuid,sha,text,enumValue,number,httpsLink,readJson,first,all,stmt,mutation,requireRole,rate,pageLimit,encodeCursor,decodeCursor,mediaDTO,bumpPublic} from './core.mjs';
export const JOURNAL_CATEGORIES=['Зөвлөгөө','Орон сууц','Түрээс','Зах зээл','Мэдээ','Амьдрал'];
const validId=value=>typeof value==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value);
export function journalInput(body){
 const title=text(body.title,160),excerpt=text(body.excerpt,400),category=enumValue(body.category,JOURNAL_CATEGORIES,'Зөвлөгөө'),author=text(body.author||'Өрөө редакц',80,true),status=enumValue(body.status,['draft','published','archived'],'draft');
 const coverId=body.coverId||null;if(coverId&&!validId(coverId))fail(422,'invalid_cover');
 if(!Array.isArray(body.blocks)||body.blocks.length>60)fail(422,'invalid_article_blocks');
 const blocks=body.blocks.map(block=>{if(!block||typeof block!=='object')fail(422,'invalid_article_blocks');const type=enumValue(block.type,['p','h2','quote','image']);if(type==='image'){if(!validId(block.mediaId))fail(422,'invalid_image');return {type,mediaId:block.mediaId,alt:text(block.alt,160),caption:text(block.caption,300)}}return {type,text:text(block.text,type==='h2'?160:type==='quote'?1500:3000)}});
 if(blocks.reduce((n,b)=>n+(b.text||'').length,0)>30000)fail(422,'article_too_long');
 if(status==='published'&&(!title||!excerpt||!coverId||!blocks.some(b=>b.type==='p'&&b.text)))fail(422,'article_incomplete','Нийтлэхийн өмнө гарчиг, товч тайлбар, нүүр зураг болон үндсэн текстээ оруулна уу.');
 const data={blocks,coverAlt:text(body.coverAlt,160),coverCaption:text(body.coverCaption,300),sourceName:text(body.sourceName,120),sourceUrl:httpsLink(body.sourceUrl)};
 const mediaIds=[...new Set([coverId,...blocks.filter(b=>b.type==='image').map(b=>b.mediaId)].filter(Boolean))];if(mediaIds.length>12)fail(422,'too_many_article_images');
 return {title,excerpt,category,author,status,coverId,featured:body.featured!==false,data,mediaIds};
}
export function journalDTO(row,detail=false,admin=false){
 const item={id:row.id,title:row.title,excerpt:row.excerpt,category:row.category,author:row.author,coverId:row.cover_id,cover:row.cover_id?mediaDTO({id:row.cover_id}):null,publishedAt:row.published_at,updatedAt:row.updated_at,featured:!!row.featured};
 if(detail){const data=JSON.parse(row.data);Object.assign(item,data,{blocks:data.blocks.map(b=>b.type==='image'?{...b,image:mediaDTO({id:b.mediaId})}:b)});item.readingMinutes=Math.max(1,Math.ceil(data.blocks.map(b=>b.text||'').join(' ').split(/\s+/).filter(Boolean).length/200))}
 if(admin)Object.assign(item,{status:row.status,revision:row.revision,createdAt:row.created_at});return item;
}
async function page(env,url,admin=false){
 const q=url.searchParams,where=[],args=[],limit=pageLimit(url,30),column=admin?'updated_at':'published_at';
 if(!admin)where.push("status='published' AND published_at IS NOT NULL AND published_at<=?");if(!admin)args.push(now());
 if(admin&&q.get('status')){where.push('status=?');args.push(enumValue(q.get('status'),['draft','published','archived']))}
 if(!admin&&q.get('home')==='1')where.push('featured=1');
 if(q.get('q')){where.push("(title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\')");const term='%'+text(q.get('q'),100,true).replace(/[\\%_]/g,'\\$&')+'%';args.push(term,term)}
 if(q.get('category')){where.push('category=?');args.push(enumValue(q.get('category'),JOURNAL_CATEGORIES))}
 const cursor=decodeCursor(q.get('cursor'));if(cursor){where.push(`(${column}<? OR (${column}=? AND id<?))`);args.push(cursor[0],cursor[0],cursor[1])}
 const rows=await all(env,`SELECT id,title,excerpt,category,author,cover_id,status,revision,featured,created_at,updated_at,published_at FROM journal WHERE ${where.join(' AND ')||'1=1'} ORDER BY ${column} DESC,id DESC LIMIT ?`,...args,limit+1),items=rows.slice(0,limit),last=items.at(-1);
 return {items:items.map(r=>journalDTO(r,false,admin)),cursor:rows.length>limit?encodeCursor([last[column],last.id]):null};
}
export async function journalRoute(request,env,url,user,requestId){
 const path=url.pathname,method=request.method,publicItem=path.match(/^\/api\/journal\/([a-f0-9-]{36})$/),adminItem=path.match(/^\/api\/admin\/journal\/([a-f0-9-]{36})(?:\/(archive))?$/);
 if(path==='/api/journal'&&method==='GET')return json(await page(env,url));
 if(publicItem&&method==='GET'){const row=await first(env,"SELECT * FROM journal WHERE id=? AND status='published' AND published_at<=?",publicItem[1],now());if(!row)fail(404,'article_not_found','Нийтлэл олдсонгүй.');return json({item:journalDTO(row,true)})}
 if(!(path==='/api/admin/journal'||adminItem))return null;
 if(!user)fail(401,'login_required');requireRole(user,'admin');
 if(method==='GET'){if(adminItem){const row=await first(env,'SELECT * FROM journal WHERE id=?',adminItem[1]);if(!row)fail(404,'article_not_found');return json({item:journalDTO(row,true,true)})}return json(await page(env,url,true))}
 user=await mutation(env,request);requireRole(user,'admin');await rate(env,request,'journal-write',60,3600,user.id);const body=await readJson(request,96*1024),id=adminItem?.[1],old=id?await first(env,'SELECT * FROM journal WHERE id=?',id):null;
 if(id&&!old)fail(404,'article_not_found');if(old&&body.revision!==old.revision)fail(409,'revision_conflict','Нийтлэл өөрчлөгдсөн. Хадгалсан хувилбарыг дахин нээнэ үү.');
 if(adminItem?.[2]==='archive'&&method==='POST'){
  const mutationId=uuid(),stamp=now(),result=await env.DB.batch([stmt(env,"UPDATE journal SET status='archived',revision=revision+1,mutation_id=?,updated_by=?,updated_at=? WHERE id=? AND revision=? RETURNING id",mutationId,user.id,stamp,id,old.revision),bumpPublic(env),stmt(env,"INSERT INTO audit(actor_id,action,target_type,target_id,detail,request_id,created_at) SELECT ?,'journal_archived','journal',id,?,?,? FROM journal WHERE id=? AND mutation_id=?",user.id,JSON.stringify({from:old.status,to:'archived'}),requestId,stamp,id,mutationId)]);if(!result[0].results?.length)fail(409,'revision_conflict');return json({item:journalDTO(await first(env,'SELECT * FROM journal WHERE id=?',id),true,true)});
 }
 if(!(path==='/api/admin/journal'&&method==='POST'||adminItem&&!adminItem[2]&&method==='PUT'))fail(405,'method_not_allowed');
 const d=journalInput(body),requestHash=sha(JSON.stringify(d));let requestKey=old?.request_key;
 if(!old){requestKey=text(body.requestKey,100,true);if(!/^[a-zA-Z0-9_-]{12,100}$/.test(requestKey))fail(422,'invalid_request_key');const existing=await first(env,'SELECT * FROM journal WHERE request_key=?',requestKey);if(existing){if(existing.request_hash!==requestHash)fail(409,'idempotency_conflict');return json({item:journalDTO(existing,true,true),replayed:true})}}
 if(d.mediaIds.length){const media=await all(env,`SELECT m.* FROM media m WHERE m.id IN (${d.mediaIds.map(()=>'?').join(',')}) AND m.full_ready=1 AND m.thumb_ready=1 AND m.listing_id IS NULL AND ((m.owner_id=? AND m.expires_at>?) OR EXISTS(SELECT 1 FROM journal_media jm WHERE jm.media_id=m.id AND jm.journal_id=?)) AND NOT EXISTS(SELECT 1 FROM journal_media jm WHERE jm.media_id=m.id AND jm.journal_id<>?)`,...d.mediaIds,user.id,seconds(),id||'',id||'');if(media.length!==d.mediaIds.length)fail(403,'invalid_photo_ownership','Өөрийн байршуулсан, өөр зар / нийтлэлд ашиглаагүй зураг сонгоно уу.')}
 const articleId=id||uuid(),mutationId=uuid(),stamp=now(),publishedAt=d.status==='published'?(old?.published_at||stamp):(old?.published_at||null),data=JSON.stringify(d.data);
 const save=old?stmt(env,'UPDATE journal SET title=?,excerpt=?,category=?,author=?,cover_id=?,data=?,status=?,featured=?,revision=revision+1,mutation_id=?,updated_by=?,updated_at=?,published_at=? WHERE id=? AND revision=? RETURNING id',d.title,d.excerpt,d.category,d.author,d.coverId,data,d.status,Number(d.featured),mutationId,user.id,stamp,publishedAt,articleId,old.revision):stmt(env,'INSERT INTO journal(id,request_key,request_hash,mutation_id,title,excerpt,category,author,cover_id,data,status,featured,created_by,updated_by,created_at,updated_at,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id',articleId,requestKey,requestHash,mutationId,d.title,d.excerpt,d.category,d.author,d.coverId,data,d.status,Number(d.featured),user.id,user.id,stamp,stamp,publishedAt);
 const guard='EXISTS(SELECT 1 FROM journal WHERE id=? AND mutation_id=?)';let result;
 try{result=await env.DB.batch([save,
  stmt(env,`UPDATE media SET expires_at=? WHERE id IN(SELECT media_id FROM journal_media WHERE journal_id=?) AND ${guard}`,seconds()+172800,articleId,articleId,mutationId),
  stmt(env,`DELETE FROM journal_media WHERE journal_id=? AND ${guard}`,articleId,articleId,mutationId),
  ...d.mediaIds.flatMap((mediaId,index)=>[stmt(env,`INSERT INTO journal_media(journal_id,media_id,position) SELECT ?,?,? WHERE ${guard}`,articleId,mediaId,index,articleId,mutationId),stmt(env,`UPDATE media SET expires_at=0 WHERE id=? AND ${guard}`,mediaId,articleId,mutationId)]),
  bumpPublic(env),stmt(env,`INSERT INTO audit(actor_id,action,target_type,target_id,detail,request_id,created_at) SELECT ?,?,'journal',id,?,?,? FROM journal WHERE id=? AND mutation_id=?`,user.id,old?'journal_updated':'journal_created',JSON.stringify({from:old?.status||null,to:d.status,revision:(old?.revision||0)+1}),requestId,stamp,articleId,mutationId)
 ])}catch(error){if(/media_in_use|UNIQUE.*journal_media/.test(String(error)))fail(409,'media_in_use');if(!old&&String(error).includes('UNIQUE')){const existing=await first(env,'SELECT * FROM journal WHERE request_key=?',requestKey);if(existing?.request_hash===requestHash)return json({item:journalDTO(existing,true,true),replayed:true});fail(409,'idempotency_conflict')}throw error}
 if(!result[0].results?.length)fail(409,'revision_conflict');return json({item:journalDTO(await first(env,'SELECT * FROM journal WHERE id=?',articleId),true,true)},old?200:201);
}
