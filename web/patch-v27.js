(()=>{
const css=document.createElement('style');css.textContent=`
html[data-tr-theme="dark"] .tt-metric{background:linear-gradient(150deg,#202631,#191e27)!important;border:1px solid #2e3541!important;color:#f5f2ee!important;box-shadow:none!important}
html[data-tr-theme="dark"] .tt-metric span{color:#9299a7!important}
html[data-tr-theme="dark"] .tt-metric b{color:#f7f3ef!important}
html[data-tr-theme="dark"] .tt-card{background:linear-gradient(155deg,rgba(26,31,40,.98),rgba(18,22,29,.98))!important;border-color:#303642!important;color:#f5f2ee!important}
html[data-tr-theme="dark"] .tt-name{color:#f7f3ef!important}
html[data-tr-theme="dark"] .tt-address{color:#9aa1ad!important}
html[data-tr-theme="dark"] .tt-business{background:#351923!important;color:#efb1bd!important}
`;
document.head.appendChild(css);

function resolveRouteId(card){
 if(!card)return null;
 const d=Number(card.dataset.routeId||0);if(d)return d;
 const a=card.getAttribute('onclick')||'';const m=a.match(/routeCard\((\d+)\)/);if(m)return Number(m[1]);
 const t=card.querySelector('.route-id')?.textContent||'';const q=t.match(/(\d{8,})/);if(!q)return null;
 const r=(D.routes||[]).find(x=>String(x.route_delivery_id)===q[1]);return r?Number(r.id):null;
}
function stampRouteIds(){document.querySelectorAll('.route-card-v19').forEach(card=>{const id=resolveRouteId(card);if(id)card.dataset.routeId=String(id)})}

document.addEventListener('click',e=>{
 const card=e.target.closest('.route-card-v19');
 if(!card||page!=='logistics')return;
 if(e.target.closest('.route-select,input,button,select,a,label'))return;
 const id=resolveRouteId(card);if(!id)return;
 e.preventDefault();e.stopImmediatePropagation();
 try{routeCard(id)}catch(err){console.error('routeCard failed',err);alert('Не вдалося відкрити маршрут: '+err.message)}
},true);

const oldLogistics27=logistics;
logistics=function(){const out=oldLogistics27();stampRouteIds();setTimeout(stampRouteIds,0);return out};
const oldGo27=go;
go=function(...args){const out=oldGo27(...args);setTimeout(()=>{if(page==='logistics')stampRouteIds()},0);return out};
setTimeout(()=>{if(page==='logistics')stampRouteIds()},0);
})();