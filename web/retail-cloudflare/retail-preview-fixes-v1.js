(() => {
  'use strict';
  const STORE_KEY='tc_retail_stores_directory_v1', WH_KEY='tc_retail_warehouses_v1', DOCS='tc_retail_docs_v3', TICKETS='tc_retail_tickets_v1';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=s=>String(s??'').toLowerCase().replace(/ё/g,'е').replace(/[’']/g,"'").replace(/\s+/g,' ').trim();

  // Canonical WT directory supplied by Transport. Exactly 38 stores; no startup repair scripts.
  const CANONICAL=[
    ['Склад №1 магазин   РІВНЕ №1','33028, м. Рівне, вул. Міцкевича, буд. 32',['рівне №1','рівне 1']],
    ['Склад №1 магазин РІВНЕ №2','33028, м. Рівне, вул. Щаслива, буд. 1',['рівне №2','рівне 2']],
    ['Склад №1 магазин ЛУЦЬК','43025, м. Луцьк, вул. Градний Узвіз, буд. 2',['луцьк']],
    ['Склад №1 магазин Львів, вул. Княгині   Ольги, 100a','79053, м. Львів, вул. Княгині Ольги, буд. 100К',['княгині ольги']],
    ['Склад №1 магазин ЛЬВІВ',"79019, м. Львів, просп. В'ячеслава Чорновола, буд. 45",['львів','чорновола']],
    ['Склад №1 магазин м.УЖГОРОД','88000, м. Ужгород, вул. Собранецька, буд. 26',['ужгород']],
    ['Склад №1 магазин Івано-Франківськ,   Бульвар Південний, 25','76018, м. Івано-Франківськ, бульв. Південний, буд. 27Б',['івано-франківськ','бульвар південний','південний']],
    ['Склад №1 магазин Крихівці   Івано-Франківськ','76493, с. Крихівці, вул. Слобідська, буд. 2, прим. 266',['крихівці']],
    ['Склад №1 магазин ЧЕРНІВЦІ №2','58001, м. Чернівці, вул. Головна, буд. 37',['чернівці','головна, 37','головна,37']],
    ['Склад №1 магазин ТЕРНОПІЛЬ','46003, м. Тернопіль, вул. Соломії Крушельницької, буд. 51',['тернопіль']],
    ['Склад №1 магазин ХМЕЛЬНИЦЬКИЙ','29005, м. Хмельницький, вул. Проскурівська, буд. 16',['хмельницьк']],
    ['Склад №1 магазин ВІННИЦЯ №1','21005, м. Вінниця, вул. Зодчих, буд. 5',['вінниця №1','зодчих']],
    ['Склад №1 магазин ВІННИЦЯ №2','21027, м. Вінниця, просп. Космонавтів, буд. 40',['вінниця №2','космонавтів']],
    ['Склад №1 магазин Дніпро №3, пр.   Д.Яворницького, 77','49000, м. Дніпро, просп. Дмитра Яворницького, буд. 77',['яворницького']],
    ['Склад №1 магазин Дніпро №1 пр. О.Поля, 59','49031, м. Дніпро, просп. Олександра Поля, буд. 59',['о.поля','поля, 59','поля,59']],
    ['Склад №1 магазин ПОЛТАВА №2, Стрітенська,   22','36000, м. Полтава, вул. Стрітенська, буд. 22',['полтава','стрітенська']],
    ['Склад №1 магазин Кременчук, Соборна,   34/32','39600, м. Кременчук, вул. Соборна, буд. 34/32',['кременчук']],
    ['Склад №1 магазин м.ЧЕРКАСИ,   Грушевського,110','18001, м. Черкаси, вул. Михайла Грушевського, буд. 110',['черкаси']],
    ['Склад №1 магазин Чернігів, Київська,11','14000, м. Чернігів, вул. Київська, буд. 11',['чернігів']],
    ['Склад №1 магазин Стоянка','08169, с. Стоянка, вул. Меліораторів, буд. 1/3',['стоянка']],
    ['Склад №1 магазин КИЇВ, Палладіна, 59Б','03164, м. Київ, просп. Академіка Палладіна, буд. 59Б',['палладіна']],
    ['Склад №1 магазин КИЇВ, Соф. Борщагівка,   вул. Молодіжна, 3, прим.128','08131, с. Софіївська Борщагівка, вул. Молодіжна, буд. 3, прим. 128',['молодіжна']],
    ['Склад №1 магазин КИЇВ, Соф. Борщагівка,   вул. Ак. Шалімова, 69 №95','08131, с. Софіївська Борщагівка, вул. Академіка Шалімова, буд. 69, прим. 95',['шалімова']],
    ['Склад №1 магазин КИЇВ, Соборний,7Б','02160, м. Київ, просп. Соборності, буд. 7Б',['соборний','соборності']],
    ['Склад №1 магазин КИЇВ, Бажана, 1Е','02068, м. Київ, просп. Миколи Бажана, буд. 1Е',['бажана']],
    ['Склад №1 магазин КИЇВ, Ю. Здановської, 48   А','03191, м. Київ, вул. Юлії Здановської, буд. 48А',['здановської','ломоносова']],
    ['Склад №1 магазин КИЇВ, Голосіївська, 13','03039, м. Київ, вул. Голосіївська, буд. 13',['голосіївська']],
    ['Склад №1 магазин КОЗИН №2,   Партизанська,2Б','08711, смт Козин, вул. Партизанська, буд. 2Б',['козин','партизанська']],
    ['Склад №1 магазин КИЇВ, Дж.Маккейна,1','01042, м. Київ, вул. Джона Маккейна, буд. 1',['маккейна']],
    ['Склад №1 магазин КИЇВ, А.Верхогляда, 9а','01103, м. Київ, вул. Андрія Верхогляда, буд. 9А',['верхогляда']],
    ['Склад №1 магазин КИЇВ, Філатова,2/1','01042, м. Київ, вул. Академіка Філатова, буд. 2/1',['філатова']],
    ['Склад №1 магазин КИЇВ, вул. Дмитрівська,   62/20','01054, м. Київ, вул. Дмитрівська, буд. 62/20',['дмитрівська']],
    ['Склад №1 магазин КИЇВ, Вишгородська,45','04114, м. Київ, вул. Вишгородська, буд. 45',['вишгородська']],
    ['Склад №1 магазин КИЇВ, Мокра, 18 А','03049, м. Київ, вул. Мокра, буд. 18А',['мокра','кудряшова']],
    ['Склад №1 магазин КИЇВ, Верхній Вал, 16/4','04071, м. Київ, вул. Верхній Вал, буд. 16/4',['верхній вал']],
    ['Склад №1 магазин КИЇВ, Ярославів Вал, 37','01054, м. Київ, вул. Ярославів Вал, буд. 37',['ярославів вал']],
    ['Склад №1 магазин КИЇВ, Велика   Васильківська,100','03150, м. Київ, вул. Велика Васильківська, буд. 100',['велика васильківська']],
    ['Склад №1 магазин КИЇВ, вул. Олени Теліги,   14','04112, м. Київ, вул. Олени Теліги, буд. 14',['олени теліги','теліги','tb київ №1']]
  ];
  const canonicalRecord=([name,address,aliases])=>({name,address,category:'WT',contacts:[],aliases});
  const canonicalStores=CANONICAL.map(canonicalRecord);
  function matchCanonical(raw){const q=norm(raw); if(!q)return null; return canonicalStores.find(s=>norm(s.name)===q||s.aliases.some(a=>q.includes(norm(a))))||null;}

  // Preserve contacts from any matching legacy records, but never let a stale 1-record list hide the canonical catalogue.
  if(window.RetailDirectories){
    const oldStores=window.RetailDirectories.stores.bind(window.RetailDirectories);
    window.RetailDirectories.stores=()=>{
      let legacy=[]; try{legacy=oldStores()||[]}catch(_){legacy=[]}
      return canonicalStores.map(s=>{const hit=legacy.find(x=>matchCanonical(x.name||x.address)?.name===s.name);return {...clone(s),contacts:clone(hit?.contacts||[])};});
    };
  }

  function canonicalizeDoc(d){
    if(!d||typeof d!=='object')return d;
    const hit=matchCanonical(d.receiverWarehouse)||matchCanonical(d.store)||matchCanonical(d.storeAddress);
    if(!hit)return d;
    return {...d,store:hit.name,storeAddress:hit.address};
  }
  function normalizePayload(k,v){return k===DOCS&&Array.isArray(v)?v.map(canonicalizeDoc):v;}
  if(window.RetailState){
    const ow=RetailState.write.bind(RetailState); RetailState.write=(k,v)=>ow(k,normalizePayload(k,v));
    if(typeof RetailState.commit==='function'){
      const oc=RetailState.commit.bind(RetailState); RetailState.commit=obj=>{const next={...obj}; if(Array.isArray(next[DOCS]))next[DOCS]=next[DOCS].map(canonicalizeDoc); return oc(next);};
    }
  }

  function tickets(){try{return RetailState.read(TICKETS,[])||[]}catch(_){return[]}}
  function saveTickets(a){RetailState.write(TICKETS,a)}
  function updateTicket(no,patch){const a=tickets();const i=a.findIndex(t=>String(t.number)===String(no));if(i<0)return null;a[i]={...a[i],...patch};saveTickets(a);return a[i]}
  function ticketNoFromOpen(){const h=document.querySelector('#ops-documents h2');return h&&/^Талон комплектації /.test(h.textContent)?h.textContent.replace('Талон комплектації ','').trim():null}

  // Print status changes only on actual PDF print action. Opening a ticket does not count.
  document.addEventListener('click',e=>{
    const pdf=e.target.closest?.('[data-pdf]'); if(pdf){const no=ticketNoFromOpen();if(no)updateTicket(no,{printStatus:'printed',pickingStatus:'picking',status:'В підборі',printedAt:new Date().toISOString()});}
  },true);
  // Editing fact/pallets must not auto-complete the ticket; completion is explicit through the finish buttons.
  document.addEventListener('input',e=>{
    if(!e.target.matches?.('#ops-documents [data-ap],#ops-documents .ops-fact'))return;
    queueMicrotask(()=>{const no=ticketNoFromOpen();const t=tickets().find(x=>String(x.number)===String(no));if(t&&t.pickingStatus!=='completed')updateTicket(no,{pickingStatus:t.printStatus==='printed'?'picking':'waiting',status:t.printStatus==='printed'?'В підборі':'Очікує'});});
  });

  // Enrich the existing completion implementation without duplicating ticket identity.
  if(window.RetailPickingEnhancements){
    const oldEnhance=RetailPickingEnhancements.enhance.bind(RetailPickingEnhancements);
    RetailPickingEnhancements.enhance=()=>{
      oldEnhance(); const no=ticketNoFromOpen(); if(!no)return; const t=tickets().find(x=>String(x.number)===String(no)); const host=document.getElementById('ops-documents'); const bar=host?.querySelector('.ops-toolbar'); if(!t||!bar)return;
      if(!bar.querySelector('[data-life]'))bar.insertAdjacentHTML('afterbegin',`<span data-life style="padding:7px 10px;border:1px solid #34404d;border-radius:7px;font-size:11px">Друк: <b>${t.printStatus==='printed'?'Так':'Ні'}</b> · Документ: <b>${esc(t.pickingStatus==='completed'?'Скомплектовано':t.printStatus==='printed'?'В підборі':'Очікує')}</b></span>`);
      ['completeOk','completeChanged'].forEach(k=>{const b=bar.querySelector(`[data-${k==='completeOk'?'complete-ok':'complete-changed'}]`);if(b&&!b.dataset.lifeWrapped){b.dataset.lifeWrapped='1';b.addEventListener('click',()=>queueMicrotask(()=>{const latest=tickets().find(x=>String(x.number)===String(no));if(latest&&latest.status==='Скомплектовано')updateTicket(no,{pickingStatus:'completed',completionResult:k==='completeOk'?'unchanged':'changed',status:'Скомплектовано'});}));}});
    };
  }

  function patchPickingList(){
    if(location.hash!=='#picking-tickets')return; const host=document.getElementById('ops-documents');const table=host?.querySelector('table.ops-register');if(!table||ticketNoFromOpen())return;
    const rows=[...table.querySelectorAll('tbody tr')], map=new Map(tickets().map(t=>[String(t.number),t]));
    rows.forEach(r=>{const no=r.querySelector('[data-open]')?.dataset.open,t=map.get(String(no));if(!t)return;if(t.status==='Скомплектовано'||t.pickingStatus==='completed'){r.remove();return;}const cells=r.children; if(cells.length){const status=cells[cells.length-1];status.textContent=t.printStatus==='printed'?'В підборі':'Очікує';const p=document.createElement('td');p.textContent=t.printStatus==='printed'?'Так':'Ні';r.insertBefore(p,status);}});
    const hr=table.querySelector('thead tr');if(hr&&!hr.querySelector('[data-print-head]')){const th=document.createElement('th');th.dataset.printHead='1';th.textContent='Статус друку';hr.insertBefore(th,hr.lastElementChild);hr.lastElementChild.textContent='Статус документа';}
  }
  function patchCompleted(){
    if(location.hash!=='#completed')return; const table=document.querySelector('#ops-documents table.ops-register');if(!table)return;const map=new Map(tickets().map(t=>[String(t.number),t]));
    const hr=table.querySelector('thead tr');if(hr&&!hr.querySelector('[data-result-head]')){['Статус друку','Результат'].forEach((x,i)=>{const th=document.createElement('th');if(i)th.dataset.resultHead='1';th.textContent=x;hr.appendChild(th)});}
    table.querySelectorAll('tbody tr').forEach(r=>{if(r.dataset.lifePatched)return;const no=r.querySelector('button')?.textContent?.trim()||r.cells[0]?.textContent?.trim(),t=map.get(String(no));if(!t)return;r.dataset.lifePatched='1';r.insertAdjacentHTML('beforeend',`<td>${t.printStatus==='printed'?'Так':'Ні'}</td><td>${t.completionResult==='changed'||t.completionMode==='changed'?'Зібрано зі змінами':'Зібрано без змін'}</td>`);});
  }
  function patchWarehouseEdit(){
    if(location.hash!=='#warehouses-page')return;const host=document.getElementById('directory-live-page'),table=host?.querySelector('.df-table');if(!table)return;
    const hr=table.querySelector('thead tr');if(hr&&!hr.querySelector('[data-act]')){const th=document.createElement('th');th.dataset.act='1';th.textContent='Дії';hr.appendChild(th)}
    const data=window.RetailDirectories?.warehouses?.()||[];table.querySelectorAll('tbody tr').forEach((r,i)=>{if(r.querySelector('[data-edit-wh]'))return;const td=document.createElement('td');td.innerHTML='<button data-edit-wh>Редагувати</button>';r.appendChild(td);td.querySelector('button').onclick=()=>editWarehouse(data[i]);});
  }
  function editWarehouse(item){if(!item)return;const a=window.RetailDirectories.warehouses();const idx=a.findIndex(x=>x.id===item.id);if(idx<0)return;const w=document.createElement('div');w.className='df-modal';w.innerHTML=`<div class="df-box"><h3>Редагувати склад</h3><div class="df-grid"><label><small>Індекс *</small><input data-f="index" value="${esc(item.index)}"></label><label><small>Місто *</small><input data-f="city" value="${esc(item.city)}"></label><label style="grid-column:1/-1"><small>Адреса *</small><input data-f="address" value="${esc(item.address)}"></label><label><small>Відповідальна особа (ПІБ)</small><input data-f="responsible" value="${esc(item.responsible||'')}"></label><label><small>Телефон</small><input data-f="phone" value="${esc(item.phone||'')}"></label></div><div class="df-actions"><button data-x>Скасувати</button><button class="df-btn" data-ok>Зберегти</button></div></div>`;document.body.appendChild(w);const q=k=>w.querySelector(`[data-f=${k}]`).value.trim();w.querySelector('[data-x]').onclick=()=>w.remove();w.querySelector('[data-ok]').onclick=()=>{if(!q('index')||!q('city')||!q('address'))return alert('Заповніть індекс, місто та адресу.');a[idx]={...a[idx],index:q('index'),city:q('city'),address:q('address'),responsible:q('responsible'),phone:q('phone')};localStorage.setItem(WH_KEY,JSON.stringify(a));w.remove();window.RetailDirectoryViews?.render();};}

  const patch=()=>{patchPickingList();patchCompleted();patchWarehouseEdit();};
  window.addEventListener('hashchange',()=>setTimeout(patch,0));window.addEventListener('retail:rendered',()=>setTimeout(patch,0));
  new MutationObserver(()=>patch()).observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{window.RetailDirectoryViews?.render();patch();},0);
  window.RetailCanonicalStores={all:()=>clone(canonicalStores),match:matchCanonical};
})();
