(()=>{
const P=n=>new Intl.NumberFormat('uk-UA',{minimumFractionDigits:0,maximumFractionDigits:3}).format(+n||0);
const css=`
.tt-route{margin-top:12px}.tt-route-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:8px}.tt-list{display:grid;gap:8px}.tt-card{background:#fff;border:1px solid var(--line);border-radius:15px;padding:13px;box-shadow:0 4px 14px #00000008;cursor:pointer}.tt-name{font-size:16px;font-weight:900;line-height:1.25}.tt-address{font-size:12px;color:var(--muted);margin-top:5px;line-height:1.35}.tt-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:10px}.tt-stat{background:#f7f8fa;border-radius:10px;padding:8px;min-width:0}.tt-stat span{display:block;color:var(--muted);font-size:9px;font-weight:700;margin-bottom:3px}.tt-stat b{font-size:12px;word-break:break-word}.doc-list{display:grid;gap:8px}.doc-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:12px}.doc-top{display:flex;justify-content:space-between;gap:10px}.day-card .pal-main{display:block;font-size:16px;font-weight:900;margin-top:1px;color:var(--ink)}
@media(max-width:650px){.tt-grid{grid-template-columns:1fr 1fr}.tt-route-head{display:block}.tt-route-head .tag{display:inline-block;margin-top:6px}.tt-card,.doc-card{padding:12px}.tt-name{font-size:15px}}
`;
let st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

function uniqueDocsForPoint(x){
 const r=D.routes.find(z=>z.id===x.route_id);
 const raw=D.docs.filter(d=>String(d.route_delivery_id)===String(r?.route_delivery_id)&&(!x.customer_id||String(d.customer_id)===String(x.customer_id)));
 const m=new Map();
 for(const d of raw){const key=String(d.sale_code||d.operation_code||d.id)+'|'+String(d.customer_id||'');if(!m.has(key))m.set(key,d)}
 return [...m.values()];
}
function pointAddress(x){return uniqueDocsForPoint(x).find(d=>d.delivery_address)?.delivery_address||'Адреса не вказана'}
function pointMeta(x){let a=D.alloc.filter(z=>z.route_point_id===x.id);return{bu:[...new Set(a.map(z=>business(z.business_unit)).filter(Boolean))].join(', '),em:[...new Set(a.map(z=>z.employee_id).filter(Boolean))].join(', ')}}

showTT=function(filterIds=null){
 let points=filterIds?D.points.filter(x=>filterIds.includes(x.route_id)):D.points;
 let routeIds=[...new Set(points.map(x=>x.route_id))];
 let groups=routeIds.map(rid=>{let r=D.routes.find(z=>z.id===rid),pp=points.filter(x=>x.route_id===rid),pal=pp.reduce((s,x)=>s+(+x.pallets||0),0),sales=pp.reduce((s,x)=>s+(+x.order_amount||0),0);let cards=pp.map(x=>{let m=pointMeta(x),dc=uniqueDocsForPoint(x).length;return `<div class="tt-card" onclick="pointCard(${x.id})"><div class="tt-name">${E(x.customer_name||'—')}</div><div class="tt-address">${E(pointAddress(x))}</div><div class="tt-grid"><div class="tt-stat"><span>Палети</span><b>${P(x.pallets)}</b></div><div class="tt-stat"><span>Вага</span><b>${P(x.weight)} кг</b></div><div class="tt-stat"><span>Продажі</span><b>${M(x.order_amount)}</b></div><div class="tt-stat"><span>Документи</span><b>${dc}</b></div><div class="tt-stat"><span>Бізнес</span><b>${E(m.bu||'—')}</b></div><div class="tt-stat"><span>ТП / EmployeeID</span><b>${E(m.em||'—')}</b></div></div></div>`}).join('');return `<div class="tt-route"><div class="tt-route-head"><div><div class="route-id">Маршрут ${E(r?.route_delivery_id||rid)}</div><div class="note">${E(r?.expeditor_name||'—')} · ${E(r?.warehouse||'—')}</div></div><span class="tag">${pp.length} ТТ · ${P(pal)} пал. · ${M(sales)}</span></div><div class="tt-list">${cards}</div></div>`}).join('');
 view.innerHTML=`<button class="btn back" onclick="go('home')">← Назад</button><div class="head"><div><h2>Торгові точки · ${points.length}</h2><div class="note">Згруповано по маршрутах · без горизонтального прокручування</div></div></div>${groups||'<div class="card box">Немає ТТ</div>'}`;
};

pointCard=function(id){
 let x=D.points.find(z=>z.id===id);if(!x)return;let r=D.routes.find(z=>z.id===x.route_id),docs=uniqueDocsForPoint(x),m=pointMeta(x);
 let docsHtml=docs.map(d=>`<div class="doc-card"><div class="doc-top"><div><div class="label">${E(d.document_date||'')}</div><b>${E(d.sale_code||d.operation_code||'—')}</b></div><b>${M(d.order_amount)}</b></div><div class="tt-address">${E(d.delivery_address||'—')}</div><div class="tt-grid"><div class="tt-stat"><span>Бізнес</span><b>${E(business(d.business_unit)||'—')}</b></div><div class="tt-stat"><span>EmployeeID</span><b>${E(d.employee_id||'—')}</b></div><div class="tt-stat"><span>Палети</span><b>${P(d.pallets)}</b></div><div class="tt-stat"><span>Вага</span><b>${P(d.weight)} кг</b></div></div></div>`).join('');
 view.innerHTML=`<button class="btn back" onclick="showTT()">← ТТ</button><div class="route-card section"><div class="label">Торгова точка</div><h2 style="margin-bottom:6px">${E(x.customer_name||'—')}</h2><div class="tt-address">${E(pointAddress(x))}</div><div class="note" style="margin-top:7px">Маршрут <b>${E(r?.route_delivery_id||'—')}</b> · ${E(r?.warehouse||'—')}</div><div class="tt-grid"><div class="tt-stat"><span>Палети</span><b>${P(x.pallets)}</b></div><div class="tt-stat"><span>Вага</span><b>${P(x.weight)} кг</b></div><div class="tt-stat"><span>Продажі</span><b>${M(x.order_amount)}</b></div><div class="tt-stat"><span>Документи</span><b>${docs.length}</b></div><div class="tt-stat"><span>Бізнес</span><b>${E(m.bu||'—')}</b></div><div class="tt-stat"><span>ТП / EmployeeID</span><b>${E(m.em||'—')}</b></div></div></div><h3>Документи · ${docs.length}</h3><div class="doc-list">${docsHtml||'<div class="card box">Документів не знайдено</div>'}</div>`;
};

const homeV15=home;
home=function(){
 homeV15();
 let byDay={};D.weekRoutes.forEach(r=>{let z=byDay[r.route_date]||(byDay[r.route_date]={routes:0,tt:0,pal:0});z.routes++;z.tt+=+r.total_points||0;z.pal+=+r.total_pallets||0});
 let cards=document.querySelectorAll('.week-strip .day-card');let vals=Object.values(byDay);cards.forEach((el,i)=>{let x=vals[i];if(!x)return;let spans=el.querySelectorAll('span');let b=el.querySelector('b');if(b)b.textContent=x.tt+' ТТ';let pal=document.createElement('strong');pal.className='pal-main';pal.textContent=P(x.pal)+' пал.';if(b)b.after(pal);if(spans[1])spans[1].textContent=x.routes+' маршрутів'});
};

const logisticsV15=logistics;
logistics=function(){logisticsV15();document.querySelectorAll('.route-stat').forEach(s=>{let label=s.querySelector('span')?.textContent;if(label==='Палети'){let rid=s.closest('.route-card')?.getAttribute('onclick')?.match(/\d+/)?.[0],pp=D.points.filter(x=>x.route_id==rid);let b=s.querySelector('b');if(b)b.textContent=P(pp.reduce((a,x)=>a+(+x.pallets||0),0))}})};
})();