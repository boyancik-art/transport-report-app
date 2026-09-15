(()=>{
const KEYS={
'base-excel':['tc_retail_docs_v2','tc_retail_docs_v3','tc_retail_imports_v1'],
'picking-tickets':['tc_retail_tickets_v1'],
'completed':['tc_retail_tickets_v1'],
'routes-page':['tc_retail_routes_v1'],
'interwarehouse':['tc_retail_interwarehouse_v1'],
'ttn-journal':['tc_retail_ttn_journal_v1']};
const labels={'base-excel':'базу Excel','picking-tickets':'талони комплектації','completed':'блок «Скомплектовано»','routes-page':'маршрути','interwarehouse':'міжскладські рейси','ttn-journal':'журнал ТТН'};
function run(){const key=location.hash.slice(1);if(!KEYS[key])return;const h=document.getElementById('ops-documents');if(!h)return;const head=h.querySelector('.ops-page-title');if(!head||head.querySelector('[data-clear-block]'))return;const b=document.createElement('button');b.dataset.clearBlock='1';b.textContent='Очистити блок';b.title='Очищає лише локальні тестові дані цього блоку. У базу даних нічого не записується.';b.style.cssText='opacity:.72;margin-left:8px';b.onclick=()=>{if(!confirm(`Очистити ${labels[key]}? Це видалить лише локальні тестові дані браузера, без збереження в базі.`))return;KEYS[key].forEach(k=>localStorage.removeItem(k));location.reload()};head.appendChild(b)}
new MutationObserver(()=>setTimeout(run,20)).observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',()=>setTimeout(run,80));setTimeout(run,300);
})();