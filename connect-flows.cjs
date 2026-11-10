const fs=require('node:fs');let p='dist/app.js',s=fs.readFileSync(p,'utf8');
function once(from,to){if(!s.includes(from))throw new Error('Expected source not found: '+from.slice(0,90));s=s.replace(from,to)}
function replaceFunction(name,next,newSource){const start=s.indexOf('function '+name+'('),end=s.indexOf('function '+next+'(',start);if(start<0||end<0)throw new Error('Missing function '+name);s=s.slice(0,start)+newSource+'\n'+s.slice(end)}
once("const types=['Студи / 2 өрөө','Орон сууц','Хаус / Вилла','Оффистел','Шинэ төсөл']","const types=['Орон сууц','Хаус / Амьны орон сууц','Оффис / Үйлчилгээ','Газар түрээс','Богино хугацааны түрээс']");
once("const homeCategoryLabels=['Орон сууц','Хаус / Амьны орон сууц','Оффис / Үйлчилгээ','Газар түрээс','Богино хугацааны түрээс'];",'const homeCategoryLabels=types;');
once('type:i%4,area:','type:i%5,area:');once("deal:i%5===0?'jeonse':'rent'","deal:i%7===0?'jeonse':'rent'");
replaceFunction('searchbar','search',"function searchbar(){return connectedSearchbar()}");
once("function mapPage(){if(category===4)return sale();",'function mapPage(){');
once('types.slice(0,4).map((t,i)=>','types.map((t,i)=>');
once('onclick="category=category===${i}? -1:${i};render()"','onclick="chooseMapCategory(${i})"');
once('let a=homes.filter(h=>(category<0','let a=homes.filter(h=>extraFilterMatch(h)&&(category<0');
once('<b>Зарууд · ${a.length}</b><select','<b>Зарууд · ${a.length}</b><button class="save-search-button" onclick="saveCurrentSearch()">☆ Хайлт</button><select');
replaceFunction('filterModal','applyFilter',"function filterModal(kind){openConnectedFilters(kind)}");
replaceFunction('gallery','nearby',"function gallery(id,index){connectedGallery(id,index)}");
replaceFunction('nearby','contact',"function nearby(tab){openNearbyFlow(tab)}");
replaceFunction('contact','report',"function contact(id,kind){connectedContact(id,kind)}");
replaceFunction('report','share',"function report(id){connectedReport(id)}");
replaceFunction('share','favorites',"function share(id){shareProperty(id)}");
// Preserve the projects declaration which lives between favourites and sale.
const a=s.indexOf('function favorites('),b=s.indexOf('const projects=',a);if(a<0||b<0)throw new Error('Missing favourites block');s=s.slice(0,a)+'function favorites(){return connectedFavorites()}\n'+s.slice(b);
replaceFunction('login','authInfo',"function login(mode='welcome'){return authPage(mode)}");
replaceFunction('addPost','faqItems',"function addPost(event){savedCommunityPost(event)}\nconst faqs=[['Хэрхэн байр хайх вэ?','Дүүрэг, хотхон эсвэл зарын дугаараар хайж, үнэ болон нэмэлт нөхцөлөөр шүүнэ.'],['Хадгалсан зарыг хаанаас үзэх вэ?','Сонирхсон жагсаалтаас зар, хотхон, хадгалсан хайлтаа харна.'],['Зар хэрхэн нэмэх вэ?','Зар нэмэх цэсний 4 алхмыг бөглөнө. Демо зар зөвхөн энэ браузерт хадгалагдана.'],['Зарын үнэ ямар нэгжтэй вэ?','Одоогийн жишээ үнүүд нь 10,000 воны нэгжтэй. Бодит зах зээлийн санал биш.'],['Бүртгэл болон хүсэлт бодит уу?','Үгүй. Бүртгэл, код шалгалт, хүсэлтүүд нь локал демо. Нууц үг, имэйл хадгалагдахгүй, SMS илгээгдэхгүй.']];");
once('card(h){return','card(h){return');
once('src="${img(h.id%8)}"','src="${imageFor(h)}"');
once('<p>${esc(h.desc)}</p>${h.id%3===0?', '<p>${esc(h.desc)}</p><button class="card-building-link" onclick="event.stopPropagation();goFlow(\'complex/${buildingNames().indexOf(h.name)}\')">Хотхоны мэдээлэл ↗</button>${h.id%3===0?');
once('src="${img((id+n)%8,650)}"','src="${imageFor(h,n)}"');
once('<button class="transaction-link" onclick="nearby(\'Бодит хэлцлийн мэдээлэл\')">','<button class="transaction-link" onclick="goFlow(\'complex/${buildingNames().indexOf(h.name)}\')">');
once('onclick="contact(${id})" aria-label="Утсаар лавлах"','onclick="contact(${id},\'phone\')" aria-label="Утсаар лавлах"');
once('${h.desc}. Гал тогоо,','${esc(h.description||h.desc)}. Гал тогоо,');
once('<span class="badge">ЖИШЭЭ ЗАРУУД</span></div><div class="chips">','<button class="recommendation-button" onclick="recommendationModal()">Нөхцөлөөр санал авах ⌁</button></div><div class="chips">');
once("document.body.classList.toggle('map-page',route==='map'&&category!==4);$('#app').innerHTML=", "document.body.classList.toggle('map-page',route==='map');if(route==='map'&&activeDetail&&!filtered().some(h=>h.id===activeDetail))activeDetail=null;const flowContent=flowRoute(r);$('#app').innerHTML=flowContent??(");
once(":route?infoPage(route):home();document.querySelector('nav')",":route?infoPage(route):home());refreshAccount();if(route==='community')decorateCommunity();document.querySelector('nav')");
s=s.replaceAll("&&category!==4",'');
once("});render();", "});hydrateLocalListings();connectGlobalFlowEvents();render();");
fs.writeFileSync(p,s);
p='dist/index.html';s=fs.readFileSync(p,'utf8');s=s.replace('<link rel="stylesheet" href="live-map.css">','<link rel="stylesheet" href="live-map.css"><link rel="stylesheet" href="flows.css">');s=s.replace('<script src="app.js"></script>','<script src="flows.js"></script><script src="app.js"></script>');s=s.replace('<a href="#/login">Нэвтрэх · Бүртгүүлэх</a>','<div id="account-control"></div>');s=s.replace('</nav><div class="account">','<a href="#/listing/new">Зар нэмэх</a></nav><div class="account">');s=s.replace('<a href="#/map/0">Студи / 2 өрөө</a><a href="#/map/2">Хаус / Вилла</a><a href="#/map/3">Оффистел</a><a href="#/map/1">Орон сууц</a>','<a href="#/map/0">Орон сууц</a><a href="#/map/1">Хаус / Амьны орон сууц</a><a href="#/map/2">Оффис / Үйлчилгээ</a><a href="#/map/3">Газар түрээс</a><a href="#/map/4">Богино хугацааны түрээс</a>');s=s.replace('<a href="#/notice">Мэдээ, мэдээлэл</a>','<a href="#/notice">Мэдээ, мэдээлэл</a><a href="#/complexes">Хотхоны мэдээлэл</a>');s=s.replace('<div class="fine">','<form class="footer-lookup" onsubmit="connectedSearch(event)"><label>Зарын дугаараар хайх <input name="query" inputmode="numeric" placeholder="59377690" required></label><button>⌕ Хайх</button><button type="button" onclick="scrollTo({top:0,behavior:\'smooth\'})">↑ Дээш</button></form><div class="fine">');fs.writeFileSync(p,s);
