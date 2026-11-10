const fs=require('node:fs');
function patch(path,from,to){let s=fs.readFileSync(path,'utf8');if(!s.includes(from))throw Error('Missing target: '+path+' / '+from.slice(0,60));fs.writeFileSync(path,s.replace(from,to))}
function fn(path,name,body){let s=fs.readFileSync(path,'utf8');const lines=s.split('\n'),at=lines.findIndex(l=>l.startsWith('function '+name+'('));if(at<0)throw Error(name);lines[at]=body;fs.writeFileSync(path,lines.join('\n'))}
patch('dist/index.html','href="admin.css">','href="admin.css"><link rel="stylesheet" href="broker-verification.css">');
patch('dist/index.html','<script src="admin.js"></script>','<script src="admin.js"></script><script src="broker-verification.js"></script>');
fn('dist/admin.js','adminBrokerId',"function adminBrokerId(h){return h.brokerId||(h.proManaged||h.contactRole==='agent'?'broker-local':'')}");
fn('dist/admin.js','adminCanPublish',"function adminCanPublish(h){if(adminReview(h)!=='approved')return false;const id=adminBrokerId(h);return !id||brokerEligible(id)}");
fn('dist/admin.js','adminBrokers','function adminBrokers(){return brokerAdminPage()}');
fn('dist/admin.js','adminOpenBroker','function adminOpenBroker(){brokerOpenReview()}');
fn('dist/admin.js','adminSubmitBroker','function adminSubmitBroker(event){brokerSubmitDecision(event)}');
patch('dist/admin.js',"adminState().settings.reviewListings||h.proManaged&&adminState().settings.reviewBrokerListings?'pending'", "adminState().settings.reviewListings||!!adminBrokerId(h)?'pending'");
patch('dist/admin.js',"a.settings.reviewListings||a.settings.reviewBrokerListings?'Батлах шаардлагатай':'Шууд нийтлэх'", "'Батлах шаардлагатай'");
patch('dist/admin.js',"name=\"reviewBrokerListings\" ${a.settings.reviewBrokerListings?'checked':''}", 'name="reviewBrokerListings" checked disabled');
patch('dist/admin.js','Бүх зарын хяналт унтраалттай үед зөвхөн PRO бүртгэлд үйлчилнэ.','Байгууллага баталгаажсан байсан ч зуучлагчийн шинэ болон зассан зар бүрийг шалгана. Энэ хамгаалалтыг унтраахгүй.');
patch('dist/admin.js',"reviewBrokerListings:f.has('reviewBrokerListings')",'reviewBrokerListings:true');
patch('dist/admin.js',"adminState().settings.reviewListings||d.proManaged&&adminState().settings.reviewBrokerListings?", "adminState().settings.reviewListings||!!adminBrokerId(d)?");
patch('dist/admin.js',"const review=adminState().listingReviews[h.id],broker=adminState().brokerReviews[adminBrokerId(h)];", "const review=adminState().listingReviews[h.id],broker=adminState().brokerReviews[adminBrokerId(h)];");
patch('dist/admin.js',"${['suspended','rejected'].includes(broker?.status)?", "${adminBrokerId(h)&&!brokerEligible(adminBrokerId(h))?'<p>Байгууллагын хяналт: '+esc(ADMIN_LABELS[brokerStatus(adminBrokerId(h))])+'</p>':''}${['suspended','rejected'].includes(broker?.status)?");
patch('dist/pro.js','<div class="pro-content">${page}', '<div class="pro-content">${brokerProBanner()}${page}');
patch('dist/pro.js',"['registration','Бүртгэлийн дугаар','text']", "['registration','Бүртгэлийн дугаар','text'],['licenseNumber','Зуучлалын зөвшөөрлийн дугаар','text'],['licenseValidUntil','Зөвшөөрөл хүчинтэй хүртэл','date']");
patch('dist/pro.js',"['name','agent','phone','email','address','registration'].map", "['name','agent','phone','email','address','registration','licenseNumber','licenseValidUntil'].map");
patch('dist/pro.js','</form></section><section class="pro-panel"><h2>Ажлын орчны эрх', '</form></section>${brokerProPanel()}<section class="pro-panel"><h2>Ажлын орчны эрх');
patch('dist/pro.js',"const schema=PRO_SCHEMAS[kind],errors=[];", "const schema=PRO_SCHEMAS[kind],errors=[];if(kind==='campaigns'&&item.stage==='requested'&&!brokerEligible())errors.push('Байгууллагын хоёр шатны хяналт дууссаны дараа сурталчилгааны хүсэлт илгээнэ үү.');");
patch('verify.cjs',"vm.runInContext(fs.readFileSync('dist/admin.js','utf8'),context);", "vm.runInContext(fs.readFileSync('dist/admin.js','utf8'),context);vm.runInContext(fs.readFileSync('dist/broker-verification.js','utf8'),context);");
patch('verify-listing-editor.cjs',"'pro','admin','app'", "'pro','admin','broker-verification','app'");
console.log('Connected mandatory broker eligibility, versioned review, PRO application, ad request blocking and always-on broker listing review.');
