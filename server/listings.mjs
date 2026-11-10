import {MONGOLIA_PROVINCES,UB_KHOROO_COUNTS} from './locations.mjs';
import {fail,json,text,number,enumValue,httpsLink,now,uuid,sha,readJson,first,all,run,stmt,mutation,session,ownOrg,requireRole,rate,pageLimit,encodeCursor,decodeCursor,publicPredicate,listingDTOs,auditStatement,bumpPublic} from './core.mjs';

const stringFields={province:60,area:70,khoroo:70,address:180,buildingNo:40,unit:30,name:80,moveInDate:10,feeNote:500,desc:80,description:2000,nearbyTransit:250,nearbySchool:250,nearbyServices:350,contactName:60,contactPhone:25,contactHours:80,agencyName:100};
const arrays={feeIncluded:['heating','water','electricity','internet','tv','cleaning','security','waste'],cooling:['wall','standing','ceiling'],amenities:['bed','desk','wardrobe','dining','sofa','shoe','fridge','washer','dryer','shower','bath','bidet','sink','dishwasher','gasStove','induction','microwave','oven','tv','builtIn'],security:['guard','videoDoor','intercom','keycard','cctv','privateGuard','secureEntry','windowBars'],other:['smokeAlarm','balcony','terrace','yard','parcel']};
export function validateListing(input){
 const d={schemaVersion:2,currency:'MNT'};for(const [key,max] of Object.entries(stringFields))d[key]=text(input[key],max,['province','area','khoroo','address','name','desc','description','contactName'].includes(key));
 for(const key of ['showUnit','showContactPhone','priceNegotiable','garage','elevator','duplex'])d[key]=input[key]===true;
 for(const [key,values] of Object.entries(arrays)){if(input[key]!==undefined&&!Array.isArray(input[key]))fail(422,'invalid_options');d[key]=[...new Set(input[key]||[])];if(d[key].some(v=>!values.includes(v)))fail(422,'invalid_options')}
 const enums={deal:['rent','sale'],rentPeriod:['month','week','day'],moveIn:['immediate','date','negotiable'],feeMode:['separate','actual','included','none'],parkingStatus:['none','available','negotiable'],petPolicy:['no','yes','negotiable'],furnishing:['none','partial','full'],smoking:['no','yes','negotiable'],contactRole:['owner','agent','representative']};
 for(const [key,values] of Object.entries(enums))d[key]=enumValue(input[key],values,key==='rentPeriod'?'month':undefined);
 for(const [key,values] of Object.entries({heating:['','central','individual','district','electric','stove'],structure:['','concrete','brick','wood','mixed','other'],direction:['','N','NE','E','SE','S','SW','W','NW']}))d[key]=enumValue(input[key]||'',values);
 d.type=number(input.type,0,4,true,true);d.latitude=number(input.latitude,41,53,true);d.longitude=number(input.longitude,87,120,true);d.size=number(input.size,1,1e7,true);d.totalSize=number(input.totalSize,1,1e7);d.floor=number(input.floor,-3,150,d.type!==3,true);d.totalFloors=number(input.totalFloors,1,150,d.type!==3,true);d.bathrooms=number(input.bathrooms,0,30,[0,1,4].includes(d.type),true);d.year=number(input.year,1900,new Date().getUTCFullYear()+5,false,true);
 d.rooms=input.rooms==='shared'?'shared':number(input.rooms,1,5,[0,1,4].includes(d.type),true);d.price=d.priceNegotiable?null:number(input.price,1,1e12,true);d.deposit=d.deal==='sale'?0:number(input.deposit,0,1e12,true);d.feeMnt=['included','none'].includes(d.feeMode)?0:number(input.feeMnt,0,1e8,d.feeMode==='separate');d.minimumTerm=number(input.minimumTerm,1,1200,false,true);d.parkingFee=number(input.parkingFee||0,0,1e8,true);d.parkingSpaces=number(input.parkingSpaces,1,1000,false,true);
 if(d.totalSize&&d.totalSize<d.size||d.floor>d.totalFloors)fail(422,'invalid_dimensions');if(d.moveIn==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(d.moveInDate))fail(422,'invalid_date');if(d.contactRole==='agent'&&!d.agencyName)fail(422,'agency_required');if(d.contactPhone&&!/^\+?[\d\s()-]{8,25}$/.test(d.contactPhone))fail(422,'invalid_phone');
 if(!MONGOLIA_PROVINCES.includes(d.province))fail(422,'invalid_province');if(d.province==='Улаанбаатар'){const count=UB_KHOROO_COUNTS[d.area],k=Number(d.khoroo.match(/^(\d+)-р хороо$/)?.[1]);if(!count||!Number.isInteger(k)||k<1||k>count)fail(422,'invalid_khoroo')}
 d.videoUrl=httpsLink(input.videoUrl);d.tourUrl=httpsLink(input.tourUrl);d.parking=d.parkingStatus==='available'||d.garage;d.pet=d.petPolicy==='yes';d.furnished=d.furnishing==='full';d.balcony=d.other.includes('balcony');
 return d;
}
export function listingWhere(url,{privateUser=null,admin=false}={}){
 const q=url.searchParams,where=[],args=[];if(!privateUser&&!admin)where.push(publicPredicate);else if(privateUser){where.push('l.owner_id=?');args.push(privateUser.id);where.push("l.state<>'deleted'")}
 for(const [param,column] of [['province','l.province'],['area','l.area'],['khoroo','l.khoroo'],['deal','l.deal'],['rentPeriod','l.rent_period'],['org','l.organization_id']])if(q.get(param)){where.push(column+'=?');args.push(text(q.get(param),80,true))}
 if(q.has('type')){where.push('l.type=?');args.push(number(q.get('type'),0,4,true,true))}
 if(q.get('locations')){let locations;try{locations=JSON.parse(q.get('locations'))}catch{fail(400,'invalid_locations')}if(!Array.isArray(locations)||locations.length>30)fail(400,'invalid_locations');const choices=[];for(const path of locations){if(typeof path!=='string'||path.length>200)fail(400,'invalid_locations');const parts=path.split('/');if(parts.length>3)fail(400,'invalid_locations');choices.push('('+parts.map((value,index)=>{args.push(text(value,70,true));return ['l.province','l.area','l.khoroo'][index]+'=?'}).join(' AND ')+')')}if(choices.length)where.push('('+choices.join(' OR ')+')')}
 for(const [param,op] of [['minDeposit','>='],['maxDeposit','<=']])if(q.get(param)){where.push("json_extract(l.data,'$.deposit')"+op+'?');args.push(number(q.get(param),0,1e12,true))}
 if(q.get('status')&&admin){where.push('l.moderation=?');args.push(enumValue(q.get('status'),['pending','approved','rejected','suspended']))}
 for(const [param,column,op] of [['minPrice','l.price','>='],['maxPrice','l.price','<='],['minSize','l.size','>='],['maxSize','l.size','<='],['minFloor','l.floor','>='],['maxFloor','l.floor','<='],['minYear','l.year','>='],['maxYear','l.year','<=']])if(q.get(param)!==null&&q.get(param)!==''){const expression=param.includes('Price')&&q.get('includeFee')==='1'?"(l.price+COALESCE(json_extract(l.data,'$.feeMnt'),0))":column;where.push(expression+op+'?');args.push(number(q.get(param),param.includes('Floor')?-3:0,1e12,true))}
 if(q.get('rooms')){const rooms=q.get('rooms').split(',').slice(0,6);if(rooms.some(r=>!['1','2','3','4','5','shared'].includes(r)))fail(400,'invalid_rooms');where.push('CAST(l.rooms AS TEXT) IN ('+rooms.map(()=>'?').join(',')+')');args.push(...rooms)}
 for(const key of ['parking','elevator','pet','balcony','furnished','garage'])if(q.get(key)==='1'){where.push(`json_extract(l.data,'$.${key}')=1`)}
 if(q.get('garage')==='0')where.push("json_extract(l.data,'$.garage')=0");
 if(q.get('maxFee')){where.push("json_extract(l.data,'$.feeMnt')<=?");args.push(number(q.get('maxFee'),0,1e8,true))}
 if(q.get('bounds')){const b=q.get('bounds').split(',').map(Number);if(b.length!==4||b.some(v=>!Number.isFinite(v))||b[0]<87||b[2]>120||b[1]<41||b[3]>53||b[0]>=b[2]||b[1]>=b[3])fail(400,'invalid_bounds');where.push('l.longitude BETWEEN ? AND ? AND l.latitude BETWEEN ? AND ?');args.push(b[0],b[2],b[1],b[3])}
 const search=text(q.get('q')||'',120);if(/^\d{1,15}$/.test(search)){where.push('l.id=?');args.push(Number(search))}else if(search){const tokens=search.match(/[\p{L}\p{N}]+/gu)?.slice(0,8)||[];if(tokens.length){where.push('l.id IN (SELECT rowid FROM listing_search WHERE listing_search MATCH ?)');args.push(tokens.map(t=>'"'+t+'"*').join(' AND '))}}
 return {where:where.length?where.join(' AND '):'1=1',args};
}
const select='SELECT l.*,o.status AS organization_status,o.verified_until FROM listings l LEFT JOIN organizations o ON o.id=l.organization_id';
export async function listingPage(env,url,options={}){
 const {where,args}=listingWhere(url,options),limit=pageLimit(url),sort=url.searchParams.get('sort')||'new';
 const favoriteCondition=options.favoriteUser?' AND EXISTS(SELECT 1 FROM favorites f WHERE f.listing_id=l.id AND f.user_id=?)':'';if(options.favoriteUser)args.push(options.favoriteUser.id);
 const sorts={new:['l.created_at','DESC'],price:['COALESCE(l.price,999999999999999)','ASC'],'price-desc':['COALESCE(l.price,-1)','DESC'],size:['l.size','DESC']};if(!sorts[sort])fail(400,'invalid_sort');const [column,direction]=sorts[sort],cursor=decodeCursor(url.searchParams.get('cursor'));
 let condition=where+favoriteCondition;if(cursor){condition+=` AND (${column}${direction==='ASC'?'>':'<'}? OR (${column}=? AND l.id${direction==='ASC'?'>':'<'}?))`;args.push(cursor[0],cursor[0],number(cursor[1],1,Number.MAX_SAFE_INTEGER,true,true))}
 const rows=await all(env,`${select.replace(' FROM ',`, ${column} AS cursor_value FROM `)} WHERE ${condition} ORDER BY ${column} ${direction},l.id ${direction} LIMIT ?`,...args,limit+1);
 const more=rows.length>limit,shown=rows.slice(0,limit),last=shown.at(-1);return {items:await listingDTOs(env,shown,!!options.privateUser||options.admin),cursor:more?encodeCursor([last.cursor_value,last.id]):null,hasMore:more};
}
export async function listingRoute(request,env,url,user,requestId){
 const path=url.pathname,method=request.method;
 if(path==='/api/listings'&&method==='GET')return json(await listingPage(env,url));
 if(path==='/api/me/listings'&&method==='GET'){if(!user)fail(401,'login_required');return json(await listingPage(env,url,{privateUser:user}))}
 if(path==='/api/me/favorites'&&method==='GET'){if(!user)fail(401,'login_required');return json(await listingPage(env,url,{favoriteUser:user}))}
 if(path==='/api/map/clusters'&&method==='GET'){
  const {where,args}=listingWhere(url),zoom=number(url.searchParams.get('zoom')||10,3,19,true),cell=Math.max(.0008,360/2**zoom/4);
  const rows=await all(env,`SELECT COUNT(*) AS count,AVG(l.latitude) AS latitude,AVG(l.longitude) AS longitude,MIN(l.id) AS id,MIN(l.area) AS area FROM listings l LEFT JOIN organizations o ON o.id=l.organization_id WHERE ${where} GROUP BY CAST((l.latitude-41)/? AS INTEGER),CAST((l.longitude-87)/? AS INTEGER) LIMIT 251`,...args,cell,cell);
  return json({items:rows.slice(0,250),truncated:rows.length>250});
 }
 const match=path.match(/^\/api\/listings\/(\d{1,15})$/),id=match?Number(match[1]):null;
 if(match&&method==='GET'){
  const row=await first(env,select+' WHERE l.id=?',id);if(!row)fail(404,'listing_not_found');const privateView=user&&(row.owner_id===user.id||['admin','moderator'].includes(user.role));
  if(!privateView&&!(await first(env,select+' WHERE l.id=? AND '+publicPredicate,id)))fail(404,'listing_not_found');
  return json({item:(await listingDTOs(env,[row],!!privateView))[0]});
 }
 if(!((path==='/api/listings'&&method==='POST')||(match&&['PUT','DELETE'].includes(method))))return null;
 user=await mutation(env,request);await rate(env,request,'listing-write',40,3600,user.id);const old=id?await first(env,'SELECT * FROM listings WHERE id=?',id):null;
 if(id&&(!old||old.owner_id!==user.id))fail(404,'listing_not_found');
 if(method==='DELETE'){await env.DB.batch([stmt(env,"UPDATE listings SET state='deleted',revision=revision+1,updated_at=? WHERE id=? AND owner_id=?",now(),id,user.id),bumpPublic(env),auditStatement(env,user.id,'listing_archived','listing',id,{},requestId)]);return json({ok:true})}
 const body=await readJson(request),d=validateListing(body),photoIds=Array.isArray(body.photoIds)?[...new Set(body.photoIds)]:[];
 if(!photoIds.length||photoIds.length>10||photoIds.some(p=>typeof p!=='string'||!/^[a-f0-9-]{36}$/.test(p)))fail(422,'photos_required');
 const state=enumValue(body.listingStatus||'published',['draft','published','hidden','closed']),stamp=now();
 const mutationId=uuid(),requestHash=sha(JSON.stringify({d,photoIds,state}));let key=old?.request_key;
 if(!old){key=text(body.requestKey,100,true);if(!/^[a-zA-Z0-9_-]{12,100}$/.test(key))fail(422,'invalid_request_key');const existing=await first(env,'SELECT id,request_hash FROM listings WHERE owner_id=? AND request_key=?',user.id,key);if(existing){if(existing.request_hash!==requestHash)fail(409,'idempotency_conflict');return json({item:(await listingDTOs(env,[await first(env,select+' WHERE l.id=?',existing.id)],true))[0],replayed:true})}}
 const media=await all(env,`SELECT * FROM media WHERE id IN (${photoIds.map(()=>'?').join(',')}) AND owner_id=? AND full_ready=1 AND thumb_ready=1 AND NOT EXISTS(SELECT 1 FROM journal_media jm WHERE jm.media_id=media.id)`,...photoIds,user.id);
 if(media.length!==photoIds.length||media.some(m=>m.listing_id!==null&&m.listing_id!==id))fail(403,'invalid_photo_ownership');
 const org=d.contactRole==='agent'?await ownOrg(env,user):null;if(d.contactRole==='agent'&&!org)fail(422,'organization_required','Эхлээд PRO байгууллагын мэдээллээ бүртгэнэ үү.');
 if(org)d.agencyName=org.name;
 const args=[org?.id||null,d.type,d.province,d.area,d.khoroo,d.name,d.address,d.latitude,d.longitude,d.deal,d.price,d.rentPeriod,d.size,d.floor,d.rooms===null?null:String(d.rooms),d.year,JSON.stringify(d),state,stamp];
 let resultId=id;let saveStatement;
 if(old){
  if(body.revision!==old.revision)fail(409,'revision_conflict','Зар өөр төхөөрөмжөөс өөрчлөгдсөн. Шинэчилж дахин шалгана уу.');
  key=old.request_key;
  saveStatement=stmt(env,"UPDATE listings SET organization_id=?,type=?,province=?,area=?,khoroo=?,name=?,address=?,latitude=?,longitude=?,deal=?,price=?,rent_period=?,size=?,floor=?,rooms=?,year=?,data=?,state=?,updated_at=?,moderation='pending',review_reason='',revision=revision+1,mutation_id=? WHERE id=? AND owner_id=? AND revision=? RETURNING id",...args,mutationId,id,user.id,body.revision);
 }else{
  key=text(body.requestKey,100,true);if(!/^[a-zA-Z0-9_-]{12,100}$/.test(key))fail(422,'invalid_request_key');const existing=await first(env,'SELECT id,request_hash FROM listings WHERE owner_id=? AND request_key=?',user.id,key);if(existing){if(existing.request_hash!==requestHash)fail(409,'idempotency_conflict');return json({item:(await listingDTOs(env,[await first(env,select+' WHERE l.id=?',existing.id)],true))[0],replayed:true})}
  saveStatement=stmt(env,'INSERT INTO listings(owner_id,request_key,request_hash,mutation_id,organization_id,type,province,area,khoroo,name,address,latitude,longitude,deal,price,rent_period,size,floor,rooms,year,data,state,updated_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id',user.id,key,requestHash,mutationId,...args,stamp);
 }
 const lookup='SELECT id FROM listings WHERE owner_id=? AND request_key=? AND mutation_id=?';let saved;
 try{saved=await env.DB.batch([
  saveStatement,
  stmt(env,`UPDATE media SET listing_id=NULL,expires_at=? WHERE listing_id=(${lookup})`,Math.floor(Date.now()/1000)+172800,user.id,key,mutationId),
  ...photoIds.map((photo,index)=>stmt(env,`UPDATE media SET listing_id=(${lookup}),position=?,expires_at=0 WHERE id=? AND owner_id=? AND EXISTS(${lookup})`,user.id,key,mutationId,index,photo,user.id,user.id,key,mutationId)),
  bumpPublic(env),
  stmt(env,`INSERT INTO audit(actor_id,action,target_type,target_id,detail,request_id,created_at) SELECT ?,?,'listing',CAST(id AS TEXT),?,?,? FROM listings WHERE owner_id=? AND request_key=? AND mutation_id=?`,user.id,old?'listing_updated':'listing_created',JSON.stringify({moderation:'pending'}),requestId,stamp,user.id,key,mutationId)
 ])}catch(error){if(/photo_already_attached|media_in_use/.test(String(error)))fail(409,'photo_already_attached');if(!old&&String(error).includes('UNIQUE')){const existing=await first(env,'SELECT id,request_hash FROM listings WHERE owner_id=? AND request_key=?',user.id,key);if(existing?.request_hash===requestHash)return json({item:(await listingDTOs(env,[await first(env,select+' WHERE l.id=?',existing.id)],true))[0],replayed:true});fail(409,'idempotency_conflict')}throw error}
 if(!saved[0].results?.length)fail(409,'revision_conflict');resultId=saved[0].results[0].id;
 return json({item:(await listingDTOs(env,[await first(env,select+' WHERE l.id=?',resultId)],true))[0]},old?200:201);
}
