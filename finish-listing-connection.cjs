const fs=require('node:fs');
let source=fs.readFileSync('verify-flows.cjs','utf8');
source=source.replace("flowState.draft={type:'4'","listingPhotoDraft=['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0J0AAAAASUVORK5CYII='];flowState.draft={...listingDraftDefaults(),address:'Demo street',totalFloors:'12',bathrooms:'1',contactName:'Demo owner',type:'4'");fs.writeFileSync('verify-flows.cjs',source);
source=fs.readFileSync('dist/listing-editor.js','utf8').replace("`${optionText('period',d.rentPeriod)}ын түрээс, ₮`","listingRentLabel(d)+', ₮'").replace('Координат мэдэж байвал хоёуланг оруулна уу. Оруулаагүй үед дүүргийн ерөнхий байршлыг ашиглана.','Координат мэдэж байвал хоёуланг оруулна уу. Оруулсан цэгийг газрын зураг дээр харуулна.');fs.writeFileSync('dist/listing-editor.js',source);
source=fs.readFileSync('dist/live-map.js','utf8');source=source.replace("available.filter(h=>h.area===name)","available.filter(h=>h.area===name&&(!h.province||h.province==='Улаанбаатар'))");
const at=" currentMap.on('moveend',()=>";if(!source.includes(at))throw new Error('Map insertion point missing');source=source.replace(at,` for(const h of available.filter(item=>item.local&&Number.isFinite(item.latitude)&&Number.isFinite(item.longitude))){
  const marker=document.createElement('button');marker.className='property-location-marker';marker.type='button';marker.setAttribute('aria-label',h.name+' · Зарын байршил');marker.textContent=h.name;marker.addEventListener('click',event=>{event.stopPropagation();detail(h.id)});new maplibregl.Marker({element:marker,anchor:'bottom'}).setLngLat([h.longitude,h.latitude]).addTo(currentMap);
 }
`+at);fs.writeFileSync('dist/live-map.js',source);
source=fs.readFileSync('dist/mongolia-filters.js','utf8').replace('${types[h.type]} Улаанбаатар Ulaanbaatar Монгол Mongolia','${types[h.type]} ${h.province===\'Улаанбаатар\'?\'Ulaanbaatar\':\'\'} Монгол Mongolia');fs.writeFileSync('dist/mongolia-filters.js',source);
console.log('Completed location markers, period labels and registration fixture.');
