const assert=require('node:assert/strict');
module.exports=async frame=>{
 await frame.evaluate(()=>{
  const d=TRTS_OPS.dat();window.__boundedOriginal={...d};
  const definitions=[['other',1],['fop',78],['bakery',61],['courier',50],['sav',10],['stv',432],['pickup',84]],routes=[],points=[],docs=[],facts=[];
  let id=10000;for(const [key,count] of definitions){const source=d.routes.find(r=>TRTS_OPS.sectionKey(r)===key)||d.routes[0];for(let i=0;i<count;i++){
   const rid=++id,pid=rid*10,r={...source,id:rid,route_key:'route:scale:'+rid,route_delivery_id:'SCALE-'+rid,...(key==='other'?{expeditor_name:'Unassigned scale fixture'}:{})};routes.push(r);
   points.push({id:pid,route_id:rid,route_key:r.route_key,point_key:'point:scale:'+rid,customer_id:String(rid),customer_name:'Scale TT',location_id:rid,order_amount:1000,pallets:1,bottles:1,weight:1});
   docs.push({id:rid,route_key:r.route_key,point_key:'point:scale:'+rid,financial_key:'financial:scale:'+rid,route_delivery_id:r.route_delivery_id,document_date:r.route_date,sale_code:'SCALE-INV-'+rid,customer_id:String(rid),address_id:String(rid),order_amount:1000,pallets:1,bottles:1,weight:1});
   if(key==='fop'&&i===count-1)facts.push({id:rid,route_id:rid,carrier_name:'Only last FOP',tariff:100});
  }}
  Object.assign(d,{routes,points,docs,facts,alloc:[],locations:routes.map(r=>({id:r.id,address_id:String(r.id),delivery_address:'Scale address'}))});
  window.__boundedIds={stv:routes.filter(r=>TRTS_OPS.sectionKey(r)==='stv').at(-1).id,fop:facts[0].route_id};v442Nav('routes');
 });
 try{
  await frame.locator('[data-route-page="courier"]').waitFor();
  const counts=await frame.locator('[data-section]').evaluateAll(sections=>Object.fromEntries(sections.map(s=>[s.dataset.section,s.querySelectorAll('[data-route-id],[data-base-route]').length])));
  assert.deepEqual(counts,{base:1,fop:24,bakery:24,courier:24,replen:0,sav:10,stv:24,pickup:24});
  const fullHeader=await frame.locator('[data-section="stv"] .v431-block-head').innerText();assert.match(fullHeader,/432/);
  await frame.evaluate(()=>window.__firstBoundedCard=document.querySelector('[data-section="stv"] [data-route-id]'));
  if(!await frame.locator('[data-route-more="stv"]').isVisible())await frame.locator('[data-section="stv"] .v431-block-head').click();
  await frame.locator('[data-route-more="stv"]').click();
  assert.equal(await frame.locator('[data-section="stv"] [data-route-id]').count(),48);
  assert.equal(await frame.evaluate(()=>__firstBoundedCard===document.querySelector('[data-section="stv"] [data-route-id]')),true,'Append must preserve existing card nodes');
  while(await frame.locator('[data-route-more="stv"]').count())await frame.locator('[data-route-more="stv"]').click();
  const ids=await frame.locator('[data-section="stv"] [data-route-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.routeId));
  assert.equal(ids.length,432);assert.equal(new Set(ids).size,432,'Final page has no duplicates or missing routes');
  await frame.evaluate(()=>v442CarrierFilter('fop','Only last FOP'));
  assert.equal(await frame.locator('[data-section="fop"] [data-route-id]').count(),1,'Filter searches all 78 FOP routes');
  assert.equal(await frame.locator('[data-section="fop"] [data-route-id]').getAttribute('data-route-id'),String(await frame.evaluate(()=>__boundedIds.fop)));
  await frame.evaluate(()=>v442CarrierFilter('fop',''));
  assert.equal(await frame.locator('[data-section="fop"] [data-route-id]').count(),24,'Filter reset starts with 24');
  assert.equal(await frame.evaluate(()=>TRTS_RELEASE.searchIndex('SCALE-'+__boundedIds.stv).some(x=>x.rid===__boundedIds.stv)),true,'Global search finds unrendered route');
  assert.equal(await frame.evaluate(()=>TRTS_RELEASE.searchIndex('SCALE-INV-'+__boundedIds.stv).some(x=>x.rid===__boundedIds.stv&&x.pid)),true,'Global search finds unrendered invoice');
  await frame.evaluate(()=>v43OpenRoute(__boundedIds.stv));await frame.locator('.v436-detail').waitFor();
  await frame.evaluate(()=>v43OpenTT(__boundedIds.stv,__boundedIds.stv*10));await frame.locator('.v439-invoice').waitFor();
  assert.deepEqual(await frame.evaluate(()=>[TRTS_OPS.dat().routes.length,TRTS_OPS.dat().points.length,TRTS_OPS.dat().docs.length]),[716,716,716]);
  console.log('PASS bounded rendering: 716 routes, 131 initial cards, STV 24/432, append preserves nodes, full-data carrier/search/invoice drill-down');
 }finally{
  await frame.evaluate(()=>{Object.assign(TRTS_OPS.dat(),__boundedOriginal);delete window.__boundedOriginal;delete window.__firstBoundedCard;delete window.__boundedIds;v442Nav('dashboard')});
 }
};
