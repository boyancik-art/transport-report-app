(() => {
  'use strict';
  const TICKETS='tc_retail_tickets_v1';
  const clone=v=>JSON.parse(JSON.stringify(v));
  const norm=s=>String(s??'').toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ').trim();
  const C=(name,phone,email)=>[{name,position:'адміністратор',phone,email}];
  const CONTACTS=[
    [['рівне №1','рівне №2'],C('Куцай Наталія Анатоліївна','050 416-81-29','kucaj.n@wteam.com.ua')],
    [['луцьк'],C('Музичук Ольга Леонтіївна','097 649-93-35','muzychuk.o@wteam.com.ua')],
    [['княгині ольги','магазин львів'],C('Папіш Ярина Ігорівна','098 424-08-76','papish.y@asnova.com')],
    [['ужгород'],C('Єлісеєва Тетяна Юріївна','097 950-44-60','yeliseieva.t@wteam.com.ua')],
    [['івано-франківськ','крихівці'],C('Юргель Олександра Володимирівна','095 753-19-75','Yurgel.O@wteam.com.ua')],
    [['чернівці'],C('Ясніцька Стела Костянтинівна','099 047-59-64','yasnitska.s@wteam.com.ua')],
    [['тернопіль'],C('Вовк Марія Володимирівна','068 010-54-71','vovk.m@asnova.com')],
    [['хмельницький'],C('Єлісеєва Тетяна Юріївна','097 950-44-60','yeliseieva.t@wteam.com.ua')],
    [['вінниця №1','вінниця №2'],C('Остапенко Сергій Михайлович','099 941-30-80','ostapenko.s@wteam.com.ua')],
    [['дніпро №3','дніпро №1'],C('Матросова Катерина Михайлівна','098 219-70-14','matrosova.k@wteam.com.ua')],
    [['полтава'],C('Дудник Юлія Ярославівна','095 794-34-08','okunska.u@wteam.com.ua')],
    [['кременчук'],C('Харченко Тетяна Сергіївна','067 747-16-75','kharchenko.t@wteam.com.ua')],
    [['черкаси'],C('Лосенко Анастасія Андріївна','050 465-67-19','losenko.a@wteam.com.ua')],
    [['чернігів'],C('Манько Наталія Едуардівна','063 849-73-83','Manko.N@wteam.com.ua')],
    [['стоянка'],C('Лебідь Юлія Василівна','067 479-16-76','lebid.y@wteam.com.ua')],
    [['палладіна'],C('Щоткін Владислав Андрійович','095 508-55-52','shchotkin.v@asnova.com')],
    [['молодіжна','маккейна','дмитрівська'],C('Іваняс-Горянська Яна Юріївна','093 600-61-12','ivanias-horianska.y@asnova.com')],
    [['шалімова','здановської','вишгородська'],C('Корбачов Максим Сергійович','097 429-08-58','korbachov.m@asnova.com')],
    [['соборний'],C('Краснощок Інна Володимирівна','093 078-26-01','krasnoshchok.i@wteam.com.ua')],
    [['бажана'],[...C('Міщанинець Дмитро Леонідович','096 398-32-53','mishchanynets.d@asnova.com'),...C('Коломієць Яна Валеріївна','093 482-50-89','kolomiiets.y@wteam.com.ua')]],
    [['голосіївська','ярославів вал','верхній вал','велика васильківська'],C('Тєрьошина Анастасія Владиславівна','063 521 19 00','tieroshyna.a@asnova.com')],
    [['козин','мокра','теліги'],C('Волочаєва Світлана Геннадіївна','095 394-00-65','volochaieva.sv@asnova.com')],
    [['верхогляда','філатова'],C('Богданюк Микола Володимирович','096 860-55-94','bohdaniuk.m@wteam.com.ua')]
  ];
  function contactsFor(s){const q=norm(`${s.name||''} ${s.address||''}`);for(const [keys,c] of CONTACTS)if(keys.some(k=>q.includes(norm(k))))return clone(c);return clone(s.contacts||[]);}
  if(window.RetailDirectories?.stores){
    const base=RetailDirectories.stores.bind(RetailDirectories);
    RetailDirectories.stores=()=>base().map(s=>({...s,contacts:contactsFor(s)}));
  }

  function normalizeTicket(t){
    const done=t.status==='Скомплектовано'||t.pickingStatus==='completed';
    if(done)return {...t,pickingStatus:'completed',status:'Скомплектовано',completionResult:t.completionResult||(t.completionMode==='changed'?'changed':'unchanged')};
    if(t.printStatus==='printed')return {...t,pickingStatus:'picking',status:'В підборі'};
    return {...t,printStatus:'not_printed',pickingStatus:'waiting',status:'Очікує'};
  }
  function normalizeTickets(){
    if(!window.RetailState)return;
    const a=RetailState.read(TICKETS,[])||[], next=a.map(normalizeTicket);
    if(JSON.stringify(a)!==JSON.stringify(next))RetailState.write(TICKETS,next);
  }
  normalizeTickets();
  window.addEventListener('retail:rendered',normalizeTickets);

  // Agreed operational shell: add only navigation entries; content stays isolated placeholders until its data model is implemented.
  function addNav(){
    const nav=document.querySelector('.side nav');if(!nav)return;
    const anchor=nav.querySelector('a[href="#analytics-page"]');
    const items=[['#partners-page','Партнери'],['#tasks-page','Операційні задачі'],['#control-page','Контроль']];
    items.forEach(([href,label])=>{if(nav.querySelector(`a[href="${href}"]`))return;const a=document.createElement('a');a.href=href;a.innerHTML=`<span>${label}</span>`;anchor?.insertAdjacentElement('afterend',a);});
  }
  function renderPlaceholder(){
    const pages={'#partners-page':['Партнери','Довідник партнерів і контрагентів'],'#tasks-page':['Операційні задачі','Контроль виконання логістичних задач'],'#control-page':['Контроль','Операційний контроль відвантажень і маршрутів']};
    const p=pages[location.hash];if(!p)return;
    const content=document.querySelector('main .content');if(!content)return;
    content.innerHTML=`<div class="ops-page-title"><div><h2>${p[0]}</h2><small>${p[1]}</small></div></div><div style="padding:70px;text-align:center;color:#929aa5">Розділ у розробці</div>`;
  }
  addNav();
  window.addEventListener('hashchange',()=>{addNav();renderPlaceholder();});
  setTimeout(()=>{addNav();renderPlaceholder();window.RetailDirectoryViews?.render?.();},0);
})();