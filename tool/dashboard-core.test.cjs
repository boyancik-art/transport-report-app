const assert=require('node:assert/strict'),P=require('../web/dashboard-core-v443.js'),A=require('../web/analytics-v44-2.js');
const cases=[
 ['day','2024-03-01',{from:'2024-03-01',to:'2024-03-01'},{from:'2024-02-29',to:'2024-02-29'}],
 ['week','2026-09-02',{from:'2026-08-31',to:'2026-09-06'},{from:'2026-08-24',to:'2026-08-30'}],
 ['month','2024-03-31',{from:'2024-03-01',to:'2024-03-31'},{from:'2024-02-01',to:'2024-02-29'}],
 ['half','2026-09-02',{from:'2026-04-01',to:'2026-09-30'},{from:'2025-10-01',to:'2026-03-31'}],
 ['year','2024-07-01',{from:'2024-01-01',to:'2024-12-31'},{from:'2023-01-01',to:'2023-12-31'}]
];
for(const [mode,date,range,prev]of cases){assert.deepEqual(P.range(mode,date),range);assert.deepEqual(P.previous({...range,mode}),prev)}
assert.deepEqual(P.previous({mode:'custom',from:'2026-09-02',to:'2026-09-11'}),{from:'2026-08-23',to:'2026-09-01'});
for(const key of ['cost','costTT','costPal','log']){assert.equal(P.change(80,100,key).good,true);assert.equal(P.change(120,100,key).good,false)}
assert.equal(P.change(80,100,'sales').good,false);assert.equal(P.change(120,100,'sales').good,true);
assert.equal(P.change(20,0,'cost').percent,null);assert.equal(P.change(null,10,'cost'),null);
const points=[{pointId:'1',date:'2026-09-01',tt:1,cost:20,sales:100,pallets:1},{pointId:'1',date:'2026-09-01',tt:1,cost:30,sales:200,pallets:2}];
const series=P.buckets(points,{from:'2026-09-01',to:'2026-09-03'},A.total);assert.equal(series.length,3);assert.equal(series[0].tt,1);assert.equal(series[0].cost,50);assert.equal(series[1].hasData,false);
console.log('PASS dashboard periods: calendar boundaries, leap year, previous periods, direction colors, missing values, deduplicated chart points');
