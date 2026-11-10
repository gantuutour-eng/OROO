const assert=require('node:assert/strict');
const {check,context,data}=require('./verify.cjs');
class PinFormData{constructor(form){this.entries=Object.entries(form.values||{})}get(k){return this.entries.find(([name])=>name===k)?.[1]??null}getAll(k){const v=this.get(k);return v==null?[]:Array.isArray(v)?v:[v]}has(k){return this.entries.some(([name])=>name===k)}}
context.FormData=PinFormData;context.AbortController=AbortController;
const originalGet=context.document.getElementById;
const elements={};context.document.getElementById=id=>elements[id]||null;
check("flowState.draft=listingDraftDefaults();listingStep=0;editorReady=true;listingPhotoDraft=[]");
assert.equal(check('listingPin(flowState.draft)'),null);
assert.equal(check("validateListingDraft(flowState.draft,0).some(e=>e.field==='location')"),true);
for(const pair of [[null,106],['',106],[90,106],[47,NaN],[47,121],[Infinity,106]]){
 context.pinCandidate={latitude:pair[0],longitude:pair[1]};assert.equal(check('listingPin(pinCandidate)'),null);
}
assert.equal(check('setListingPin(47.92012349,106.91876549)'),true);
assert.equal(check('flowState.draft.latitude'),'47.920123');assert.equal(check('flowState.draft.longitude'),'106.918765');
assert.equal(JSON.parse(data['mn-flows']).draft.latitude,'47.920123');
assert.equal(check("validateListingDraft(flowState.draft,0).some(e=>e.field==='location')"),false);
const validCoords=check('flowState.draft.latitude');
assert.equal(check('setListingPin(0,0)'),false);assert.equal(check('flowState.draft.latitude'),validCoords);
context.pinForm={dataset:{editorStep:'0'},values:{address:'QA changed street',latitude:'47.920123',longitude:'106.918765'}};
check('captureListingDraft(pinForm)');assert.equal(check('flowState.draft.latitude'),'');
check("setListingPin(47.92,106.91);pinForm.values={unit:'999',latitude:'47.920000',longitude:'106.910000'};captureListingDraft(pinForm)");
assert.equal(check('flowState.draft.latitude'),'47.920000');
assert.equal(check("listingMapPicker(flowState.draft).includes('listing-editor-map')"),true);
check("flowState.draft.unit='SECRET UNIT';flowState.draft.contactPhone='PRIVATE PHONE'");
assert.equal(check("listingMapPicker(flowState.draft).includes('SECRET UNIT')"),false);
assert.equal(check("listingMapPicker(flowState.draft).includes('PRIVATE PHONE')"),false);
check("var pinRecord=buildListingRecord(flowState.draft,907001);flowState.listings=[pinRecord];homes.push(pinRecord);persistFlows();editLocalListing(907001)");
assert.equal(check('listingPin(flowState.draft).lat'),47.92);assert.equal(check('flowState.draft.unit'),'SECRET UNIT');
check("clearListingPin();persistListingDraft()");assert.equal(JSON.parse(data['mn-flows']).draft.longitude,'');
// Publication uses the same public gate as search and never exposes a pending pin.
check("pinRecord={...pinRecord,moderationStatus:'approved',listingStatus:'published',contactRole:'owner',brokerId:undefined,proManaged:false};flowState.listings=[pinRecord];homes.splice(homes.findIndex(h=>h.id===907001),1,pinRecord)");
assert.equal(check('isPublicListing(pinRecord)'),true);
assert.equal(check('showPublishedListingOnMap(pinRecord)'),true);
assert.equal(check('query'),'907001');assert.equal(check('mapView.center.lng'),106.91);assert.equal(check('mapView.zoom'),16);
assert.equal(check('filtered().length'),1);assert.equal(check('filtered()[0].id'),907001);
check("pinRecord.moderationStatus='pending';query=''");assert.equal(check('showPublishedListingOnMap(pinRecord)'),false);
check("afterListingLocationSaved(pinRecord,'pro/listings')");assert.equal(check('listingSavedLocationId'),907001);assert.equal(check('query'),'');
assert.equal(check('filtered().some(h=>h.id===907001)'),false);
// Search payloads must be in Mongolia and safe to render, including malformed responses.
context.placePayload={features:[
 {geometry:{type:'Point',coordinates:[106.917,47.918]},properties:{countrycode:'MN',name:'<b>QA</b>',city:'Улаанбаатар'}},
 {geometry:{type:'Point',coordinates:[106.917,47.918]},properties:{countrycode:'mn',name:'duplicate'}},
 {geometry:{type:'Point',coordinates:[106.917,47.918]},properties:{countrycode:'CN',name:'wrong country'}},
 {geometry:{type:'Point',coordinates:[126,47]},properties:{countrycode:'MN',name:'out of bounds'}},
 {geometry:{type:'Point',coordinates:{}},properties:{countrycode:'MN',name:'invalid'}},
 null]};
