/* Geographic basemap with counts derived from the demo listings. */
let propertyMap=null,mapResizeObserver=null,mapView=null;
const MAP_REGION={center:[106.917,47.9189],zoom:10.5,countryCenter:[103.8,46.86],countryZoom:4};
function resetMapView(scope='city'){propertyMap?.jumpTo({center:scope==='country'?MAP_REGION.countryCenter:MAP_REGION.center,zoom:scope==='country'?MAP_REGION.countryZoom:MAP_REGION.zoom})}
function mapsMeUrl(lat,lng,name){return `mapswithme://map?v=1&ll=${Number(lat).toFixed(6)},${Number(lng).toFixed(6)}&n=${encodeURIComponent(name)}&appname=${encodeURIComponent('Өрөө платформ')}`}
function openMapsMe(area){const point=area&&districtLocations[area];const center=point?{lat:point[0],lng:point[1]}:propertyMap?.getCenter()||mapView?.center||{lat:MAP_REGION.center[1],lng:MAP_REGION.center[0]};const name=area?`${area} · Жишээ бүс`:'Улаанбаатар · Газрын зургийн төв';const url=mapsMeUrl(center.lat,center.lng,name);modal(`<h2>MAPS.ME дээр нээх</h2><p>Суулгасан MAPS.ME апп дээр энэ байршлыг нээнэ.</p><div class="notice">${esc(name)}<br>${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}<br>Жишээ бүсийн төв цэг. Байрны яг хаяг биш.</div><a class="mapsme-open-link" href="${esc(url)}">MAPS.ME апп нээх ↗</a><p class="notice">Апп суулгаагүй бол холбоос нээгдэхгүй байж болно. Веб газрын зураг нь OpenFreeMap / OpenStreetMap хэвээр байна.</p><a href="https://maps.me/" target="_blank" rel="noopener noreferrer">MAPS.ME татах албан ёсны сайт ↗</a>`)}
// Approximate district centres for demo listings; not property coordinates.
const districtLocations={'Сүхбаатар':[47.933,106.918],'Чингэлтэй':[47.965,106.899],'Баянгол':[47.918,106.864],'Баянзүрх':[47.927,106.99],'Хан-Уул':[47.886,106.9],'Сонгинохайрхан':[47.946,106.792],'Налайх':[47.773,107.253],'Багануур':[47.786,108.374]};
function destroyPropertyMap(){mapResizeObserver?.disconnect();mapResizeObserver=null;if(propertyMap){mapView={center:propertyMap.getCenter(),zoom:propertyMap.getZoom()};propertyMap.remove();propertyMap=null}}
function propertyMapMarkup(){return `<div class="map geographic-map"><div id="property-map" aria-label="Улаанбаатар хотын газрын зураг"></div><div class="map-loading" role="status">Газрын зураг ачаалж байна…</div><div class="map-tools"><button onclick="propertyMap?.zoomIn()" aria-label="Ойртуулах" title="Ойртуулах">${icon('plus')}</button><button onclick="propertyMap?.zoomOut()" aria-label="Холдуулах" title="Холдуулах">${icon('minus')}</button><button onclick="resetMapView()" aria-label="Улаанбаатар руу буцах" title="Улаанбаатар">${icon('target')}</button><button onclick="resetMapView('country')" aria-label="Монгол улсын газрын зураг" title="Монгол улс">${icon('globe')}</button></div><div class="map-bottom">${['Сургууль','Аюулгүй байдал','Тээвэр'].map(t=>`<button onclick="nearby('${t}')">${icon(['school','shield','bus'][['Сургууль','Аюулгүй байдал','Тээвэр'].indexOf(t)])}<span>${t}</span></button>`).join('')}</div><div class="map-demo-note">Дүүргийн нэр · Жишээ зарын тоо</div><button class="map-area-reset" onclick="query='';render()">${icon('pin')}<span>Улаанбаатар · Бүх зар</span></button></div>`}
function initializePropertyMap(){
 if(propertyMap)destroyPropertyMap();
 const el=document.getElementById('property-map');if(!el)return;const loading=document.querySelector('.map-loading');
 const fail=()=>{if(loading){loading.hidden=false;loading.innerHTML='Газрын зураг ачаалсангүй.<br>Интернет эсвэл WebGL дэмжлэгээ шалгана уу.<br><button onclick="initializePropertyMap()">Дахин оролдох</button>'}};
 if(typeof maplibregl==='undefined'){fail();return}
 try{propertyMap=new maplibregl.Map({container:el,style:'https://tiles.openfreemap.org/styles/liberty',center:mapView?.center||MAP_REGION.center,zoom:mapView?.zoom??MAP_REGION.zoom,minZoom:3,maxZoom:18,attributionControl:true});}catch(error){fail();return}
 const currentMap=propertyMap;
 currentMap.on('load',()=>{if(loading)loading.hidden=true;currentMap.resize()});
 currentMap.on('error',()=>{if(!currentMap.isStyleLoaded())fail()});
 const available=filtered();
 for(const [name,coords] of Object.entries(districtLocations)){
 const matches=available.filter(h=>h.area===name&&(!h.province||h.province==='Улаанбаатар')&&!listingPin(h));if(!matches.length)continue;
 const marker=document.createElement('button');marker.className='district-pill';marker.type='button';marker.setAttribute('aria-label',name+', '+matches.length+' жишээ зар');marker.innerHTML='<b>'+matches.length+'</b><span>'+esc(name)+'</span>';
 marker.addEventListener('click',event=>{event.stopPropagation();query=name;render();toast(name+' · '+matches.length+' жишээ зар')});
 new maplibregl.Marker({element:marker,anchor:'center'}).setLngLat([coords[1],coords[0]]).addTo(currentMap);
 }
 for(const h of available.filter(item=>item.local&&listingPin(item))){
  const marker=document.createElement('button');marker.className='property-location-marker';marker.type='button';marker.setAttribute('aria-label',h.name+' · Зарын байршил');marker.textContent=h.name;marker.addEventListener('click',event=>{event.stopPropagation();detail(h.id)});new maplibregl.Marker({element:marker,anchor:'bottom'}).setLngLat([h.longitude,h.latitude]).addTo(currentMap);
 }
 currentMap.on('moveend',()=>{mapView={center:currentMap.getCenter(),zoom:currentMap.getZoom()}});
 if(typeof ResizeObserver!=='undefined'){mapResizeObserver=new ResizeObserver(()=>currentMap.resize());mapResizeObserver.observe(el)}currentMap.resize();
}
