const fs=require('node:fs');function change(file,edits){let s=fs.readFileSync(file,'utf8');for(const [from,to] of edits){if(!s.includes(from))throw Error(file+': missing '+from.slice(0,90));s=s.replace(from,to)}fs.writeFileSync(file,s)}
change('dist/index.html',[
 ['<meta name="viewport" content="width=device-width,initial-scale=1">','<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#ff385c">'],
 ['<link rel="stylesheet" href="listing-editor.css">','<link rel="stylesheet" href="listing-editor.css"><link rel="stylesheet" href="mobile-app.css">'],
 ['<main id="app"></main>','<div id="mobile-app-header"></div><main id="app"></main><nav id="mobile-bottom-nav" aria-label="Үндсэн цэс"></nav>'],
 ['<script src="app.js"></script>','<script src="mobile-app.js"></script><script src="app.js"></script>']
]);
change('dist/icons.js',[["const ICON_PATHS={","const ICON_PATHS={\n bell:'<path d=\"M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4\"/>',\n list:'<path d=\"M9 5h12M9 12h12M9 19h12M3 5h.01M3 12h.01M3 19h.01\"/>',"]]);
change('dist/flows.js',[["function flowRoute(parts){const [route,sub,third]=parts;","function flowRoute(parts){const [route,sub,third]=parts;if(route==='more')return mobileMorePage();if(route==='search')return mobileSearchPage();"]]);
change('dist/app.js',[
 ['</div></div></section><section class="wrap"><div class="section-head"><h2><em>Сүхбаатар</em>','</div></div></section>${mobileHomeExtras()}<section class="wrap"><div class="section-head"><h2><em>Сүхбаатар</em>'],
 ['${recommendationHomes().slice(0,8).map(card).join(\'\')}</div></div><div class="neighborhood">','${recommendationHomes().slice(0,8).map(card).join(\'\')}</div><a class="mobile-map-more" href="#/map">${icon(\'map\')}Газрын зураг дээр илүү олон зар харах</a></div><div class="neighborhood">'],
 ['<div class="map-search">${searchbar()}</div>','<div class="map-search">${mobileMapCategoryMarkup()}${searchbar()}</div>'],
 ['${propertyMapMarkup()}</div>`}function mapZoom','${propertyMapMarkup()}${mobileMapControlsMarkup()}</div>`}function mapZoom'],
 ["function closeDetail(){activeDetail=null;", "function closeDetail(){if(isMobileView()&&location.hash.startsWith('#/room/')){mobileBack();return}activeDetail=null;"],
 ["function detail(id){const h=homes.find(h=>h.id===id);if(!h)return;activeDetail=id;", "function detail(id){const h=homes.find(h=>h.id===id);if(!h)return;if(isMobileView()){if(location.hash!=='#/room/'+id){mobileDetailReturn=location.hash;activeDetail=null;location.hash='/room/'+id}else mountMobileProperty(id);return}activeDetail=id;"],
 ["route==='room'?home():route?infoPage(route):home()", "route==='room'?(isMobileView()?mobilePropertyPage(Number(r[1])):home()):route?infoPage(route):home()"],
 ["refreshAccount();mountHeaderIcons();if(route==='community')", "refreshAccount();mountHeaderIcons();mountMobileApp(route);if(route==='community')"],
 ["function modal(body){$('#overlay').innerHTML=", "function modal(body){document.body.style.overflow='hidden';$('#overlay').innerHTML="]
]);
