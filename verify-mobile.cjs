const assert=require('node:assert/strict');
const {check,context}=require('./verify.cjs');
context.window.matchMedia=()=>({matches:true});
assert.equal(check('isMobileView()'),true);
const nav=check('mobileNavMarkup("map")');assert.equal((nav.match(/<a /g)||[]).length,5);assert.equal((nav.match(/aria-current="page"/g)||[]).length,1);assert.ok(nav.includes('href="#/map"  aria-current="page"'));
for(const route of ['more','search']){const html=check(`flowRoute(['${route}'])`);assert.ok(html.length>500);assert.ok(!html.includes('undefined'))}
assert.ok(check('mobileMorePage()').includes('#/listing/new'));assert.ok(check('mobileMorePage()').includes('#/my/messages'));
assert.ok(check('mobileSearchPage()').includes('Сүхбаатар'));
context.location.hash='#/favorites';check('detail(homes[0].id)');assert.equal(context.location.hash,'/room/59377690');assert.equal(check('mobileDetailReturn'),'#/favorites');
context.location.hash='#/room/59377690';check('detail(homes[1].id)');assert.equal(check('mobileDetailReturn'),'#/favorites','related property preserves original return destination');
context.location.hash='#/room/59377691';check('mobileBack()');assert.equal(context.location.hash,'#/favorites');
context.location.hash='';check('detail(homes[0].id)');assert.equal(check('mobileDetailReturn'),'#/');
const detail=check('mobilePropertyPage(homes[0].id)');assert.ok(detail.includes('mobile-room-host'));assert.ok(detail.includes('detail-actions'));assert.ok(detail.includes('180 000 000'));assert.ok(!check('mobilePropertyPage(-1)').includes('detail-actions'));
context.location.hash='#/room/59377690';check('focusListingLocation(homes[0].id)');assert.equal(context.location.hash,'/map/0');assert.equal(check('mobileMapMode'),'map');assert.equal(check('query'),'59377690');assert.equal(check('filtered().length'),1);assert.equal(check('mapView.center.lng'),check('districtLocations[homes[0].area][1]'));
const select=context.document.querySelector;context.document.querySelector=()=>null;check('setMobileMapMode("list")');assert.equal(check('mobileMapMode'),'list');check('setMobileMapMode("map")');assert.equal(check('mobileMapMode'),'map');context.document.querySelector=select;
context.window.matchMedia=()=>({matches:false});assert.equal(check('isMobileView()'),false);
context.location.hash='#/search';check("filter=defaultFilter();filter.locations=['Улаанбаатар/Хан-Уул'];runSearch('Сүхбаатар')");assert.equal(check('filter.locations.length'),0);assert.equal(check('filtered().length'),3,'new district search replaces previous location selection');
console.log('PASS: five mobile destinations, shared search/account flows, detail deep links and back navigation, related-listing return path, unknown listing fallback, location-to-map filtering, and map/list switching.');
