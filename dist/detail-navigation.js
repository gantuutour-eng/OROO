function setDetailSectionActive(panel,id){
 panel.querySelectorAll('[data-section-link]').forEach(button=>{
  const active=button.dataset.sectionLink===id;
  button.classList.toggle('active',active);
  if(active)button.setAttribute('aria-current','location');else button.removeAttribute('aria-current');
 });
}
function toggleDetailSections(button){
 const menu=document.getElementById('detail-section-menu');if(!menu)return;
 const expanded=button.getAttribute('aria-expanded')!=='true';
 menu.hidden=!expanded;button.setAttribute('aria-expanded',String(expanded));
 button.setAttribute('aria-label',expanded?'Бүх хэсгийг хураах':'Бүх хэсгийг дэлгэх');
 button.innerHTML=icon(expanded?'chevron-up':'chevron-down');
}
function jumpToDetailSection(id){
 const panel=document.querySelector('.detail-column .details');
 const target=panel?.querySelector('[data-detail-section="'+id+'"]');if(!target)return;
 const toggle=panel.querySelector('.detail-nav-toggle');
 if(toggle?.getAttribute('aria-expanded')==='true')toggleDetailSections(toggle);
 const headerHeight=panel.querySelector('.detail-top').getBoundingClientRect().height;
 const navHeight=panel.querySelector('.detail-section-nav').getBoundingClientRect().height;
 const top=panel.scrollTop+target.getBoundingClientRect().top-panel.getBoundingClientRect().top-headerHeight-navHeight;
 panel.scrollTo({top:Math.max(0,top),behavior:'smooth'});
 setDetailSectionActive(panel,id);
}
function bindDetailNavigation(column){
 const panel=column.querySelector('.details');if(!panel)return;
 const sections=Array.from(panel.querySelectorAll('[data-detail-section]'));
 const update=()=>{
  const threshold=panel.getBoundingClientRect().top+panel.querySelector('.detail-top').getBoundingClientRect().height+panel.querySelector('.detail-section-nav').getBoundingClientRect().height+28;
  let current='price';for(const section of sections){if(section.getBoundingClientRect().top<=threshold)current=section.dataset.detailSection;else break}
  setDetailSectionActive(panel,current);
 };
 panel.addEventListener('scroll',update,{passive:true});
 setDetailSectionActive(panel,'price');
}
