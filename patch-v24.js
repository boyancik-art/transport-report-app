(()=>{
const oldLogistics24=logistics;
logistics=function(){const r=oldLogistics24();setTimeout(()=>{
 document.querySelectorAll('.route-card-v19').forEach(card=>{
  const m=(card.getAttribute('onclick')||'').match(/routeCard\((\d+)\)/);if(!m)return;
  const route=(D.routes||[]).find(x=>Number(x.id)===Number(m[1]));if(!route)return;
  const top=card.querySelector('.route-top .note');
  if(top&&!top.dataset.wh24){top.dataset.wh24='1';top.innerHTML=`${E(route.expeditor_name||'—')}<br><span class="warehouse-inline">Склад: ${E(route.warehouse||'—')}</span>`}
 });
},0);return r};

const oldRouteCard24=routeCard;
routeCard=function(id){const r=oldRouteCard24(id);setTimeout(()=>{
 document.querySelectorAll('.address-card').forEach(card=>{
  const text=card.querySelector('.address-text');if(!text||text.dataset.geo24)return;
  text.dataset.geo24='1';
  const addr=text.textContent.trim();
  const route=(S?.all?.routes||D.routes||[]).find(x=>Number(x.id)===Number(id));
  if(!route)return;
  const groups=typeof addrGroups==='function'?addrGroups(route):[];
  const name=card.querySelector('.address-name')?.textContent.replace(/^\d+\.\s*/,'').trim();
  const g=groups.find(x=>(x.address||'').trim()===addr||(x.name||'').trim()===name);
  const region=g?.l?.region||g?.docs?.find(d=>d.raw_data?.['Область'])?.raw_data?.['Область']||'';
  const district=g?.l?.district||g?.docs?.find(d=>d.raw_data?.['Район'])?.raw_data?.['Район']||'';
  if(region||district){const geo=document.createElement('div');geo.className='tt-geo';geo.innerHTML=`${region?`<span><small>Область</small><b>${E(region)}</b></span>`:''}${district?`<span><small>Район</small><b>${E(district)}</b></span>`:''}`;text.after(geo)}
 });
},0);return r};

const st=document.createElement('style');st.textContent=`.warehouse-inline{display:inline-block;margin-top:4px;color:#7a6470;font-weight:800;font-size:11px}.tt-geo{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:9px}.tt-geo span{background:#f5f1f2;border:1px solid #eee5e7;border-radius:11px;padding:8px}.tt-geo small{display:block;color:#8a7e82;font-size:9px;font-weight:800;margin-bottom:3px}.tt-geo b{display:block;font-size:11px;line-height:1.35;color:#272126}@media(max-width:420px){.tt-geo{grid-template-columns:1fr}}`;document.head.appendChild(st);
})();