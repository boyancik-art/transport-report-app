(()=>{
const money=n=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:0}).format(Number(n)||0)+' ₴';
const num=n=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:3}).format(Number(n)||0);
const esc=s=>E(s);
const css=document.createElement('style');css.textContent=`
.detail-v3 .detail-card{padding:14px!important}.detail-v3 .detail-grid{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:6px!important}.detail-v3 .detail-k{border:0!important;border-radius:0!important;background:transparent!important;padding:4px 7px!important;border-left:1px solid #26313c!important}.detail-v3 .detail-k:nth-child(4n+1){border-left:0!important;padding-left:0!important}.detail-v3 .detail-k small{font-size:7px!important}.detail-v3 .detail-k strong{font-size:12px!important}.tt-list-v5{display:grid;gap:9px;margin-top:10px}.tt-v5{border:1px solid #26323e;border-radius:17px;background:linear-gradient(145deg,#111821,#0c1218);overflow:hidden}.tt-v5-head{padding:13px;display:flex;gap:10px;align-items:flex-start;cursor:pointer}.tt-v5-index{width:28px;height:28px;flex:0 0 28px;border-radius:9px;background:color-mix(in srgb,var(--accent) 16%,#10161e);border:1px solid color-mix(in srgb,var(--accent) 38%,#26313c);color:var(--accent);font-size:11px;font-weight:950;display:grid;place-items:center}.tt-v5-main{min-width:0;flex:1}.tt-v5-name{font-size:14px;font-weight:950;line-height:1.18}.tt-v5-address{font-size:9px;color:#8491a1;margin-top:4px;line-height:1.35}.tt-v5-meta{display:flex;gap:9px;flex-wrap:wrap;margin-top:9px}.tt-v5-pill{border-radius:999px;background:#18212b;color:#cfd7e2;padding:5px 8px;font-size:8px;font-weight:800}.tt-v5-pill.accent{background:color-mix(in srgb,var(--accent) 13%,#10161e);color:var(--accent)}.tt-v5-arrow{font-size:18px;color:#788595;transition:.2s}.tt-v5.open .tt-v5-arrow{transform:rotate(90deg)}.tt-v5-body{display:none;border-top:1px solid #202b35;padding:11px 13px}.tt-v5.open .tt-v5-body{display:block}.doc-v5{border-radius:12px;background:#0b1117;border:1px solid #1d2731;padding:10px;margin-top:7px}.doc-v5:first-child{margin-top:0}.doc-v5-top{display:flex;justify-content:space-between;gap:8px}.doc-v5-code{font-size:10px;font-weight:900;color:#e8edf4}.doc-v5-sum{font-size:10px;font-weight:900;color:var(--accent)}.doc-v5-meta{font-size:8px;color:#7f8b9a;margin-top:5px;line-height:1.45}.detail-summary-v5{display:grid;grid-template-columns:repeat(2,1fr);gap:7px;margin-top:8px}.detail-summary-v5 div{border:1px solid #222e39;border-radius:12px;background:#0d141b;padding:9px}.detail-summary-v5 small{display:block;color:#7f8c9c;font-size:7px}.detail-summary-v5 strong{display:block;margin-top:3px;font-size:13px}.points-title{margin-top:15px!important}
`;
document.head.appendChild(css);
function norm(s){return String(s||'').trim().replace(/\s+/g,' ').toLowerCase()}
function uniq(a){return [...new Set(a.filter(Boolean).map(x=>String(x).trim()).filter(Boolean))]}
async function rebuild(id){
 const r=routes.find(x=>Number(x.id)===Number(id));if(!r)return;
 const el=document.getElementById('routeDetailV3');if(!el)return;
 try{
  const pts=await api(`/rest/v1/route_points?select=id,route_id,location_id,customer_id,customer_name,documents_count,pallets,order_amount&route_id=eq.${encodeURIComponent(id)}`);
  const locIds=pts.map(x=>x.location_id).filter(Boolean);
  const locs=locIds.length?await api('/rest/v1/locations?select=id,address_id,delivery_address,settlement,district,region&id=in.'+encodeURIComponent('('+locIds.join(',')+')')).catch(()=>[]):[];
  const ds=await api('/rest/v1/source_documents?select=id,sale_code,operation_code,address_id,customer_id,business_unit,customer_name,delivery_address,order_amount,pallets,raw_data&route_delivery_id=eq.'+encodeURIComponent(r.route_delivery_id)).catch(()=>[]);
  const locMap=new Map(locs.map(x=>[String(x.id),x]));
  const oldHead=el.querySelector('.detail-card');
  if(oldHead){
    const ks=[...oldHead.querySelectorAll('.detail-k')];
    if(ks.length>=6){const wrap=document.createElement('div');wrap.className='detail-summary-v5';wrap.innerHTML=`<div><small>% логістики</small><strong>${ks[4].querySelector('strong')?.textContent||'—'}</strong></div><div><small>Вартість доставки 1 ТТ</small><strong>${ks[5].querySelector('strong')?.textContent||'—'}</strong></div>`;ks[4].remove();ks[5].remove();oldHead.appendChild(wrap)}
  }
  const title=el.querySelector('.points-title');if(title)title.textContent='ТТ / адреси';
  el.querySelectorAll('.point-v3').forEach(x=>x.remove());
  const holder=document.createElement('div');holder.className='tt-list-v5';holder.style.setProperty('--accent',getComputedStyle(el).getPropertyValue('--accent'));
  holder.innerHTML=pts.map((pt,i)=>{
   const l=locMap.get(String(pt.location_id))||{};
   let pdocs=ds.filter(d=>pt.customer_id&&String(d.customer_id)===String(pt.customer_id));
   if(l.address_id)pdocs=pdocs.filter(d=>!d.address_id||String(d.address_id)===String(l.address_id));
   if(!pdocs.length&&l.delivery_address)pdocs=ds.filter(d=>norm(d.delivery_address)===norm(l.delivery_address));
   const docMap=new Map();for(const d of pdocs){const k=String(d.sale_code||d.operation_code||d.id);if(!docMap.has(k))docMap.set(k,d)}pdocs=[...docMap.values()];
   const bus=uniq(pdocs.map(d=>d.business_unit||d.raw_data?.['Бізнес одиниця']));
   const ta=uniq(pdocs.map(d=>d.raw_data?.['Контактна особа відправника']));
   const addr=l.delivery_address||pdocs[0]?.delivery_address||'Адресу не вказано';
   const geo=[l.settlement,l.district,l.region].filter(Boolean).join(' · ');
   return `<article class="tt-v5"><div class="tt-v5-head"><div class="tt-v5-index">${i+1}</div><div class="tt-v5-main"><div class="tt-v5-name">${esc(pt.customer_name||pdocs[0]?.customer_name||'Точка доставки')}</div><div class="tt-v5-address">${esc(addr)}${geo?'<br>'+esc(geo):''}</div><div class="tt-v5-meta"><span class="tt-v5-pill accent">${num(pt.pallets)} пал.</span><span class="tt-v5-pill">${money(pt.order_amount)}</span>${bus.length?`<span class="tt-v5-pill">${esc(bus.join(', '))}</span>`:''}${ta.length?`<span class="tt-v5-pill">ТА: ${esc(ta.join(', '))}</span>`:''}<span class="tt-v5-pill">${pdocs.length} док.</span></div></div><div class="tt-v5-arrow">›</div></div><div class="tt-v5-body">${pdocs.length?pdocs.map(d=>`<div class="doc-v5"><div class="doc-v5-top"><span class="doc-v5-code">${esc(d.sale_code||d.operation_code||'Документ')}</span><span class="doc-v5-sum">${money(d.order_amount)}</span></div><div class="doc-v5-meta">${esc(d.business_unit||'')}${d.pallets!=null?` · ${num(d.pallets)} пал.`:''}</div></div>`).join(''):'<div class="doc-v5-meta">Документи для цієї ТТ не знайдено</div>'}</div></article>`
  }).join('');
  (title||el.querySelector('.detail-in')).after(holder);
  holder.addEventListener('click',e=>{const h=e.target.closest('.tt-v5-head');if(h)h.closest('.tt-v5').classList.toggle('open')});
 }catch(e){console.warn('detail v5',e)}
}
content.addEventListener('click',e=>{const r=e.target.closest('[data-route-id]');if(r)setTimeout(()=>rebuild(r.dataset.routeId),20)});
})();