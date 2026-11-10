const fs=require('node:fs');function edit(file,pairs){let s=fs.readFileSync(file,'utf8');for(const [a,b] of pairs){if(!s.includes(a))throw Error(file+': '+a.slice(0,80));s=s.replace(a,b)}fs.writeFileSync(file,s)}
edit('dist/index.html',[
 ['<link rel="stylesheet" href="mobile-app.css">','<link rel="stylesheet" href="mobile-app.css"><link rel="stylesheet" href="pro.css">'],
 ['<script src="app.js"></script>','<script src="pro.js"></script><script src="app.js"></script>'],
 ['<a href="#/agent">Агент / Зар сурталчилгаа</a></div>','<a href="#/pro">Өрөө PRO · Агент</a></div>']
]);
edit('dist/icons.js',[["const ICON_PATHS={",`const ICON_PATHS={
 grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
 'book-open':'<path d="M12 5c-3-2-6-2-10-1v16c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v16M5 8h4M5 12h4M15 8h4M15 12h4"/>',
 network:'<rect x="9" y="2" width="6" height="6" rx="1.5"/><rect x="2" y="16" width="6" height="6" rx="1.5"/><rect x="16" y="16" width="6" height="6" rx="1.5"/><path d="M12 8v5M5 16v-3h14v3"/>',
 chart:'<path d="M3 3v18h18M7 16v-4M12 16V7M17 16v-6"/>',
 megaphone:'<path d="m3 9 16-6v18L3 15V9ZM7 16l1 5h4l-2-6M22 8v8"/>',
 settings:'<path d="m10 2-1 3-3 1-3-1-1 4 2 2v3l-2 2 2 4 3-1 3 1 1 3h4l1-3 3-1 3 1 2-4-2-2v-3l2-2-2-4-3 1-3-1-1-3h-5Z"/><circle cx="12" cy="12" r="3"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/>',
 printer:'<path d="M6 8V2h12v6M6 17H3V8h18v9h-3M6 14h12v8H6v-8ZM17 11h.01"/>',`]]);
