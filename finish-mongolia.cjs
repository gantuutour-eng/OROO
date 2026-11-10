const fs=require('node:fs');
function edit(file,changes){let source=fs.readFileSync(file,'utf8');for(const [from,to] of changes){if(!source.includes(from))throw new Error('Missing in '+file+': '+from.slice(0,100));source=source.replaceAll(from,to)}fs.writeFileSync(file,source)}
edit('dist/app.js',[
 ["price:[90,77,75,60,45,80,70,85][i%8],deposit:[1000,1000,500,2000,500,5000][i%6]","currency:'MNT',price:i%7===0?[180000000,250000000,320000000][Math.floor(i/7)%3]:[1250000,1500000,1000000,2000000,750000,2500000,1750000,2250000][i%8],deposit:i%7===0?0:[1250000,1500000,1000000,2000000,750000,2500000,1750000,2250000][i%8]"],
 ["deal:i%7===0?'jeonse':'rent'","deal:i%7===0?'sale':'rent'"],
 ['#Чонсе','#Худалдах'],['Чонсе түрээсийн сонголтууд','Худалдах байрны сонголтууд'],
 ['93,860 сая воноос',"${formatMnt(320000000)}-өөс"],
 ['Үнэ (10,000 ₩)','Үнэ, ₮'],
 ["${[93860,45697,41942,295000,148640][i].toLocaleString()}~","${formatMnt([320000000,250000000,180000000,450000000,380000000][i])}-өөс"],
 ['<span>Сарын түрээс</span><b>${formatMnt(h.price)}','<span>${h.deal===\'sale\'?\'Худалдах үнэ\':\'Сарын түрээс\'}</span><b>${formatMnt(h.price)}'],
 ["filter.deal!=='all'||filter.max>0","filter.deal!=='all'||filter.minRent>0||filter.max>0||filter.minDeposit>0||filter.maxDeposit>0||filter.includeFee"],
 ["filter.minSize?'active'","filter.minSize||filter.maxSize?'active'"],
 ['<button onclick="filterModal(\'year\')">','<button class="${filter.year?\'active\':\'\'}" onclick="filterModal(\'year\')">'],
 ['<button onclick="filterModal(\'floor\')">','<button class="${filter.floor||filter.maxFloor?\'active\':\'\'}" onclick="filterModal(\'floor\')">'],
 ["filter.parking||filter.elevator||filter.pet?'active'","filter.parking||filter.elevator||filter.pet||filter.balcony||filter.furnished?'active'"]
]);
edit('dist/flows.js',[
 ['required min="1" max="10000"','required min="1" max="100000000000"'],
 ["${field('Барьцаа','deposit',d.deposit||0,'number','required min=\"0\"')}${field('Үнэ, ₮','price',d.price||'','number','required min=\"1\" max=\"100000000000\"')}","${field('Барьцаа, ₮','deposit',d.currency==='MNT'?d.deposit||0:0,'number','required min=\"0\" max=\"100000000000\"')}${field('Үнэ, ₮','price',d.currency==='MNT'?d.price||'':'','number','required min=\"1\" max=\"100000000000\"')}${field('СӨХ / сар, ₮','feeMnt',d.feeMnt??100000,'number','required min=\"0\" max=\"10000000\"')}"],
 ['<select name="area">${areas.map(area=>','<select name="area" onchange="updateListingKhoroo(this)">${areas.map(area=>'],
 ["${field('Хотхон / байрны нэр','name'","<div class=\"form-pair\"><label class=\"field\">Хороо<select name=\"khoroo\">${listingKhorooOptions(d.area||areas[0],d.khoroo)}</select></label><label class=\"field\">Өрөөний тоо<select name=\"rooms\"><option value=\"\">Хамаарахгүй</option>${ROOM_CHOICES.map(([key,label])=>`<option value=\"${key==='5+'?'5':key}\" ${String(d.rooms)===(key==='5+'?'5':key)?'selected':''}>${label}</option>`).join('')}</select></label></div>${field('Хотхон / байрны нэр','name'"],
 ["if(listingStep===1)for(const k of ['parking','elevator','pet','garage'])flowState.draft[k]=f.has(k);","if(listingStep===1){flowState.draft.currency='MNT';for(const k of ['parking','elevator','pet','garage'])flowState.draft[k]=f.has(k);}"],
 ["garage:!!d.garage,feeMnt:100000,createdAt:","garage:!!d.garage,feeMnt:Number(d.feeMnt??100000),createdAt:"],
 ["['Үнэ',formatMnt(Number(d.deposit))+' / '+formatMnt(Number(d.price))]","['Барьцаа',formatMnt(Number(d.deposit))],[d.deal==='sale'?'Худалдах үнэ':'Сарын түрээс',formatMnt(Number(d.price))],['СӨХ / сар',formatMnt(Number(d.feeMnt??100000))]"],
 ['<h2>Сарын түрээсийн жишээ хандлага</h2>','<h2>${h.deal===\'sale\'?\'Худалдах үнийн\':\'Сарын түрээсийн\'} жишээ хандлага</h2>'],
 ['formatMnt(Math.round(h.price*(.9+v*.03)/1000)*1000)','formatMnt(h.price===null?null:Math.round(h.price*(.9+v*.03)/1000)*1000)']
]);
fs.appendFileSync('dist/mongolia-filters.js',`\nfunction listingKhorooOptions(area,current){return Array.from({length:UB_KHOROO_COUNTS[area]||1},(_,i)=>{const value=(i+1)+'-р хороо';return '<option '+(value===current?'selected':'')+'>'+value+'</option>'}).join('')}\nfunction updateListingKhoroo(select){const khoroo=select.form.querySelector('[name=khoroo]');khoroo.innerHTML=listingKhorooOptions(select.value,'1-р хороо')}\n`);
fs.appendFileSync('dist/icons.css','\n@media(min-width:761px){header>.mobile{display:none}}\n');
edit('verify.cjs',[
 ["vm.runInContext(fs.readFileSync('dist/app.js'","vm.runInContext(fs.readFileSync('dist/mongolia-filters.js','utf8'),context);vm.runInContext(fs.readFileSync('dist/app.js'"],
 ['filter.max=80','filter.max=2000000'],['h.price<=80','h.price<=2000000']
]);
edit('verify-flows.cjs',[
 ['has(k){return this.values.has(k)}','has(k){return this.values.has(k)}getAll(k){const value=this.values.get(k);return value===undefined?[]:Array.isArray(value)?value:[value]}'],
 ["filter={deal:'all',max:150,minSize:0,parking:false,elevator:false,pet:false,year:0,floor:0}","filter=defaultFilter()"],
 ["filter={deal:'all',max:150,minSize:0,floor:0,year:0}","filter=defaultFilter()"],
 ["max:'60'","max:'2000000'"],
 ["check('filter.max'),150","check('filter.max'),0"],
 ["maxDeposit:'2000'","maxDeposit:'2000000'"],
 ['h.deposit<=2000&&h.price+7<=60','h.deposit<=2000000&&h.price+h.feeMnt<=2000000'],
 ["price:'65',deposit:'1000'","currency:'MNT',price:'1500000',deposit:'1500000',rooms:'2',khoroo:'1-р хороо',feeMnt:'100000'"]
]);
console.log('Completed MNT data, all currency surfaces, filter states, listing room/khoroo controls and existing test updates.');
