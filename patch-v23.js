(()=>{
const css=`
:root{--premium-ink:#17191f;--premium-muted:#747985;--premium-surface:#ffffff;--premium-soft:#f5f3f1;--premium-line:#e7e3df;--premium-accent:#8f1f32;--premium-accent-dark:#681522}
body{background:radial-gradient(circle at 50% -10%,#ffffff 0,#f5f4f2 28%,#eef0f3 68%,#e9ecef 100%)!important;color:var(--premium-ink)!important}
.top{background:linear-gradient(145deg,#111318 0%,#20242b 60%,#35171f 100%)!important;border-bottom:1px solid #ffffff12!important;box-shadow:0 12px 38px #1113182a!important}
.wrap{position:relative!important}
.filters{margin-bottom:18px!important}.data-controls select,.data-controls input{border:1px solid #dedbd7!important;background:#fffffffa!important;border-radius:16px!important;box-shadow:0 10px 30px #2026310a!important;padding:12px 14px!important}.data-controls .btn{border-radius:16px!important;box-shadow:0 10px 24px #8f1f3220!important}
.route-card-v19,.route-detail-head,.fact-editor,.address-card,.tt-card,.cost-card,.day-card,.card{border:1px solid rgba(219,216,212,.88)!important;background:linear-gradient(160deg,rgba(255,255,255,.99),rgba(250,249,247,.98))!important;box-shadow:0 18px 50px rgba(34,40,50,.09),0 3px 10px rgba(34,40,50,.04)!important}
.route-card-v19{border-radius:22px!important;padding:17px!important;overflow:hidden!important;position:relative!important}.route-card-v19:before{content:'';position:absolute;inset:0 auto 0 0;width:4px;background:linear-gradient(180deg,var(--premium-accent),#c15b6a 48%,#d7b6ad);opacity:.95}.route-card-v19 .route-id{font-size:18px!important;letter-spacing:-.25px!important}.route-card-v19 .tag{border-radius:999px!important;padding:7px 10px!important;background:#f4e9eb!important;color:var(--premium-accent-dark)!important}
.route-summary{gap:9px!important;margin-top:14px!important}.mini-stat{background:linear-gradient(155deg,#f6f5f3,#f1f2f4)!important;border:1px solid #ebe8e4!important;border-radius:14px!important;padding:10px!important}.mini-stat span{font-size:9px!important;letter-spacing:.15px!important;text-transform:none!important}.mini-stat b{font-size:13px!important;margin-top:4px!important}
.fact-editor{border-radius:22px!important;padding:17px!important}.fact-editor h2{margin-top:0!important;font-size:20px!important}.fact-row select,.fact-row input{border-radius:13px!important;border:1px solid #dedbd7!important;background:#fff!important;padding:12px!important}.add-mini{border-radius:13px!important;border-color:#dedbd7!important}.fact-actions .btn{border-radius:14px!important;padding:12px 16px!important}
.address-card{border-radius:20px!important;padding:16px!important;position:relative!important}.address-card:after{content:'';position:absolute;left:16px;right:16px;bottom:-1px;height:1px;background:linear-gradient(90deg,transparent,#d9d5d1,transparent)}.address-name{font-size:16px!important;letter-spacing:-.1px}.address-text{font-size:12px!important;color:#737985!important}.tt-info-row{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.tt-info-pill{display:inline-flex;align-items:center;min-height:28px;padding:6px 9px;border-radius:999px;font-size:10px;font-weight:900;background:#f4e9eb;color:#7e1a2a}.tt-info-pill.business-unit{background:#eceff3;color:#343941}
.doc-mini{background:#f4f5f7!important;border:1px solid #ebecef!important;border-radius:14px!important;padding:11px!important}.doc-mini+.doc-mini{margin-top:2px!important}
.bottom{background:rgba(255,255,255,.96)!important;backdrop-filter:blur(18px)!important;border-top:1px solid #ddd9d5!important;box-shadow:0 -10px 30px #1c222c0c!important}.bottom button{background:transparent!important}
@media(max-width:560px){.route-card-v19,.fact-editor,.address-card{border-radius:18px!important}.route-card-v19{padding:15px!important}.address-card{padding:14px!important}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

function docsForRouteId(routeId){const r=(D.routes||[]).find(x=>Number(x.id)===Number(routeId));if(!r)return[];return (D.docs||[]).filter(d=>String(d.route_delivery_id)===String(r.route_delivery_id))}
function norm(s){return String(s||'').trim().replace(/\s+/g,' ').toLowerCase()}
function unique(a){return [...new Set(a.filter(Boolean).map(x=>String(x).trim()).filter(Boolean))]}
function addressDocs(routeId,address){const all=docsForRouteId(routeId),n=norm(address);if(!n)return[];let found=all.filter(d=>norm(d.delivery_address)===n);if(found.length)return found;return all.filter(d=>norm(d.delivery_address).includes(n)||n.includes(norm(d.delivery_address))) }
function taValues(ds){return unique(ds.map(d=>d.raw_data?.['Контактна особа відправника']))}
function buValues(ds){return unique(ds.map(d=>d.business_unit||d.raw_data?.['Бізнес одиниця']))}
function removeRouteTA(root){
 root.querySelectorAll('.mini-stat').forEach(x=>{const l=norm(x.querySelector('span')?.textContent);if(l==='та')x.remove()});
 root.querySelectorAll('.fact-field').forEach(x=>{const l=norm(x.querySelector('label')?.textContent);if(l.startsWith('та'))x.remove()});
}
function enrichTT(root,routeId){
 root.querySelectorAll('.address-card').forEach(card=>{
  card.querySelectorAll('.tt-business').forEach(x=>x.remove());
  const address=card.querySelector('.address-text')?.textContent||'';
  const ds=addressDocs(routeId,address);
  const tas=taValues(ds),bus=buValues(ds);
  let row=card.querySelector('.tt-info-row');if(row)row.remove();
  row=document.createElement('div');row.className='tt-info-row';
  if(bus.length){const b=document.createElement('span');b.className='tt-info-pill business-unit';b.textContent='Бізнес одиниця: '+bus.join(', ');row.appendChild(b)}
  if(tas.length){const t=document.createElement('span');t.className='tt-info-pill';t.textContent='ТА: '+tas.join(', ');row.appendChild(t)}
  const addr=card.querySelector('.address-text');if(row.children.length)(addr||card.firstElementChild)?.after(row);
 });
 root.querySelectorAll('.doc-mini-meta').forEach(meta=>{meta.innerHTML=meta.innerHTML.replace(/\bБізнес\s*:/gi,'Бізнес одиниця:')});
}
const oldRouteCard=routeCard;
routeCard=function(id){const out=oldRouteCard(id);removeRouteTA(view);enrichTT(view,id);return out};

const oldLogistics=logistics;
logistics=function(){const out=oldLogistics();document.querySelectorAll('.route-card-v19').forEach(removeRouteTA);return out};

setTimeout(()=>{if(page==='logistics')document.querySelectorAll('.route-card-v19').forEach(removeRouteTA)},0);
})();