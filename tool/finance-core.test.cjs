const assert=require('node:assert/strict'),C=require('../web/transport-costs.js'),zones=require('./coverage-v44.json');
assert.equal(zones.length,197);assert.equal(new Set(zones.map(z=>[z.carrier,C.geo(z.region),C.geo(z.district)].join('|'))).size,197);
for(const amount of [0,.01,.02,1,100,300.01,7654321.99])for(let count=1;count<50;count++){
 const rows=Array.from({length:count},(_,i)=>({id:i,tt:1,pals:i%3,bottles:i%7,weight:i%11}));
 const out=C.split(amount,rows);assert.equal(out.reduce((s,x)=>s+Math.round(x.cost*100),0),Math.round(amount*100));assert.ok(out.every(x=>x.cost>=0));
}
assert.deepEqual(C.split(300.01,[{id:1,tt:1,pals:1,bottles:10,weight:10},{id:2,tt:1,pals:2,bottles:20,weight:20}]),[{id:1,cost:100},{id:2,cost:200.01}]);
assert.deepEqual(C.split(.02,[1,2,3].map(id=>({id,tt:1}))),[{id:1,cost:.01},{id:2,cost:.01},{id:3,cost:0}]);
const base={carrier:'SAV',month:'2026-09-01',region:'Київська обл.',district:'Білоцерківський р-н',pallets:.5,zones,rates:[{carrier:'SAV',month:'2026-09-01',tt_fixed:82.2,zone1:510}]};
assert.equal(C.zoneQuote(base).cost,337.2);assert.equal(C.zoneQuote({...base,month:'2026-10-01'}).cost,null);
assert.equal(C.zoneQuote({...base,region:'Львівська'}).cost,null);assert.equal(C.zoneQuote({...base,district:''}).cost,null);
assert.equal(C.own('ТОВ ТС ПЛЮС'),true);assert.equal(C.own('Експедитор ТОВ ТС ПЛЮС'),false);
console.log('PASS 197 source zones; month/region/district boundaries; weighted allocation conserved to a kopeck across 343 cases');