assert.equal(check('normalizeListingPlaces(placePayload).length'),1);
assert.equal(check('normalizeListingPlaces(placePayload)[0].lat'),47.918);
elements['listing-place-query']={value:'Central Tower'};
elements['listing-place-results']={innerHTML:'',textContent:''};elements['listing-place-search-button']={disabled:false};
let requests=[];context.fetch=async(url,opts)=>{requests.push({url,opts});return{ok:true,json:async()=>context.placePayload}};
(async()=>{
 await check('searchListingPlaces()');assert.equal(requests.length,1);
 const url=new URL(requests[0].url);assert.equal(url.searchParams.get('countrycode'),'MN');assert.equal(url.searchParams.get('q'),'Central Tower');
 assert.equal(url.searchParams.has('lat'),false);assert.equal(url.toString().includes('SECRET'),false);
 assert.equal(requests[0].opts.credentials,'omit');assert.ok(elements['listing-place-results'].innerHTML.includes('&lt;b&gt;QA&lt;/b&gt;'));
 await check('searchListingPlaces()');assert.equal(requests.length,1,'cache avoids a second request');
 check('chooseListingPlace(0)');assert.equal(check('flowState.draft.locationSource'),'search');assert.equal(check('flowState.draft.latitude'),'47.918000');
 check('listingPlaceLastRequest=0');elements['listing-place-query'].value='unavailable';context.fetch=async()=>{throw Error('offline')};
 await check('searchListingPlaces()');assert.ok(elements['listing-place-results'].textContent.includes('Газрын зураг дээр'));
 assert.equal(elements['listing-place-search-button'].disabled,false);
 let release;check('listingPlaceLastRequest=0');elements['listing-place-query'].value='old query';context.fetch=()=>new Promise(r=>release=r);
 const pending=check('searchListingPlaces()');check('cancelListingPlaceSearch(true)');release({ok:true,json:async()=>context.placePayload});await pending;
 assert.equal(elements['listing-place-results'].innerHTML,'','stale search cannot overwrite a new query');
 // Actual map-marker lifecycle with a minimal MapLibre boundary; exact pins are excluded from district totals.
 const maps=[],markers=[];
 class FakeMap{constructor(opts){this.opts=opts;this.events={};maps.push(this)}on(e,fn){this.events[e]=fn}addControl(){}getCenter(){return{lat:47.92,lng:106.91}}getZoom(){return 16}resize(){}jumpTo(v){this.jump=v}remove(){this.removed=true}isStyleLoaded(){return true}}
 class FakeMarker{constructor(opts){this.opts=opts;this.events={};markers.push(this)}setLngLat(p){this.point=p;return this}addTo(m){this.map=m;return this}on(e,fn){this.events[e]=fn;return this}getLngLat(){return{lng:this.point[0],lat:this.point[1]}}remove(){this.removed=true}}
 context.maplibregl={Map:FakeMap,Marker:FakeMarker,NavigationControl:class{}};
 const loading={hidden:false},host={parentElement:{querySelector:()=>loading}};elements['listing-editor-map']=host;
 check("listingSavedLocationId=null;listingStep=0;mountListingLocation()");assert.deepEqual(Array.from(markers.at(-1).point),[106.917,47.918]);
 maps.at(-1).events.click({lngLat:{lat:47.925,lng:106.923}});assert.equal(check('flowState.draft.latitude'),'47.925000');
 const marker=markers.at(-1);marker.point=[106.93,47.93];marker.events.dragend();assert.equal(check('flowState.draft.longitude'),'106.930000');
 check('destroyListingEditorMap()');assert.equal(maps.at(-1).removed,true);
 elements['property-map']={};context.document.createElement=()=>({setAttribute(){},addEventListener(){},className:'',innerHTML:'',textContent:''});
 check("pinRecord.moderationStatus='approved';category=-1;query='';filter=defaultFilter();initializePropertyMap()");
 assert.equal(markers.filter(m=>m.opts.element?.className==='property-location-marker').length,1);
 const districtMarkers=markers.filter(m=>m.opts.element?.className==='district-pill');assert.equal(districtMarkers.length,8);
 assert.equal(districtMarkers.reduce((n,m)=>n+Number(m.opts.element.innerHTML.match(/<b>(\d+)/)[1]),0),24);
 check('destroyPropertyMap()');context.document.getElementById=originalGet;
 console.log('PASS: required Mongolia pin, click/drag persistence, changed-address reset, unit privacy, edit round trip, public-map focus, pending isolation, Photon parsing/cache/failure/stale requests, exact marker and district totals, map cleanup.');
})().catch(e=>{console.error(e);process.exitCode=1});
