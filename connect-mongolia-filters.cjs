const fs=require('node:fs');function edit(p,fn){fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')))}
function once(s,a,b){if(!s.includes(a))throw new Error('Missing filter target: '+a.slice(0,90));return s.replace(a,b)}
function replaceFn(s,name,next,body){const a=s.indexOf('function '+name+'('),b=s.indexOf('function '+next+'(',a);if(a<0||b<0)throw new Error('Missing function '+name);return s.slice(0,a)+body+'\n'+s.slice(b)}
edit('dist/app.js',s=>{
 s=once(s,"filter={deal:'all',max:150,minSize:0,parking:false,elevator:false,pet:false,year:0,floor:0}",'filter=defaultFilter()');
 s=replaceFn(s,'filtered','mapPage','function filtered(){return filteredMongolianHomes()}');
 s=once(s,"filter={deal:'all',max:150,minSize:0,parking:false,elevator:false,pet:false,year:0,floor:0};render()",'filter=defaultFilter();render()');
 s=once(s,"filter={deal:'all',max:Math.max(150,h.price),minSize:0,parking:false,elevator:false,pet:false,year:0,floor:0}",'filter=defaultFilter()');
 s=once(s,'<div class="filters"><button class="${filter.deal', '<div class="filters"><button class="${filter.locations?.length?\'active\':\'\'}" onclick="filterModal(\'location\')">${icon(\'pin\')}<span>${esc(locationFilterLabel())}</span>${icon(\'chevron-down\')}</button><button class="${filter.deal');
 s=s.replace("filter.max<150","filter.max>0").replace('<span>Сарын түрээс / Чонсе</span>','<span>Үнэ, ₮</span>');
 s=once(s,'<button class="${filter.minSize?', '<button class="${filter.rooms?.length?\'active\':\'\'}" onclick="filterModal(\'rooms\')">${icon(\'house\')}<span>Өрөө</span>${icon(\'chevron-down\')}</button><button class="${filter.minSize?');
 s=once(s,'<button class="${filter.parking||', '<button class="${filter.garage&&filter.garage!==\'all\'?\'active\':\'\'}" onclick="filterModal(\'garage\')">${icon(\'garage\')}<span>Гараж</span>${icon(\'chevron-down\')}</button><button class="${filter.parking||');
 const a=s.indexOf('<select aria-label="Эрэмбэлэх"'),b=s.indexOf('</select>',a);if(a<0||b<0)throw new Error('Missing sort control');const openEnd=s.indexOf('>',a);s=s.slice(0,a)+'<div class="sort-control">${icon(\'sort\')}'+s.slice(a,openEnd+1)+'${sortOptionsMarkup()}</select></div>'+s.slice(b+9);
 s=s.replaceAll("${h.deal==='jeonse'?'Чонсе 7,500':`Сарын ${h.deposit.toLocaleString()} / ${h.price}`}",'${propertyPriceText(h)}');
 s=s.replaceAll('СӨХ 7','СӨХ ${formatMnt(h.feeMnt??100000)}');
 s=s.replaceAll('Жишээ зар · Үнэ 10,000 воны нэгжээр · Бодит санал биш','Жишээ зар · Үнэ төгрөгөөр (₮) · Бодит санал биш');
 s=s.replace('${h.deposit.toLocaleString()} × 10,000 ₩','${formatMnt(h.deposit)}').replace('${h.price} × 10,000 ₩','${formatMnt(h.price)}').replace('70,000 ₩ / сар','${formatMnt(h.feeMnt??100000)} / сар');
 s=s.replace('`Улаанбаатар · ${h.area} дүүрэг`','`Улаанбаатар · ${h.area} · ${h.khoroo}`').replace("['Өрөө / ариун цэврийн өрөө','2 / 1']","['Өрөө / ариун цэврийн өрөө',(h.rooms==='shared'?'Хажуу өрөө':h.rooms||'—')+' / 1']");
 s=s.replaceAll('77 × 10,000 ₩','1 500 000 ₮');
 s=s.replace('Одоогийн жишээ үнүүд нь 10,000 воны нэгжтэй. Бодит зах зээлийн санал биш.','Жишээ үнийг төгрөгөөр (₮) илэрхийлнэ. Бодит зах зээлийн ханш эсвэл валютын хөрвүүлэлт биш.');
 s=once(s,'hydrateLocalListings();connectGlobalFlowEvents();render();','hydrateLocalListings();localizeListingData();connectGlobalFlowEvents();render();');
 return s;
});
edit('dist/flows.js',s=>{
 s=replaceFn(s,'openConnectedFilters','applyConnectedFilters','function openConnectedFilters(kind){openMongolianFilter(kind)}');
 s=replaceFn(s,'applyConnectedFilters','extraFilterMatch','function applyConnectedFilters(event,kind){applyMongolianFilter(event,kind)}');
 s=replaceFn(s,'extraFilterMatch','buildingNames','function extraFilterMatch(h){return matchesMongolianListing(h)}\n// Favourites include editable rooms, building histories and named searches.');
 s=s.replace('filter={...item.filter}','filter=normalizeMongolianFilter(item.filter)');
 s=s.replace('10,000 ₩ нэгж','Үнэ, ₮').replace('10,000 ₩ нэгжээр','₮ нэгжээр');
 s=s.replace('${h.price-10+v*3}','${formatMnt(Math.round(h.price*(.9+v*.03)/1000)*1000)}');
 s=s.replace('Одоогийн демо үнүүд Үнэ, ₮ээр өгөгдөнө.','Демо үнийг төгрөгөөр (₮) оруулна уу.').replace('Одоогийн демо үнүүд 10,000 ₩ нэгжээр өгөгдөнө.','Демо үнийг төгрөгөөр (₮) оруулна уу.');
 s=s.replace("max=\"10000\"",'max="100000000000"');
 s=s.replace("d.deposit+' / '+d.price+' · 10,000 ₩'","formatMnt(Number(d.deposit))+' / '+formatMnt(Number(d.price))");
 s=s.replace("value=\"jeonse\" ${d.deal==='jeonse'?'selected':''}>Чонсе · демо","value=\"sale\" ${d.deal==='sale'?'selected':''}>Зарна");
 s=s.replace('Сарын үнэ\',\'price\'','Үнэ, ₮\',\'price\'');
 s=s.replace("id:Date.now(),type:Number(d.type)","id:Date.now(),currency:'MNT',province:'Улаанбаатар',khoroo:d.khoroo||'1-р хороо',rooms:d.rooms==='shared'?'shared':Number(d.rooms)||null,garage:!!d.garage,feeMnt:100000,createdAt:new Date().toISOString(),type:Number(d.type)");
 s=s.replace("['parking','elevator','pet'])flowState.draft", "['parking','elevator','pet','garage'])flowState.draft");
 s=s.replace("[['parking','Зогсоол'],['elevator','Цахилгаан шат'],['pet','Амьтан зөвшөөрнө']]", "[['parking','Зогсоол'],['garage','Гараж'],['elevator','Цахилгаан шат'],['pet','Амьтан зөвшөөрнө']]");
 s=s.replace('h.price>=0&&typeof h.name',"h.price>=0&&typeof h.name").replace('Number.isFinite(h.price)&&h.price>=0',"(Number.isFinite(h.price)&&h.price>=0||h.price===null)");
 s=s.replace("filter={deal:'all',max:Number(f.get('max')),minSize:0,parking:false,elevator:false,pet:f.has('pet'),year:0,floor:0}","filter={...defaultFilter(),max:Number(f.get('max')),pet:f.has('pet')}");
 s=s.replace("'Сарын түрээсийн дээд үнэ · 10,000 ₩','max',150", "'Сарын түрээсийн дээд үнэ, ₮','max',2000000");
 s=s.replace("h.deal==='jeonse'","h.deal==='sale'");
 return s;
});
edit('dist/index.html',s=>s.replace('<script src="app.js"></script>','<script src="mongolia-filters.js"></script><script src="app.js"></script>').replace('<link rel="stylesheet" href="icons.css">','<link rel="stylesheet" href="icons.css"><link rel="stylesheet" href="mongolia-filters.css">'));
