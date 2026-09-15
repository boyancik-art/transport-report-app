/* Presentation navigation. Feature workspaces own their active hashes. */
(() => {
  const RESET_TAG='retail_preview_reset_20260915_01';
  if(localStorage.getItem(RESET_TAG)!=='done'){
    ['tc_retail_docs_v2','tc_retail_docs_v3','tc_retail_imports_v1','tc_retail_tickets_v1'].forEach(k=>localStorage.removeItem(k));
    localStorage.setItem(RESET_TAG,'done'); location.reload(); return;
  }
  const v3=localStorage.getItem('tc_retail_docs_v3'),v2=localStorage.getItem('tc_retail_docs_v2');
  if(v3&&v3!==v2&&sessionStorage.getItem('retail_sync_reload')!=='1'){localStorage.setItem('tc_retail_docs_v2',v3);sessionStorage.setItem('retail_sync_reload','1');location.reload();return}
  sessionStorage.removeItem('retail_sync_reload');
  const dashboard=document.querySelector('.dashboard'),ops=()=>document.getElementById('ops-documents'),links=[...document.querySelectorAll('.side nav a')],byText=t=>links.find(a=>a.textContent.trim()===t);
  byText('Консолідація')?.remove();byText('Тарифи')?.remove();
  const mapping={'База Excel':'#base-excel','Маршрути':'#routes-page','Талони комплектації':'#picking-tickets','Журнал ТТН':'#ttn-journal','Магазини WT':'#stores-page','Склади':'#warehouses-page','Перевізники':'#carriers-page','Аналітика':'#analytics-page','Довідники':'#references-page','Користувачі':'#users-page','Налаштування':'#settings-page'};
  Object.entries(mapping).forEach(([t,h])=>{const a=byText(t);if(a)a.href=h});
  const titles={'stores-page':['Магазини WT','Довідник магазинів WineTime'],'warehouses-page':['Склади','Довідник складів та хабів'],'carriers-page':['Перевізники','Довідник перевізників і транспорту'],'analytics-page':['Аналітика','Операційна статистика Retail'],'references-page':['Довідники','Системні довідники Retail'],'users-page':['Користувачі','Керування користувачами та ролями'],'settings-page':['Налаштування','Налаштування модуля Retail']};
  const owned=new Set(['base-excel','routes-page','picking-tickets','ttn-journal','interwarehouse']);
  function active(hash){let done=false;links.forEach(a=>{const m=!done&&a.getAttribute('href')===hash;a.classList.toggle('active',m);if(m)done=true})}
  function dev(key){dashboard?.classList.add('ops-hidden');const h=ops();if(!h)return;h.hidden=false;h.style.display='block';const [t,d]=titles[key]||['Розділ','Функціонал готується'];h.innerHTML=`<div class="ops-page-title"><div><h2>${t}</h2><small>${d}</small></div></div><div style="min-height:520px;display:grid;place-items:center"><div style="text-align:center"><h2>Розділ у розробці</h2></div></div>`}
  function navigate(){const key=location.hash.slice(1)||'home';if(key==='home'){const h=ops();if(h){h.hidden=true;h.style.display='none'}dashboard?.classList.remove('ops-hidden');active('#home');return}if(owned.has(key)){dashboard?.classList.add('ops-hidden');const h=ops();if(h){h.hidden=false;h.style.display='block'}active(key==='interwarehouse'?'#routes-page':'#'+key);return}if(titles[key]){dev(key);active('#'+key);return}location.hash='home'}
  window.addEventListener('hashchange',()=>setTimeout(navigate,0));setTimeout(navigate,0);
})();