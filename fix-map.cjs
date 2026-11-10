const fs=require('node:fs');let p='dist/live-map.js',s=fs.readFileSync(p,'utf8');s=s.replace('CARTO / OpenStreetMap','OpenFreeMap / OpenStreetMap').replace("propertyMap?.setView([37.515,127.025],11)","propertyMap?.jumpTo({center:[127.025,37.515],zoom:10})");s=s.slice(0,s.indexOf('function initializePropertyMap()'))+`function initializePropertyMap(){
 const el=document.getElementById('property-map');if(!el)return;const loading=document.querySelector('.map-loading');
 const fail=()=>{if(loading){loading.hidden=false;loading.innerHTML='Газрын зураг ачаалсангүй.<br>Интернет эсвэл WebGL дэмжлэгээ шалгана уу.<br><button onclick="initializePropertyMap()">Дахин оролдох</button>'}};
 if(typeof maplibregl==='undefined'){fail();return}
 try{propertyMap=new maplibregl.Map({container:el,style:'https://tiles.openfreemap.org/styles/liberty',center:mapView?.center||[127.025,37.515],zoom:mapView?.zoom||10,minZoom:8,maxZoom:18,attributionControl:true});}catch(error){fail();return}
 const currentMap=propertyMap;
 currentMap.on('load',()=>{if(loading)loading.hidden=true;currentMap.resize()});
 currentMap.on('error',()=>{if(!currentMap.isStyleLoaded())fail()});
 const available=filtered();
 for(const [name,coords] of Object.entries(districtLocations)){
 const matches=available.filter(h=>h.area===name);if(!matches.length)continue;
 const marker=document.createElement('button');marker.className='district-pill';marker.type='button';marker.setAttribute('aria-label',name+', '+matches.length+' жишээ зар');marker.innerHTML='<b>'+matches.length+'</b><span>'+esc(name)+'</span>';
 marker.addEventListener('click',event=>{event.stopPropagation();query=name;render();toast(name+' · '+matches.length+' жишээ зар')});
 new maplibregl.Marker({element:marker,anchor:'center'}).setLngLat([coords[1],coords[0]]).addTo(currentMap);
 }
 currentMap.on('moveend',()=>{mapView={center:currentMap.getCenter(),zoom:currentMap.getZoom()}});
 if(typeof ResizeObserver!=='undefined'){mapResizeObserver=new ResizeObserver(()=>currentMap.resize());mapResizeObserver.observe(el)}currentMap.resize();
}
`;fs.writeFileSync(p,s);p='dist/index.html';s=fs.readFileSync(p,'utf8').replace('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css','https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.1/dist/maplibre-gl.css').replace('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js','https://cdn.jsdelivr.net/npm/maplibre-gl@5.6.1/dist/maplibre-gl.js');const logo='<a class="logo" href="#/" aria-label="Нүүр хуудас"><img src="assets/logo.svg" alt="Брэндийн лого"></a>';s=s.replace('<a class="logo" href="#/">дабанг<span>MN</span></a>',logo);fs.writeFileSync(p,s);p='dist/app.js';s=fs.readFileSync(p,'utf8').replace('<a class="logo" href="#/">дабанг<span>MN</span></a>',logo);fs.writeFileSync(p,s);
