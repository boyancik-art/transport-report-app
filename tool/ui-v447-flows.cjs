const assert=require('node:assert/strict');
module.exports=async({page,capture})=>{
 const before=await page.evaluate(()=>JSON.stringify(TRTS_APP.buildReport()));
 for(const theme of ['dark','light']){
  await page.evaluate(t=>{document.documentElement.dataset.theme=t;v442Nav('analytics')},theme);
  await page.locator('[data-summary=local] .v443-overview-title').click();
  assert.equal(await page.locator('.v443-zone-costs').count(),0,'Zones are opt-in');
  for(const axis of ['business','branch','carrier','section','routeId']){
   await page.evaluate(k=>v443Axis(k),axis);
   for(const metric of ['tt','pallets','sales','cost','costTT','log']){
    for(const direction of ['desc','asc']){
     await page.getByLabel('Сортувати за',{exact:true}).selectOption(metric);
     await page.getByLabel('Порядок сортування').selectOption(direction);
     const expected=await page.evaluate(async({axis,metric,direction})=>{
      const report=(await TRTS_DASHBOARD.reports()).current;
      const rows=report.lines.filter(x=>x.kind==='local').map(x=>['sav','stv'].includes(x.section)?{...x,carrier:x.section.toUpperCase()}:x);
      return TRTS_ANALYTICS.group(rows,axis).sort((a,b)=>{const x=a[metric],y=b[metric];return x==null?(y==null?a.name.localeCompare(b.name,'uk'):1):y==null?-1:(direction==='asc'?x-y:y-x)||a.name.localeCompare(b.name,'uk')}).map(x=>x.name);
     },{axis,metric,direction});
     assert.deepEqual(await page.locator('.v442-metrics-grid>[data-group-name]').evaluateAll(ns=>ns.map(n=>n.dataset.groupName)),expected,axis+' '+metric+' '+direction);
    }
   }
  }
  await page.evaluate(()=>v443Axis('zone'));
  const headings=()=>page.locator('.v442-metrics-grid .v442-metric-heading');
  assert.deepEqual((await headings().allTextContents()).map(x=>x.replace('›','').trim()).sort(),['SAV','STV']);
  await headings().filter({hasText:'STV'}).click();
  await headings().filter({hasText:'Львів'}).click();
  assert.match(await headings().innerText(),/Зона 1/);
  await page.getByLabel('Сортувати за',{exact:true}).selectOption('cost');
  await page.getByLabel('Порядок сортування').selectOption('desc');
  if(capture)await capture('v447-'+theme+'-zone-sort');
  await headings().click();
  await page.locator('.v446-analytics-route [data-route-id="503"]').click();
  assert.equal(await page.locator('.v436-invoice-table,.v439-invoice').count(),0,'Route only contains TT cards');
  await page.locator('.v436-address-head').first().click();
  assert.ok(await page.locator('.v439-invoice').count()>0);
  await page.evaluate(()=>v442Nav('analytics'));
  await page.locator('[data-summary=replen] .v443-overview-title').click();
  assert.deepEqual(await page.getByLabel('Сортувати за',{exact:true}).locator('option').evaluateAll(ns=>ns.map(n=>n.value)),['pallets','cost','costPal']);
  for(const direction of ['asc','desc']){
   await page.getByLabel('Сортувати за',{exact:true}).selectOption('costPal');
   await page.getByLabel('Порядок сортування').selectOption(direction);
   assert.deepEqual(await page.locator('.v442-metrics-grid>[data-group-name]').evaluateAll(ns=>ns.map(n=>n.dataset.groupName)),direction==='asc'?['Київ','Львів']:['Львів','Київ']);
  }
 }
 assert.equal(await page.evaluate(()=>JSON.stringify(TRTS_APP.buildReport())),before,'Sorting and navigation never mutate finance');
 console.log('PASS v44.7 Analytics six metrics x five axes x two sort directions x two themes; explicit partner/branch/zone; TT-only route; pallet sorting; report parity');
};

