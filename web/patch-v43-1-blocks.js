(()=>{
const data=()=>typeof D!=='undefined'?D:window.D||{};
// Keep the complete matched list; create markup only for the next visible batch.
const pageSize=24,pages=new Map();let pageId=0;
// Reuse geographic lookup work during one synchronous render only. The existing
// quote function still calculates every result, including duplicate-zone errors.
let indexing=false;
function withLookupIndex(render){
 const C=window.TRTS_COSTS;if(indexing||!C?.zoneQuote)return render();
 const quote=C.zoneQuote,indexes=new WeakMap(),normalized=new Map();
 const geo=value=>{if(!normalized.has(value))normalized.set(value,C.geo(value));return normalized.get(value)};
 const key=(carrier,region,district)=>JSON.stringify([carrier,geo(region),geo(district)]);
 indexing=true;C.zoneQuote=args=>{
  let index=indexes.get(args.zones);if(!index){index=new Map();for(const row of args.zones){const k=key(row.carrier,row.region,row.district);if(!index.has(k))index.set(k,[]);index.get(k).push(row)}indexes.set(args.zones,index)}
  return quote({...args,zones:index.get(key(args.carrier,args.region,args.district))||[]});
 };
 try{return render()}finally{C.zoneQuote=quote;indexing=false}
}
function pageHTML(key,routes,renderBatch,empty='<div class="v43-empty">Маршрутів за вибраний період немає</div>'){
 const state={id:++pageId,routes,renderBatch,shown:Math.min(pageSize,routes.length)};
 pages.set(key,state);
 return `<div data-route-page="${key}" data-page-id="${state.id}"><div data-route-page-items style="display:grid;gap:12px">${routes.length?withLookupIndex(()=>renderBatch(routes.slice(0,state.shown))):empty}</div>${moreButton(key,state)}</div>`;
}
function moreButton(key,state){return state.shown<state.routes.length?`<button type="button" data-route-more="${key}" onclick="v431MoreRoutes(this)" style="margin:12px 0;padding:12px">Показати ще · ${state.shown} / ${state.routes.length}</button>`:''}
window.v431MoreRoutes=button=>{
 const key=button.dataset.routeMore,state=pages.get(key),host=button.closest('[data-route-page]');
 if(!state||!host?.isConnected||host.dataset.pageId!==String(state.id))return;
 const end=Math.min(state.shown+pageSize,state.routes.length),html=withLookupIndex(()=>state.renderBatch(state.routes.slice(state.shown,end)));
 host.querySelector('[data-route-page-items]').insertAdjacentHTML('beforeend',html);
 state.shown=end;if(end===state.routes.length){button.remove()}else button.textContent=`Показати ще · ${end} / ${state.routes.length}`;
};
window.TRTS_ROUTE_PAGES={html:pageHTML,size:pageSize};
const defs=[['base','База','warehouse'],['fop','ФОП / TS','truck'],['bakery','Пекарня / Fresh','truck'],['courier','Кур’єрські відправлення','box'],['replen','Поповнення філій','warehouse'],['sav','SAV','truck'],['stv','STV','truck'],['pickup','Самовивіз','truck']];
const header=(key,title,count,icon,kpi)=>`<button class="v431-block-head" onclick="v431Toggle('${key}')" aria-expanded="true"><b>${window.TRTS_SHELL?.icon(key)||window.TRTS_UI.icon(icon)}<span>${title} · ${count}</span><small class="v447-block-kpi">${kpi}</small></b><span class="v431-toggle-label">⌃</span></button>`;
function enhance(){return withLookupIndex(enhanceBlocks)}
function enhanceBlocks(){
 const screen=document.querySelector('.v43-screen');if(!screen||screen.dataset.v431==='1')return;
 const head=screen.querySelector(':scope > .v43-head'),filters=screen.querySelector(':scope > .v43-filters'),groupbar=screen.querySelector(':scope > .v43-groupbar'),stack=screen.querySelector(':scope > .v43-stack');
 if(!head||!filters||!groupbar||!stack||!window.TRTS_UI||!window.v436SectionKey)return;
 // Mark before touching the DOM so our own mutations cannot re-enter this work.
 screen.dataset.v431='1';
 const oldSections=[...screen.querySelectorAll(':scope > .v43-section')],replen=oldSections.find(s=>s.querySelector('h2')?.textContent.includes('Поповнення'));
 const frag=document.createDocumentFragment();
 for(const [key,title,icon] of defs){
  const routes=(data().routes||[]).filter(r=>(key==='base'?window.v436SectionKey(r)==='other':window.v436SectionKey(r)===key));
  if(key==='other'&&!routes.length)continue;
  if(key==='courier'){const anchor=document.createElement('div');anchor.id='v436-courier-anchor';frag.append(anchor);continue}
  const sec=document.createElement('section');sec.className='v431-block'+(key==='fop'?' v431-fop':'');sec.dataset.section=key;
  const count=key==='replen'?(replen?.querySelector('.v43-section-title small')?.textContent.match(/\d+/)?.[0]||0):routes.length;
  const O=window.TRTS_OPS,kpi=key==='replen'?(O.F(O.meta().replenishments.reduce((n,x)=>n+Number(x.pallets||0),0),3)+' пал.'):routes.reduce((n,r)=>n+O.routePointCount(r),0)+' ТТ';
  sec.innerHTML=header(key,title,count,icon,kpi);
  const body=document.createElement('div');body.className='v436-block-body'+(key==='pickup'?' v431-pickup-body':'');
  if(key==='fop'){body.append(head);if(window.TRTS_APP)body.insertAdjacentHTML('beforeend',window.TRTS_APP.carrierFilter(key));body.append(filters,groupbar,stack);}
  else if(key==='replen'&&replen)body.append(...replen.children);
  else if(key==='base')body.innerHTML=window.TRTS_APP?.baseCards(routes)||'';
  else if(key==='pickup')body.innerHTML=pageHTML(key,routes.filter(r=>window.TRTS_APP?.routeMatches(key,r)??true),rs=>rs.map(r=>(window.v437PickupCard||window.v436RouteCard)(r)).join(''));
  else body.innerHTML=(key==='bakery'?(window.v439BakeryControls?.()||''):'')+(window.TRTS_APP?.blockControls(key)||'')+pageHTML(key,routes.filter(r=>window.TRTS_APP?.routeMatches(key,r)??true),rs=>rs.map(r=>window.v436RouteCard(r)).join(''));
  if(key==='bakery')body.insertAdjacentHTML('beforeend',window.TRTS_OPS.meta().manual.filter(x=>x.block==='bakery'&&(window.TRTS_APP?.manualMatches('bakery',x)??true)).map(window.TRTS_OPS.manualCard).join(''));sec.append(body);frag.append(sec);
 }
 oldSections.forEach(s=>s.remove());if(window.TRTS_SHELL)window.TRTS_SHELL.mount(screen,frag);else screen.append(frag);screen.dataset.v431='1';
}
const view=document.getElementById('view')||document.getElementById('content');
if(view)new MutationObserver(enhance).observe(view,{childList:true,subtree:false});
setTimeout(enhance,450);
})();
