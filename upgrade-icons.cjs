const fs=require('node:fs'),vm=require('node:vm');
function edit(file,fn){const before=fs.readFileSync(file,'utf8');fs.writeFileSync(file,fn(before))}
function one(s,from,to){if(!s.includes(from))throw new Error('Missing icon target: '+from.slice(0,100));return s.replace(from,to)}
edit('dist/app.js',s=>{
 s=s.replaceAll("saved.includes(id)?'♥':'♡'",'heartIcon(saved.includes(id))').replaceAll("saved.includes(h.id)?'♥':'♡'",'heartIcon(saved.includes(h.id))');
 s=s.replace('b.innerHTML=heartIcon(saved.includes(id));','b.innerHTML=heartIcon(saved.includes(id));b.setAttribute(\'aria-pressed\',String(saved.includes(id)));');
 s=s.replaceAll('data-heart="${h.id}" aria-label=', 'data-heart="${h.id}" aria-pressed="${saved.includes(h.id)}" aria-label=');
 s=s.replaceAll('data-heart="${id}" aria-label=', 'data-heart="${id}" aria-pressed="${saved.includes(id)}" aria-label=');
 s=one(s,'<div class="building"></div>','<div class="building" aria-hidden="true">${categoryIcon(i)}</div>');
 s=one(s,'onclick="chooseMapCategory(${i})">${t}</button>','onclick="chooseMapCategory(${i})">${categoryIcon(i)}<span>${t}</span></button>');
 s=one(s,'onclick="location.hash=\'/community\'">Манай хороолол</button>','onclick="location.hash=\'/community\'">${icon(\'users\')}<span>Манай хороолол</span></button>');
 for(const [label,name] of [['Сарын түрээс / Чонсе','wallet'],['Талбай','ruler'],['Ашиглалтад орсон он','calendar'],['Давхар','stairs'],['Нэмэлт шүүлтүүр','sliders']]){
  s=one(s,'>'+label+' ⌄</button>',">${icon('"+name+"')}<span>"+label+"</span>${icon('chevron-down')}</button>");
 }
 s=one(s,'aria-label="Шүүлтүүр цэвэрлэх">↻</button>','aria-label="Шүүлтүүр цэвэрлэх" title="Шүүлтүүр цэвэрлэх">${icon(\'refresh\')}</button>');
 s=one(s,'>☆ Хайлт</button>','>${icon(\'bookmark\')}<span>Хайлт</span></button>');
 s=one(s,'<div>⌂<p>${types[h.type]}</p></div><div>▧<p>${h.size} м²</p></div><div>▤<p>${h.floor} / 15 давхар</p></div><div>₩<p>СӨХ 7</p></div>','<div>${categoryIcon(h.type)}<p>${types[h.type]}</p></div><div>${icon(\'area\')}<p>${h.size} м²</p></div><div>${icon(\'stairs\')}<p>${h.floor} / 15 давхар</p></div><div>${icon(\'wallet\')}<p>СӨХ 7</p></div>');
 s=one(s,'aria-label="Хуваалцах" onclick="share(${id})">↥</button>','aria-label="Хуваалцах" title="Хуваалцах" onclick="share(${id})">${icon(\'share\')}</button>');
 s=s.replaceAll('>×</button>',">${icon('close')}</button>");
 s=one(s,'>⌖ ${h.area} · Хэлцлийн мэдээлэл <span>›</span></button>',">${icon('pin')}<span class=\"transaction-label\">${h.area} · Хэлцлийн мэдээлэл</span>${icon('chevron-right')}</button>");
 s=one(s,'onclick="toggleDetailSections(this)">⌄</button>','onclick="toggleDetailSections(this)">${icon(\'chevron-down\')}</button>');
 s=one(s,'aria-label="Утсаар лавлах">☎</button>','aria-label="Утсаар лавлах" title="Утсаар лавлах">${icon(\'phone\')}</button>');
 s=one(s,'aria-label="Чатаар лавлах">●</button>','aria-label="Чатаар лавлах" title="Чатаар лавлах">${icon(\'message\')}</button>');
 s=one(s,'class="primary" onclick="contact(${id})">Мессежээр лавлах</button>','class="primary" onclick="contact(${id})">${icon(\'send\')}<span>Мессежээр лавлах</span></button>');
 s=s.replaceAll('<span class="badge">✓ ${t}</span>','<span class="badge">${icon(\'check\')}${t}</span>');
 s=one(s,'<div class="detail-service-card"><span>▧</span>','<div class="detail-service-card"><span>${icon(\'image\')}</span>');
 s=one(s,'onclick="nearby(\'Ойр орчин\')">⌂</button>','aria-label="Байршил харах" onclick="nearby(\'Ойр орчин\')">${icon(\'house\')}</button>');
 s=s.replaceAll('зарууд 🔎</h2>',"зарууд ${icon('search')}</h2>");
 s=one(s,'Нөхцөлөөр санал авах ⌁</button>',"${icon('sparkles')}<span>Нөхцөлөөр санал авах</span></button>");
 s=one(s,'<h3>🏆 ${',"<h3>${icon('trophy')} ${");
 s=s.replace('refreshAccount();if(route=', 'refreshAccount();mountHeaderIcons();if(route=');
 return s;
});
edit('dist/flows.js',s=>{
 s=s.replace('<div class="empty-icon">▤</div>',"<div class=\"empty-icon\">${icon('folder')}</div>");
 const start=s.indexOf('function refreshAccount()'),end=s.indexOf('function toggleAccount(',start);
 if(start<0||end<0)throw new Error('Missing account control');
 const replacement=`function refreshAccount(){const host=document.getElementById('account-control');if(host)host.innerHTML=\`<button class="account-trigger" aria-expanded="false" onclick="toggleAccount(this)">\${icon('user-circle')}<span>\${flowState.profile.demo?esc(flowState.profile.name)+' · Демо':'Нэвтрэх · Миний булан'}</span>\${icon('chevron-down')}</button><div class="account-dropdown" hidden><b>\${flowState.profile.demo?esc(flowState.profile.name):'Тавтай морил!'}</b><a href="#/my/messages">\${icon('user')} Миний булан</a><a href="#/favorites">\${icon('heart')} Сонирхсон жагсаалт</a><a href="#/listing/new">\${icon('plus')} Зар нэмэх</a><a href="#/my/listings">\${icon('apartment')} Миний зарууд</a><a href="#/my/profile">\${icon('user-circle')} Миний мэдээлэл</a><a href="#/faq">\${icon('help-circle')} Хэрэглэгчийн тусламж</a>\${flowState.profile.demo?'<button onclick="exitDemo()">'+icon('logout')+' Демо горимоос гарах</button>':'<a href="#/login">'+icon('user-circle')+' Нэвтрэх / Бүртгүүлэх</a>'}</div>\`}
`;
 s=s.slice(0,start)+replacement+s.slice(end);
 s=one(s,'<span>⌕</span><input',"<span class=\"search-symbol\">${icon('search')}</span><input");
 s=s.replaceAll('>◷ <span>',">${icon('clock')}<span>").replaceAll('>⌕ <span>',">${icon('search')}<span>").replaceAll('<span>↗</span>',"${icon('arrow-up-right')}").replaceAll('<span>→</span>',"${icon('arrow-right')}");
 s=s.replaceAll("flowState.complexSaved.includes(name)?'♥':'♡'",'heartIcon(flowState.complexSaved.includes(name))');
 s=one(s,"${flowState.complexSaved.includes(name)?'♥ Хадгалсан':'♡ Хотхон хадгалах'}","${heartIcon(flowState.complexSaved.includes(name))}<span>${flowState.complexSaved.includes(name)?'Хадгалсан':'Хотхон хадгалах'}</span>");
 s=one(s,'>◉</button>',">${icon('eye')}</button>");
 s=s.replace("input.type=input.type==='password'?'text':'password'", "input.type=input.type==='password'?'text':'password';button.innerHTML=icon(input.type==='password'?'eye':'eye-off');button.setAttribute('aria-label',input.type==='password'?'Нууц үг харуулах':'Нууц үг нуух')");
 s=one(s,'>＠ Имэйлээр нэвтрэх</a>',">${icon('mail')}<span>Имэйлээр нэвтрэх</span></a>");
 s=one(s,'>● Kakao-гаар нэвтрэх</button>',">${icon('message')}<span>Kakao-гаар нэвтрэх</span></button>");
 s=s.replaceAll('>×</button>',">${icon('close')}</button>");
 s=s.replaceAll('>⌕ Хайх</button>',">${icon('search')} Хайх</button>");
 s=s.replaceAll('>‹</button>',">${icon('chevron-left')}</button>").replaceAll('>›</button>',">${icon('chevron-right')}</button>");
 s=one(s,'</small></span><span>⌄</span></summary>',"</small></span>${icon('chevron-down')}</summary>");
 // These three are plain string branches rather than template literals.
 s=s.replace("'<a href=\"#/listing/new\"><button class=\"primary\">＋ Зар нэмэх</button></a>'", "'<a href=\"#/listing/new\"><button class=\"primary\">'+icon('plus')+' Зар нэмэх</button></a>'");
 return s;
});
edit('dist/live-map.js',s=>{
 s=one(s,'aria-label="Ойртуулах">＋</button>',"aria-label=\"Ойртуулах\" title=\"Ойртуулах\">${icon('plus')}</button>");
 s=one(s,'aria-label="Холдуулах">−</button>',"aria-label=\"Холдуулах\" title=\"Холдуулах\">${icon('minus')}</button>");
 s=one(s,'title="Улаанбаатар">⌖</button>',"title=\"Улаанбаатар\">${icon('target')}</button>");
 s=one(s,'title="Монгол улс">MN</button>',"title=\"Монгол улс\">${icon('globe')}</button>");
 s=one(s,'onclick="openMapsMe()">MAPS.ME ↗</button>',"onclick=\"openMapsMe()\">${icon('external-link')}<span>MAPS.ME</span></button>");
 s=one(s,'onclick="nearby(\'${t}\')">${t}</button>',"onclick=\"nearby('${t}')\">${icon(['school','shield','bus'][['Сургууль','Аюулгүй байдал','Тээвэр'].indexOf(t)])}<span>${t}</span></button>");
 s=one(s,'onclick="query=\'\';render()">Улаанбаатар · Бүх зар</button>',"onclick=\"query='';render()\">${icon('pin')}<span>Улаанбаатар · Бүх зар</span></button>");
 return s;
});
edit('dist/detail-navigation.js',s=>one(s,"button.textContent=expanded?'⌃':'⌄';","button.innerHTML=icon(expanded?'chevron-up':'chevron-down');"));
edit('dist/index.html',s=>s.replace('<script src="live-map.js"></script>','<script src="icons.js"></script><script src="live-map.js"></script>').replace('<link rel="stylesheet" href="flows.css">','<link rel="stylesheet" href="flows.css"><link rel="stylesheet" href="icons.css">'));
