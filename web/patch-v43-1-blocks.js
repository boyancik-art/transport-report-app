(()=>{
const data=()=>typeof D!=='undefined'?D:window.D||{};
const defs=[['pickup','Самовивіз','truck'],['fop','ФОП / TS','truck'],['bakery','Пекарня / Фреш','truck'],['courier','Кур’єрські відправлення','box'],['sav','SAV','truck'],['stv','STV','truck'],['replen','Поповнення філій','warehouse']];
const header=(key,title,count,icon)=>`<button class="v431-block-head" onclick="v431Toggle('${key}')" aria-expanded="true"><b>${window.TRTS_UI.icon(icon)}<span>${title} · ${count}</span></b><span class="v431-toggle-label">⌃</span></button>`;
function enhance(){
 const screen=document.querySelector('.v43-screen');if(!screen||screen.dataset.v431==='1')return;
 const head=screen.querySelector(':scope > .v43-head'),filters=screen.querySelector(':scope > .v43-filters'),groupbar=screen.querySelector(':scope > .v43-groupbar'),stack=screen.querySelector(':scope > .v43-stack');
 if(!head||!filters||!groupbar||!stack||!window.TRTS_UI||!window.v436SectionKey)return;
 const oldSections=[...screen.querySelectorAll(':scope > .v43-section')],replen=oldSections.find(s=>s.querySelector('h2')?.textContent.includes('Поповнення'));
 const frag=document.createDocumentFragment();
 for(const [key,title,icon] of defs){
  const routes=(data().routes||[]).filter(r=>window.v436SectionKey(r)===key);
  if(key==='other'&&!routes.length)continue;
  if(key==='courier'){const anchor=document.createElement('div');anchor.id='v436-courier-anchor';frag.append(anchor);continue}
  const sec=document.createElement('section');sec.className='v431-block'+(key==='fop'?' v431-fop':'');sec.dataset.section=key;
  const count=key==='replen'?(replen?.querySelector('.v43-section-title small')?.textContent.match(/\d+/)?.[0]||0):routes.length;
  sec.innerHTML=header(key,title,count,icon);
  const body=document.createElement('div');body.className='v436-block-body'+(key==='pickup'?' v431-pickup-body':'');
  if(key==='fop')body.append(head,filters,groupbar,stack);
  else if(key==='replen'&&replen)body.append(...replen.children);
  else body.innerHTML=(key==='bakery'?(window.v439BakeryControls?.()||''):'')+(window.TRTS_FINANCE?.blockControls(key)||'')+(routes.map(r=>window.v436RouteCard(r)).join('')||'<div class="v43-empty">Маршрутів за вибраний період немає</div>');
  if(key==='bakery')body.insertAdjacentHTML('beforeend',window.TRTS_FINANCE?.manualCards('bakery')||'');sec.append(body);frag.append(sec);
 }
 const nav=document.createElement('div');nav.className='v44-finance-nav';nav.innerHTML='<button class="primary" onclick="v44OpenCosts()">Витрати власний парк · Тарифи SAV/STV</button>';frag.prepend(nav);oldSections.forEach(s=>s.remove());screen.append(frag);screen.dataset.v431='1';
}
const view=document.getElementById('view')||document.getElementById('content');
if(view)new MutationObserver(enhance).observe(view,{childList:true,subtree:false});
setTimeout(enhance,450);
})();
