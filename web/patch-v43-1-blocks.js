(()=>{
const BUILD='v43.5';
const T=v=>String(v??'').trim();
const E=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const N=v=>{const x=Number(String(v??'').replace(',','.'));return Number.isFinite(x)?x:0};
const F=(v,d=0)=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:d}).format(N(v));
const M=v=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:0}).format(N(v))+' ₴';
const state={pickup:localStorage.v431_pickup!=='0',fop:localStorage.v431_fop!=='0',replen:localStorage.v431_replen!=='0'};
const dat=()=>typeof D!=='undefined'?D:(window.D||{});
function cov(r){return window.TRTS_V39_EXPEDITOR_COVERAGE?.[T(r?.expeditor_name)]||''}
function isPickup(r){return /самовивіз/i.test(cov(r))}
function pts(r){return(dat().points||[]).filter(p=>+p.route_id===+r.id)}
function docs(r){return(dat().docs||[]).filter(d=>T(d.route_delivery_id)===T(r.route_delivery_id))}
function metrics(r){const ds=docs(r),ps=pts(r);return{tt:ps.length,pal:ds.reduce((s,x)=>s+N(x.pallets),0)||ps.reduce((s,x)=>s+N(x.pallets),0),bottles:ds.reduce((s,x)=>s+N(x.bottles),0)||ps.reduce((s,x)=>s+N(x.bottles),0),weight:ds.reduce((s,x)=>s+N(x.weight),0)||ps.reduce((s,x)=>s+N(x.weight),0),sum:ds.reduce((s,x)=>s+N(x.order_amount),0)||N(r.total_order_amount)}}
function pickupCard(r){const m=metrics(r),wh=window.v433Warehouse?.(r.warehouse)||T(r.warehouse)||'—';return`<article class="v431-pickup-card" onclick="${typeof window.v412Route==='function'?`v412Route(${r.id})`:'void 0'}"><div class="v431-cardtop"><div><small>${E(r.route_date||'')}</small><b>${E(r.route_delivery_id||r.id)}</b></div><span>Самовивіз</span></div><div class="v431-exp"><small>Експедитор</small><b>${E(r.expeditor_name||'Самовивіз')}</b></div><div class="v431-cell"><small>Склад відвантаження</small><b>${E(wh)}</b></div><div class="v431-four"><div><small>ТТ</small><b>${m.tt}</b></div><div><small>Пал</small><b>${F(m.pal,3)}</b></div><div><small>Пляшки</small><b>${F(m.bottles)}</b></div><div><small>КГ</small><b>${F(m.weight,1)}</b></div></div><div class="v431-sum"><small>Сума маршруту</small><b>${M(m.sum)}</b></div></article>`}
function blockHeader(key,title,count){return`<button class="v431-block-head" onclick="v431Toggle('${key}')"><div><b>${title}</b><small>${count} за вибраний період</small></div><span>${state[key]?'Згорнути ︿':'Розгорнути ﹀'}</span></button>`}
window.v431Toggle=key=>{state[key]=!state[key];localStorage['v431_'+key]=state[key]?'1':'0';enhance(true)};
function enhance(force=false){const screen=document.querySelector('.v43-screen');if(!screen)return;if(screen.dataset.v431==='1'&&!force)return;
const pickup=(dat().routes||[]).filter(isPickup);
let pickupSec=[...screen.querySelectorAll('.v43-section')].find(s=>/Самовивіз/i.test(s.querySelector('h2')?.textContent||''));
let replenSec=[...screen.querySelectorAll('.v43-section')].find(s=>/Поповнення філій/i.test(s.querySelector('h2')?.textContent||''));
const head=screen.querySelector(':scope > .v43-head'),filters=screen.querySelector(':scope > .v43-filters'),groupbar=screen.querySelector(':scope > .v43-groupbar'),stack=screen.querySelector(':scope > .v43-stack');
if(!head||!filters||!groupbar||!stack)return;
let fopWrap=screen.querySelector(':scope > .v431-fop');if(!fopWrap){fopWrap=document.createElement('section');fopWrap.className='v431-block v431-fop';screen.insertBefore(fopWrap,head);fopWrap.append(head,filters,groupbar,stack)}
let fopHeader=fopWrap.querySelector(':scope > .v431-block-head');if(fopHeader)fopHeader.remove();fopWrap.insertAdjacentHTML('afterbegin',blockHeader('fop','🚛 ФОП / TS',(dat().routes||[]).filter(r=>/^(фоп|ts|тс)$/i.test(cov(r))).length));[head,filters,groupbar,stack].forEach(x=>x.style.display=state.fop?'':'none');
if(replenSec){replenSec.classList.add('v431-block');const old=replenSec.querySelector(':scope > .v431-block-head');if(old)old.remove();const cnt=replenSec.querySelector('.v43-section-title small')?.textContent?.match(/\d+/)?.[0]||'0';replenSec.insertAdjacentHTML('afterbegin',blockHeader('replen','📦 Поповнення філій',cnt));[...replenSec.children].forEach((x,i)=>{if(i>0)x.style.display=state.replen?'':'none'})}
if(pickupSec){pickupSec.classList.add('v431-block');pickupSec.innerHTML=blockHeader('pickup','🚚 Самовивіз',pickup.length)+`<div class="v431-pickup-body" style="display:${state.pickup?'grid':'none'}">${pickup.length?pickup.map(pickupCard).join(''):'<div class="v43-empty">Маршрутів самовивозу за вибраний період немає</div>'}</div>`}
if(pickupSec&&fopWrap&&pickupSec.previousElementSibling!==fopWrap){screen.insertBefore(pickupSec,fopWrap)}
if(replenSec&&fopWrap&&replenSec.previousElementSibling!==fopWrap){screen.insertBefore(replenSec,fopWrap.nextSibling)}
screen.dataset.v431='1';
const badge=document.getElementById('trts-update');if(badge)badge.textContent='TEST · '+BUILD;
}
const css=`.v431-block{margin:10px 0 14px!important;padding:0!important;border:0!important}.v431-block-head{width:100%;display:flex;justify-content:space-between;align-items:center;gap:12px;border:1px solid #2b3546;background:linear-gradient(135deg,#141b29,#0d131e);color:#fff;border-radius:16px;padding:14px 15px;margin:0 0 10px;text-align:left}.v431-block-head div{display:grid;gap:3px}.v431-block-head b{font-size:15px;letter-spacing:.01em}.v431-block-head small{font-size:9px;color:#818da0;font-weight:500}.v431-block-head>span{font-size:10px;color:#a98aff;white-space:nowrap}.v431-pickup-body{display:grid;gap:10px}.v431-pickup-card{border:1px solid #253044;background:linear-gradient(145deg,#121a28,#0c121c);border-radius:18px;padding:14px;box-shadow:0 10px 30px #0003}.v431-cardtop{display:flex;justify-content:space-between;align-items:center}.v431-cardtop>div{display:grid}.v431-cardtop small,.v431-exp small,.v431-cell small,.v431-four small,.v431-sum small{display:block;color:#7f8a9d;font-size:9px}.v431-cardtop span{font-size:9px;color:#8bea9b;border:1px solid #355f3d;border-radius:999px;padding:5px 8px}.v431-exp{margin:11px 0;background:linear-gradient(135deg,#284b38,#316944);padding:11px 13px;border-radius:13px}.v431-exp b{font-size:16px}.v431-cell{background:#0d141f;border:1px solid #222d3e;border-radius:11px;padding:10px}.v431-four{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:8px}.v431-four>div{background:#0d141f;border:1px solid #222d3e;border-radius:11px;padding:9px}.v431-four b{font-size:12px}.v431-sum{margin-top:9px;border-top:1px solid #263044;padding-top:9px}.v431-sum b{font-size:18px;color:#79dfa0}@media(max-width:520px){.v431-four{grid-template-columns:repeat(2,1fr)}}`;
let st=document.getElementById('v431-style');if(!st){st=document.createElement('style');st.id='v431-style';st.textContent=css;document.head.appendChild(st)}
const view=document.getElementById('view')||document.getElementById('content');if(view)new MutationObserver(()=>setTimeout(()=>enhance(),0)).observe(view,{childList:true,subtree:false});
setTimeout(()=>enhance(true),450);
})();