edit('dist/app.js',[
 ["document.body.classList.toggle('map-page',route==='map');","document.body.classList.toggle('map-page',route==='map');document.body.classList.toggle('pro-page',route==='pro');"],
 ['const h=homes.find(h=>h.id===id);if(!h)return;if(isMobileView())','const h=homes.find(h=>h.id===id);if(!h||!isPublicListing(h)){toast(\'Зар нийтэд харагдахгүй байна.\');return}proTrackView(id);if(isMobileView())'],
 ['Нууц үг, имэйл хадгалахгүй, серверт илгээхгүй. Зургийг Unsplash-аас ачаална.','Нууц үг, нэвтрэх имэйл хадгалахгүй. PRO-д оруулсан харилцагчийн холбоо барих мэдээлэл, тэмдэглэл, хуваарь болон байгууллагын мэдээлэл энэ браузерт хадгалагдана, серверт илгээгдэхгүй. Жишээ зургийг Unsplash-аас ачаална.']
]);
edit('dist/flows.js',[
 ["function flowRoute(parts){const [route,sub,third]=parts;","function flowRoute(parts){const [route,sub,third]=parts;if(route==='pro')return proPage(sub||'dashboard');"],
 ['<a href="#/my/messages">${icon(\'user\')} Миний булан</a>','<a href="#/pro">${icon(\'briefcase\')} Өрөө PRO</a><a href="#/my/messages">${icon(\'user\')} Миний булан</a>'],
 ["searchPanelTab==='complex'?[...new Set(homes.map(h=>h.name))]:homes.map(h=>String(h.id))","searchPanelTab==='complex'?[...new Set(homes.filter(isPublicListing).map(h=>h.name))]:homes.filter(isPublicListing).map(h=>String(h.id))"],
 ["function buildingNames(){return [...new Set(homes.map(h=>h.name))]}","function buildingNames(){return [...new Set(homes.filter(isPublicListing).map(h=>h.name))]}"],
 ["const ids=favTab===0?recent:saved;","const ids=(favTab===0?recent:saved).filter(id=>homes.some(h=>h.id===id&&isPublicListing(h)));"],
 ["function recommendationHomes(){if(activeTag===1)return homes.filter(h=>h.size<=30);if(activeTag===2)return homes.filter(h=>h.deal==='sale');if(activeTag===3)return homes.filter(h=>h.id%2===0);if(activeTag===4)return homes.filter(h=>h.type===4);if(activeTag===5)return [...homes].sort((a,b)=>b.id-a.id);return homes}","function recommendationHomes(){const list=homes.filter(isPublicListing);if(activeTag===1)return list.filter(h=>h.size<=30);if(activeTag===2)return list.filter(h=>h.deal==='sale');if(activeTag===3)return list.filter(h=>h.id%2===0);if(activeTag===4)return list.filter(h=>h.type===4);if(activeTag===5)return [...list].sort((a,b)=>b.id-a.id);return list}"],
 ['flowState.draft={};listingPhotoDraft=[];editorReady=false;listingStep=0;','flowState.draft={};flowState.pro={};listingPhotoDraft=[];editorReady=false;listingStep=0;'],
 ['Энэ браузерт хадгалсан зар, хайлт, лавлагаа болон нийтлэлүүдийг цэвэрлэнэ.','Энэ браузерт хадгалсан зар, хайлт, лавлагаа, нийтлэл болон PRO ажлын бүх бүртгэлийг цэвэрлэнэ.']
]);
let s=fs.readFileSync('dist/flows.js','utf8').replaceAll('homes.filter(h=>h.name===name)','homes.filter(h=>h.name===name&&isPublicListing(h))').replaceAll('homes.slice(0,4).map(card)','homes.filter(isPublicListing).slice(0,4).map(card)');fs.writeFileSync('dist/flows.js',s);
edit('dist/mongolia-filters.js',[["function matchesMongolianListing(h,excludeRooms=false){const f=filter;", "function matchesMongolianListing(h,excludeRooms=false){if(!isPublicListing(h))return false;const f=filter;"]]);
edit('dist/mobile-app.js',[
 ["['agent','briefcase','Агентын үйлчилгээ']","['pro','briefcase','Өрөө PRO · Ажлын самбар'],['agent','briefcase','Агентын үйлчилгээ']"],
 ['homes.find(item=>item.id===id);if(!h)return `<div class="wrap">','homes.find(item=>item.id===id&&isPublicListing(item));if(!h)return `<div class="wrap">'],
 ["const h=homes.find(item=>item.id===id),column=document.querySelector('.mobile-room-host .detail-column');","const h=homes.find(item=>item.id===id&&isPublicListing(item)),column=document.querySelector('.mobile-room-host .detail-column');"]
]);
edit('dist/listing-editor.js',[
 ['const id=d.editId||Date.now(),h=buildListingRecord(d,id);delete h.editId;',"const returnTo=d.returnTo||'my/listings',id=d.editId||Date.now(),h=buildListingRecord(d,id);delete h.editId;delete h.returnTo;"],
 ["goFlow('my/listings');toast(at>=0?", "goFlow(returnTo);toast(at>=0?"],
 ['function editLocalListing(id){','function editLocalListing(id,returnTo=\'my/listings\'){'],
 ['...h,editId:id,editorStep:0};','...h,editId:id,editorStep:0,returnTo};'],
 ["persistFlows();goFlow('listing/new');scrollTo(0,0);","persistFlows();goFlow(returnTo.startsWith('pro/')?'pro/new':'listing/new');scrollTo(0,0);"]
]);
edit('dist/pro.js',[
 ['</aside><div class="pro-work">','</aside><button class="pro-menu-dismiss" aria-label="PRO цэс хаах" onclick="document.querySelector(\'.pro-shell\').classList.remove(\'menu-open\')"></button><div class="pro-work">'],
 ["'Хувийн 매물장'.replace('매물장','бүртгэл')","'Хувийн бүртгэл'"],
 ["'Хувийн 매물장'.replace('매물장','бүртгэл')","'Хувийн бүртгэл'"]
]);
edit('verify.cjs',[["vm.runInContext(fs.readFileSync('dist/app.js','utf8'),context)","vm.runInContext(fs.readFileSync('dist/pro.js','utf8'),context);vm.runInContext(fs.readFileSync('dist/app.js','utf8'),context)"]]);
edit('verify-listing-editor.cjs',[["'mobile-app','app'","'mobile-app','pro','app'"]]);
