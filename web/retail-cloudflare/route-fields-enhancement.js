(()=>{
const KEY='tc_retail_routes_v1';
const routes=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
const save=(no,patch)=>localStorage.setItem(KEY,JSON.stringify(routes().map(r=>r.number===no?{...r,...patch}:r)));
const pointKey=row=>row.querySelector('td:nth-child(4)')?.textContent?.trim()||row.querySelector('td:nth-child(2)')?.textContent?.trim()||'';
function installCss(){if(document.getElementById('route-compact-v4'))return;const s=document.createElement('style');s.id='route-compact-v4';s.textContent=`
#ops-documents [data-route] .trip-panel{padding:10px 12px!important;margin:8px 0 10px!important;border-radius:9px!important}
#ops-documents [data-route] .trip-title{margin-bottom:8px!important;gap:8px!important}
#ops-documents [data-route] .trip-icon{width:30px!important;height:30px!important;font-size:14px!important}
#ops-documents [data-route] .trip-title h3{font-size:15px!important}
#ops-documents [data-route] .trip-title p{font-size:10px!important;margin:1px 0 0!important}
#ops-documents [data-route] .trip-fields{grid-template-columns:repeat(5,minmax(145px,1fr))!important;gap:7px 9px!important}
#ops-documents [data-route] .trip-field small{font-size:9px!important;margin-bottom:3px!important}
#ops-documents [data-route] .trip-field input,#ops-documents [data-route] .trip-field select{height:32px!important;padding:0 8px!important;font-size:11px!important;border-radius:6px!important}
#ops-documents [data-route] .vehicle-box{margin-top:8px!important;padding:8px!important;gap:8px!important;grid-template-columns:1fr 220px!important}
#ops-documents [data-route] .vehicle-head{margin-bottom:5px!important;gap:7px!important}
#ops-documents [data-route] .vehicle-head i{width:25px!important;height:25px!important;font-size:12px!important}
#ops-documents [data-route] .vehicle-head b{font-size:12px!important}#ops-documents [data-route] .vehicle-head small{font-size:9px!important}
#ops-documents [data-route] .vehicle-metrics{gap:5px!important}
#ops-documents [data-route] .vehicle-metric{min-height:42px!important;padding:6px!important;border-radius:6px!important}
#ops-documents [data-route] .vehicle-metric small{font-size:8px!important}#ops-documents [data-route] .vehicle-metric b{margin-top:3px!important;font-size:11px!important}
#ops-documents [data-route] .load-status{padding-left:8px!important;font-size:10px!important}#ops-documents [data-route] .load-status b{margin-bottom:4px!important;font-size:10px!important}
#ops-documents [data-route] .load-note{padding:6px!important;font-size:10px!important}
#ops-documents [data-route] .trip-actions{margin-top:7px!important;gap:6px!important}#ops-documents [data-route] .trip-actions button{height:30px!important;padding:0 10px!important;font-size:10px!important;border-radius:6px!important}
.arrival-range{display:flex;align-items:center;gap:4px;min-width:165px}.arrival-range input{width:72px;height:28px;padding:0 3px;background:#111d29;color:#eef4fb;border:1px solid #34485d;border-radius:5px;font-size:10px}
@media(max-width:1300px){#ops-documents [data-route] .trip-fields{grid-template-columns:repeat(3,1fr)!important}}`;
document.head.appendChild(s)}
function enhance(){if(location.hash!=='#routes-page')return;installCss();const host=document.getElementById('ops-documents');if(!host)return;
const title=host.querySelector('.ops-page-title');if(title&&!title.querySelector('[data-empty-route]')){const b=document.createElement('button');b.className='ops-primary';b.dataset.emptyRoute='1';b.textContent='+ Новий маршрут з 0';b.onclick=()=>window.RetailCompleted?.createEmpty();title.appendChild(b)}
host.querySelectorAll('[data-route]').forEach(card=>{const no=card.dataset.route,r=routes().find(x=>x.number===no);if(!r)return;
const grid=card.querySelector('.trip-fields');if(grid&&!grid.querySelector('[data-tariff-wrap]')){const l=document.createElement('label');l.className='trip-field';l.dataset.tariffWrap='1';l.innerHTML=`<small>Тариф за перевезення, грн</small><input type="number" min="0" step="0.01" value="${r.tariff??''}">`;grid.appendChild(l);l.querySelector('input').onchange=e=>save(no,{tariff:e.target.value})}
const table=card.querySelector('.ops-register');if(table&&!table.dataset.arrivalWindows){table.dataset.arrivalWindows='1';const th=document.createElement('th');th.textContent='Розрах. прибуття';table.querySelector('thead tr')?.appendChild(th);table.querySelectorAll('tbody tr').forEach(row=>{const key=pointKey(row),v=(r.arrivalWindows||{})[key]||{},td=document.createElement('td');td.innerHTML=`<div class="arrival-range"><input type="time" value="${v.from||''}" data-from><span>—</span><input type="time" value="${v.to||''}" data-to></div>`;row.appendChild(td);td.querySelectorAll('input').forEach(i=>i.onchange=()=>{const cur=routes().find(x=>x.number===no)||{},aw={...(cur.arrivalWindows||{})};aw[key]={from:td.querySelector('[data-from]').value,to:td.querySelector('[data-to]').value};save(no,{arrivalWindows:aw})})})}
card.querySelectorAll('div').forEach(div=>{if(div.querySelector(':scope > b')?.textContent.trim()==='Карта маршруту')div.remove()})
})}
let queued=false;const run=()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance()})};new MutationObserver(run).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',()=>setTimeout(enhance,50));setTimeout(enhance,150);
})();