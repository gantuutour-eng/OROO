/* Listing pins belong to the listing, never to the approximate district markers. */
let listingEditorMap=null,listingEditorMarker=null,listingMapObserver=null;
let listingSavedMap=null,listingSavedObserver=null,listingSavedLocationId=null;
let listingPlaceController=null,listingPlaceVersion=0,listingPlaceResults=[],listingPlaceLastRequest=0;
const listingPlaceCache=new Map();
const LISTING_PLACE_ENDPOINT='https://photon.komoot.io/api/';
function listingPin(h){
 if(!h||[h.latitude,h.longitude].some(v=>v===null||v===undefined||String(v).trim()===''))return null;
 const lat=Number(h.latitude),lng=Number(h.longitude);
 return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=41&&lat<=53&&lng>=87&&lng<=120?{lat,lng}:null;
}
function listingAddressKey(d){return ['province','area','khoroo','address','buildingNo'].map(k=>String(d[k]||'').trim()).join('|')}
function listingPinText(d){const p=listingPin(d);return p?`Байршил сонгогдсон · ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`:'Байршил сонгоогүй · Газрын зураг дээр байрныхаа цэгийг дарна уу.'}
function listingPinSummary(d){return `<div class="listing-pin-summary ${listingPin(d)?'selected':''}" id="listing-pin-status" role="status">${icon('pin')}<span>${esc(listingPinText(d))}</span></div>`}
function listingMapCanvas(id){return `<div class="listing-pin-canvas"><div id="${id}" class="listing-pin-map" aria-label="Зарын байршлын газрын зураг"></div><div class="listing-pin-loading" role="status">Газрын зураг ачаалж байна…</div></div>`}
function listingMapPicker(d){return `<div class="listing-map-picker" id="listing-location" tabindex="-1"><b>Байрны яг байршлыг сонгоно уу</b><p>Хаяг, хотхон эсвэл ойролцоох газрын нэрээр хайж, байрныхаа дээр зүүг байрлуулна уу. Зүүг чирж засаж болно.</p><div class="listing-place-search"><label class="sr-only" for="listing-place-query">Газрын нэрээр хайх</label><input id="listing-place-query" type="search" maxlength="160" placeholder="Жишээ: Central Tower, Улаанбаатар" oninput="cancelListingPlaceSearch(true)" onkeydown="if(event.key==='Enter'){event.preventDefault();searchListingPlaces()}"><button type="button" id="listing-place-search-button" onclick="searchListingPlaces()">${icon('search')}Хайх</button></div><p class="listing-place-privacy">Зөвхөн нийтийн газрын нэр / гудамжийг Photon / OpenStreetMap-д хайна. Тоот, утас, хувийн мэдээлэл бүү оруулаарай.</p><div id="listing-place-results" class="listing-place-results" aria-live="polite"></div>${listingMapCanvas('listing-editor-map')}<div class="listing-pin-tools"><button type="button" onclick="useListingMapCenter()">${icon('pin')}Газрын зургийн төвд зүү тавих</button><button type="button" onclick="clearListingPin()">${icon('close')}Зүү арилгах</button></div>${listingPinSummary(d)}<details class="listing-pin-coordinates"><summary>Координатаар оруулах</summary><div class="editor-grid">${editorField('Өргөрөг','latitude',editorInput('latitude',d.latitude,'number','min="41" max="53" step="0.000001" placeholder="47.918900"'))}${editorField('Уртраг','longitude',editorInput('longitude',d.longitude,'number','min="87" max="120" step="0.000001" placeholder="106.917000"'))}</div></details><p class="editor-hint">Сонгосон зүү зарын газрын зураг дээр харагдана. Хаяг өөрчилбөл байршлаа дахин сонгоно уу.</p></div>`}
function listingReviewMap(d){return `<div class="listing-location-review">${listingMapCanvas('listing-editor-map')}${listingPinSummary(d)}<button type="button" onclick="changeListingStep(0)">${icon('pin')}Байршил засах</button></div>`}
function cancelListingPlaceSearch(clear=false){listingPlaceVersion++;listingPlaceController?.abort();listingPlaceController=null;if(clear){listingPlaceResults=[];const el=document.getElementById('listing-place-results');if(el)el.innerHTML=''}const button=document.getElementById('listing-place-search-button');if(button)button.disabled=false}
function destroyListingEditorMap(){cancelListingPlaceSearch();listingMapObserver?.disconnect();listingMapObserver=null;listingEditorMarker=null;listingEditorMap?.remove();listingEditorMap=null}
function destroyListingSavedMap(){listingSavedObserver?.disconnect();listingSavedObserver=null;listingSavedMap?.remove();listingSavedMap=null}
function createListingPinMap(host,point,editable,onPick){
 const loading=host.parentElement.querySelector('.listing-pin-loading');
 const fail=()=>{if(loading){loading.hidden=false;loading.textContent='Газрын зураг ачаалсангүй. Интернетээ шалгана уу. Координатаар байршлаа оруулж болно.'}};
 if(typeof maplibregl==='undefined'){fail();return null}
 let map;try{map=new maplibregl.Map({container:host,style:'https://tiles.openfreemap.org/styles/liberty',center:point?[point.lng,point.lat]:MAP_REGION.center,zoom:point?16:11,minZoom:3,maxZoom:19,maxBounds:[[87,41],[120,53]],attributionControl:true,locale:{'NavigationControl.ZoomIn':'Ойртуулах','NavigationControl.ZoomOut':'Холдуулах','AttributionControl.ToggleAttribution':'Эх сурвалж'}});map.addControl(new maplibregl.NavigationControl({showCompass:false}),'top-right')}catch{fail();return null}
 map.on('load',()=>{if(loading)loading.hidden=true;map.resize()});map.on('error',()=>{if(!map.isStyleLoaded())fail()});
 if(editable)map.on('click',event=>onPick(event.lngLat.lat,event.lngLat.lng,'map'));
 return map;
}
function updateListingPinUI(fly=false){
 const d=prepareListingDraft(),point=listingPin(d),status=document.getElementById('listing-pin-status');
 if(status){status.classList.toggle('selected',!!point);status.innerHTML=icon('pin')+'<span>'+esc(listingPinText(d))+'</span>'}
 for(const name of ['latitude','longitude']){const input=document.getElementById('listing-'+name);if(input&&input.value!==String(d[name]??''))input.value=d[name]??''}
 if(!listingEditorMap)return;
 if(!point){listingEditorMarker?.remove();listingEditorMarker=null;return}
 if(!listingEditorMarker){listingEditorMarker=new maplibregl.Marker({color:'#ff385c',draggable:listingStep===0}).setLngLat([point.lng,point.lat]).addTo(listingEditorMap);listingEditorMarker.on('dragend',()=>{const p=listingEditorMarker.getLngLat();setListingPin(p.lat,p.lng,'map')})}
 else listingEditorMarker.setLngLat([point.lng,point.lat]);
 if(fly)listingEditorMap.jumpTo({center:[point.lng,point.lat],zoom:16});
}
function mountListingLocation(){
 const host=document.getElementById('listing-editor-map');
 if(host){const d=prepareListingDraft(),point=listingPin(d);listingEditorMap=createListingPinMap(host,point,listingStep===0,setListingPin);if(listingEditorMap){if(!point&&d.province==='Улаанбаатар'&&districtLocations[d.area]){const p=districtLocations[d.area];listingEditorMap.jumpTo({center:[p[1],p[0]],zoom:12})}else if(!point&&d.province!=='Улаанбаатар')listingEditorMap.jumpTo({center:MAP_REGION.countryCenter,zoom:4});updateListingPinUI();if(typeof ResizeObserver!=='undefined'){listingMapObserver=new ResizeObserver(()=>listingEditorMap?.resize());listingMapObserver.observe(host)}}}
 if(listingSavedLocationId!==null){const id=listingSavedLocationId;listingSavedLocationId=null;previewSavedListingLocation(id)}
}
function setListingPin(lat,lng,source='map'){
 if(!listingPin({latitude:lat,longitude:lng})){toast('Монголын байршил сонгоно уу.');return false}
 const form=document.getElementById('listing-editor-form');if(form)captureListingDraft(form);
 const d=prepareListingDraft();d.latitude=Number(lat).toFixed(6);d.longitude=Number(lng).toFixed(6);d.locationSource=source;
 updateListingPinUI(source==='search');persistListingDraft();return true;
}
function clearListingPin(){const d=prepareListingDraft();d.latitude='';d.longitude='';delete d.locationSource;updateListingPinUI();persistListingDraft()}
function invalidateListingPin(d){d.latitude='';d.longitude='';delete d.locationSource;cancelListingPlaceSearch(true);updateListingPinUI()}
function listingCoordinateInput(){const d=prepareListingDraft();d.locationSource='coordinates';updateListingPinUI(!!listingPin(d))}
function useListingMapCenter(){if(!listingEditorMap){toast('Газрын зураг ачаалаагүй. Координатаар оруулж болно.');return}const p=listingEditorMap.getCenter();setListingPin(p.lat,p.lng,'map')}
function normalizeListingPlaces(data){
 const seen=new Set();return (Array.isArray(data?.features)?data.features:[]).filter(f=>f?.geometry?.type==='Point'&&Array.isArray(f.geometry.coordinates)&&String(f.properties?.countrycode||'').toUpperCase()==='MN').map(f=>{const [lng,lat]=f.geometry.coordinates,p=f.properties;return {lat,lng,label:[p.name,[p.street,p.housenumber].filter(v=>typeof v==='string').join(' '),p.city,p.district,p.state].filter((v,i,a)=>typeof v==='string'&&v&&a.indexOf(v)===i).join(' · ').slice(0,300)}}).filter(p=>listingPin({latitude:p.lat,longitude:p.lng})&&p.label&&!seen.has(p.lat+','+p.lng)&&seen.add(p.lat+','+p.lng)).slice(0,6);
}
function renderListingPlaces(results){const el=document.getElementById('listing-place-results');if(!el)return;listingPlaceResults=results;el.innerHTML=results.length?'<p>Үр дүнгээс сонгоод зүүг байрныхаа дээр нарийвчлан байрлуулаарай.</p>'+results.map((p,i)=>`<button type="button" onclick="chooseListingPlace(${i})">${icon('pin')}<span>${esc(p.label)}</span>${icon('chevron-right')}</button>`).join(''):'<p>Байршил олдсонгүй. Газрын зураг дээр цэгээ сонгох эсвэл координатаар оруулна уу.</p>'}
async function searchListingPlaces(){
 const input=document.getElementById('listing-place-query'),out=document.getElementById('listing-place-results');if(!input||!out)return;
 const q=input.value.trim().replace(/\s+/g,' ');if(q.length<3){out.textContent='Газрын нэрийг 3-аас дээш тэмдэгтээр оруулна уу.';return}
 cancelListingPlaceSearch();const version=listingPlaceVersion,key=q.toLocaleLowerCase();
 if(listingPlaceCache.has(key)){renderListingPlaces(listingPlaceCache.get(key));return}
 if(Date.now()-listingPlaceLastRequest<2000){out.textContent='Түр хүлээгээд дахин хайна уу.';return}
 const controller=new AbortController();listingPlaceController=controller;listingPlaceLastRequest=Date.now();
 const button=document.getElementById('listing-place-search-button');if(button)button.disabled=true;out.textContent='Монгол дахь байршлыг хайж байна…';
 const url=new URL(LISTING_PLACE_ENDPOINT);url.searchParams.set('q',q);url.searchParams.set('countrycode','MN');url.searchParams.set('bbox','87,41,120,53');url.searchParams.set('limit','6');
 const timeout=setTimeout(()=>controller.abort(),15000);
 try{const response=await fetch(url.toString(),{signal:controller.signal,credentials:'omit'});if(!response.ok)throw new Error('lookup');const results=normalizeListingPlaces(await response.json());if(version!==listingPlaceVersion)return;if(listingPlaceCache.size>=30)listingPlaceCache.delete(listingPlaceCache.keys().next().value);listingPlaceCache.set(key,results);renderListingPlaces(results)}
 catch{if(version===listingPlaceVersion)out.textContent='Хайлт түр боломжгүй байна. Газрын зураг дээр байрныхаа цэгийг сонгоно уу.'}
 finally{clearTimeout(timeout);if(version===listingPlaceVersion){listingPlaceController=null;if(button)button.disabled=false}}
}
function chooseListingPlace(index){const place=listingPlaceResults[index];if(!place)return;if(setListingPin(place.lat,place.lng,'search')){const out=document.getElementById('listing-place-results');if(out){out.innerHTML='<p>'+icon('check')+' '+esc(place.label)+'<br>Зүүг яг байрныхаа дээр засаж, дээр оруулсан хаягтайгаа тулган шалгана уу.</p>'}}}
function showPublishedListingOnMap(h){
 if(!isPublicListing(h)||!listingPin(h))return false;
 destroyPropertyMap();const p=listingPin(h);mapView={center:{lat:p.lat,lng:p.lng},zoom:16};query=String(h.id);category=h.type;filter=defaultFilter();mobileMapMode='map';activeDetail=isMobileView()?null:h.id;goFlow('map/'+h.type);return true;
}
function afterListingLocationSaved(h,returnTo){
 if(!returnTo.startsWith('pro/')&&showPublishedListingOnMap(h))return;
 listingSavedLocationId=h.id;goFlow(returnTo);
}
function previewSavedListingLocation(id){
 const h=flowState.listings.find(item=>item.id===Number(id)),point=listingPin(h);if(!h||!point){toast('Энэ зарын яг байршил оруулаагүй.');return}
 modal(`<div class="listing-saved-location"><span class="eyebrow">ХАДГАЛСАН БАЙРШИЛ</span><h2>${esc(h.name)}</h2><p>${esc(listingAddress(h))}</p><div class="notice">${isPublicListing(h)?'Зар хэрэглэгчийн газрын зураг дээр харагдана.':'Зөвхөн танд харагдах урьдчилсан харагдац. Зар нийтэд хараахан харагдахгүй.'}</div>${listingMapCanvas('listing-saved-map')}<p>${esc(listingPinText(h))}</p>${isPublicListing(h)?`<button class="primary" onclick="closeOverlay();showPublishedListingOnMap(flowState.listings.find(h=>h.id===${h.id}))">Газрын зураг дээр зарыг харах</button>`:''}<button onclick="closeOverlay();editLocalListing(${h.id},'${h.proManaged?'pro/listings':'my/listings'}')">Байршил засах</button></div>`);
 const host=document.getElementById('listing-saved-map');if(host){listingSavedMap=createListingPinMap(host,point,false);if(listingSavedMap){new maplibregl.Marker({color:'#ff385c'}).setLngLat([point.lng,point.lat]).addTo(listingSavedMap);if(typeof ResizeObserver!=='undefined'){listingSavedObserver=new ResizeObserver(()=>listingSavedMap?.resize());listingSavedObserver.observe(host)}}}
}
