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
   if(tab==='dashboard')await frame.locator('[data-chart=cost]').waitFor();
   if(tab==='analytics')await frame.locator('.v443-overview').first().waitFor();
   if(tab==='routes'){await frame.locator('.v437-pick-card').waitFor();assert.ok(await frame.locator('.v445-route-delete').count()>=5)}
   assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,tab+' '+theme+' overflow');
   if(capture&&['dashboard','analytics','routes','menu'].includes(tab)){await frame.evaluate(tab=>scrollTo(0,tab==='dashboard'?350:0),tab);await capture('v445-full-'+theme+'-'+tab)}
  }
  await frame.evaluate(()=>{v442Nav('routes');v43OpenRoute(1);v43OpenTT(1,10)});
  assert.ok(await frame.locator('.v439-invoice').isVisible());
  if(capture)await capture('v445-full-'+theme+'-invoice');
  await frame.evaluate(()=>{v442Nav('routes');v43Replenishment()});
  await frame.locator('#v43-modal').waitFor({state:'visible'});
  if(capture)await capture('v445-full-'+theme+'-modal');
  await frame.evaluate(()=>v43CloseModal());
 }
 assert.deepEqual(await frame.evaluate(()=>TRTS_APP.buildReport()),before,'Theme and view changes preserve every report value');
 console.log('PASS full Light/Dark screens, only two theme options, persisted preference, route actions and financial parity');
};
