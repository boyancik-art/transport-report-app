/* Presentation navigation. operations.js owns the active Base Excel/import workflow. */
(() => {
  const dashboard=document.querySelector('.dashboard');
  const ops=()=>document.getElementById('ops-documents');
  const links=[...document.querySelectorAll('.side nav a')];

  // Final agreed menu structure for the current stage.
  const byText=t=>links.find(a=>a.textContent.trim()===t);
  byText('Консолідація')?.remove();
  byText('Тарифи')?.remove();
  const inbound=byText('База Excel')||byText('Вхідні вантажі');
  if(inbound){inbound.querySelector('span').textContent='База Excel';inbound.href='#base-excel';}
  const ttn=byText('ТТН'); if(ttn){ttn.querySelector('span').textContent='Журнал ТТН';ttn.href='#ttn-journal';}
  const routes=byText('Маршрути'); if(routes)routes.href='#routes-page';
  const tickets=byText('Талони комплектації'); if(tickets)tickets.href='#picking-tickets';
  const stores=byText('Магазини WT'); if(stores)stores.href='#stores-page';
  const warehouses=byText('Склади'); if(warehouses)warehouses.href='#warehouses-page';
  const carriers=byText('Перевізники'); if(carriers)carriers.href='#carriers-page';
  const analytics=byText('Аналітика'); if(analytics)analytics.href='#analytics-page';
  const refs=byText('Довідники'); if(refs)refs.href='#references-page';
  const users=byText('Користувачі'); if(users)users.href='#users-page';
  const settings=byText('Налаштування'); if(settings)settings.href='#settings-page';

  const titles={
    'routes-page':['Маршрути','Формування, планування та контроль маршрутів'],
    'picking-tickets':['Талони комплектації','Передача документів на комплектацію та контроль фактичних палет'],
    'ttn-journal':['Журнал ТТН','Реєстр сформованих товарно-транспортних накладних'],
    'stores-page':['Магазини WT','Довідник магазинів WineTime'],
    'warehouses-page':['Склади','Довідник складів та хабів'],
    'carriers-page':['Перевізники','Довідник перевізників і транспорту'],
    'analytics-page':['Аналітика','Операційна статистика Retail'],
    'references-page':['Довідники','Системні довідники Retail'],
    'users-page':['Користувачі','Керування користувачами та ролями'],
    'settings-page':['Налаштування','Налаштування модуля Retail']
  };

  function setActive(hash){
    let done=false;
    document.querySelectorAll('.side nav a').forEach(a=>{
      const match=!done&&a.getAttribute('href')===hash;
      a.classList.toggle('active',match); if(match)done=true;
    });
  }
  function showDevelopment(key){
    dashboard?.classList.add('ops-hidden');
    const h=ops(); if(!h)return;
    h.hidden=false; h.style.display='block';
    const [title,desc]=titles[key]||['Розділ','Функціонал готується'];
    h.innerHTML=`<div class="ops-page-title"><div><h2>${title}</h2><small>${desc}</small></div></div><div style="min-height:520px;display:grid;place-items:center;padding:40px"><div style="text-align:center;max-width:520px"><div style="font-size:42px;margin-bottom:14px">⚙</div><h2 style="margin:0 0 10px">Розділ у розробці</h2><p style="margin:0;color:#929aa5;line-height:1.6">Функціонал цього розділу ще не активований. Він буде підключений окремо — без перенаправлення в інші блоки.</p></div></div>`;
  }
  function navigate(){
    const key=location.hash.slice(1)||'home';
    if(key==='home'){
      const h=ops(); if(h){h.hidden=true;h.style.display='none';}
      dashboard?.classList.remove('ops-hidden'); if(dashboard)dashboard.hidden=false;
      setActive('#home'); return;
    }
    if(key==='base-excel'){
      // operations.js renders the real Base Excel screen. Do not hide/overwrite it here.
      dashboard?.classList.add('ops-hidden');
      const h=ops(); if(h){h.hidden=false;h.style.display='block';}
      setActive('#base-excel'); return;
    }
    if(titles[key]){showDevelopment(key);setActive('#'+key);return;}
    // Unknown anchors from dashboard cards stay on Home instead of jumping to arbitrary sections.
    location.hash='home';
  }

  document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('[data-filter]').forEach(t=>t.classList.toggle('on',t===b));
    document.querySelectorAll('.routes tbody tr').forEach(r=>{r.hidden=b.dataset.filter!=='all'&&r.dataset.type!==b.dataset.filter;});
  }));
  window.addEventListener('hashchange',()=>setTimeout(navigate,0));
  setTimeout(navigate,0);
})();
