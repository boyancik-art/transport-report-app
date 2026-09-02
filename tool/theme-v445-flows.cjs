const assert=require('node:assert/strict');
module.exports=async({page,frame,capture})=>{
 const before=await frame.evaluate(()=>TRTS_APP.buildReport());
 for(const theme of ['light','dark']){
  await frame.evaluate(()=>v442Nav('menu'));
  await frame.getByRole('button',{name:'Тема',exact:false}).click();
  assert.deepEqual(await frame.locator('#v443-theme option').evaluateAll(es=>es.map(e=>e.value)),['dark','light']);
  await frame.locator('#v443-theme').selectOption(theme);
  assert.equal(await frame.evaluate(()=>document.documentElement.dataset.theme),theme);
  assert.equal(await frame.evaluate(()=>localStorage.trts_theme),theme);
  for(const tab of ['dashboard','analytics','routes','expenses','menu']){
   await frame.evaluate(t=>v442Nav(t),tab);
   if(tab==='dashboard'){await frame.locator('[data-chart=cost]').waitFor();assert.equal(await frame.locator('[data-kpi=cost]').evaluate(n=>getComputedStyle(n).backgroundColor),'rgba(0, 0, 0, 0)','Executive selected state must not inherit purple button surface')}
   if(tab==='analytics')await frame.locator('.v443-overview').first().waitFor();
   if(tab==='routes'){await frame.locator('.v437-pick-card').waitFor();assert.ok(await frame.locator('.v445-route-delete').count()>=5)}
   assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,tab+' '+theme+' overflow');
   if(capture&&['dashboard','analytics','routes','menu'].includes(tab)){await frame.evaluate(tab=>scrollTo(0,0),tab);await capture('v445-full-'+theme+'-'+tab)}
  }
  await frame.evaluate(()=>{v442Nav('routes');v43OpenRoute(1)});
  assert.ok(await frame.locator('[data-route-tariff]').first().isVisible());if(capture)await capture('v446-'+theme+'-route');
  await frame.evaluate(()=>v43OpenTT(1,10));
  assert.ok(await frame.locator('.v439-invoice').isVisible());
  if(capture)await capture('v445-full-'+theme+'-invoice');
  await frame.evaluate(()=>v442Nav('analytics'));await frame.locator('[data-summary=local] .v443-overview-title').click();
  for(const label of ['HoReCa','Київ','Тестовий перевізник','ФОП / TS','Не застосовується']){
   await frame.locator('.v442-metrics-grid .v442-metric-heading').filter({hasText:label}).first().click();
  }
  const analyticRoute=frame.locator('.v446-analytics-route [data-route-id="1"]');await analyticRoute.waitFor();
  for(const text of ['Філія покриття','Експедитор','Перевізник','Хвиля','Тариф'])assert.ok((await analyticRoute.innerText()).includes(text),'Analytics route metadata '+text);
  if(capture)await capture('v446-'+theme+'-analytics-route');
  await analyticRoute.locator('.v436-route-id').click();await frame.locator('.v436-detail').waitFor();await frame.getByRole('button',{name:'Назад до маршрутів',exact:true}).click();await analyticRoute.waitFor();
  for(const id of [2,3,4,5,6]){
   await frame.evaluate(id=>{v442Nav('routes');v43OpenRoute(id)},id);
   assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Route '+id+' '+theme);
   if(id===2)assert.equal(await frame.locator('[data-route-tariff]').count(),0,'Pickup has no artificial tariff');
   else assert.ok(await frame.locator('[data-route-tariff]').isVisible(),'Paid route tariff '+id);
   if(capture&&[3,4].includes(id))await capture('v446-'+theme+'-route-'+id);
   await frame.evaluate(id=>v43OpenTT(id,id*10),id);
   assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'TT '+id+' '+theme);
   if(capture&&[3,4].includes(id))await capture('v446-'+theme+'-tt-'+id);
   if(theme==='light'){
    const colors=await frame.locator('.v444-metrics dd,.v431-ckpi b,.v437-point-finance b').evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>({text:n.textContent,color:getComputedStyle(n).color,bg:getComputedStyle(n.parentElement).backgroundColor})));
    for(const c of colors)assert.notEqual(c.color,'rgb(255, 255, 255)','Light KPI must not retain white ink: '+c.text);
   }
  }
  await frame.evaluate(()=>{v442Nav('routes');v43Replenishment()});
  await frame.locator('#v43-modal').waitFor({state:'visible'});
  if(theme==='light'){
   const ratios=await frame.evaluate(()=>{
    const lum=css=>{const a=css.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return a[0]*.2126+a[1]*.7152+a[2]*.0722};
    return ['.v43-modal-head h3','#rp-sender-summary','#rp-receiver'].map(sel=>{
     const node=document.querySelector(sel),ink=lum(getComputedStyle(node).color);let surface=node;
     while(surface&&['rgba(0, 0, 0, 0)','transparent'].includes(getComputedStyle(surface).backgroundColor))surface=surface.parentElement;
     const paper=lum(surface?getComputedStyle(surface).backgroundColor:'rgb(255,255,255)');
     return{sel,ratio:(Math.max(ink,paper)+.05)/(Math.min(ink,paper)+.05)};
    });
   });for(const x of ratios)assert.ok(x.ratio>=4.5,'Light modal contrast '+JSON.stringify(x));
  }
  if(capture)await capture('v445-full-'+theme+'-modal');
  await frame.evaluate(()=>v43CloseModal());
 }
 await frame.evaluate(()=>v443Theme('light'));
 assert.deepEqual(await frame.evaluate(()=>TRTS_APP.buildReport()),before,'Theme and view changes preserve every report value');
 console.log('PASS full Light/Dark screens, only two theme options, persisted preference, route actions and financial parity');
};
