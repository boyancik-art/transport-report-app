const assert=require('node:assert/strict');
const test=require('node:test');
const {readFileSync}=require('node:fs');
const joins=require('./stable-key-joins.js');
const adapter=require('./adapter-read-client.js');

test('reused route_delivery_id is isolated by route_key and point_key',()=>{
 const routes=[{id:11,route_delivery_id:'same',route_key:'rt2_first'},{id:22,route_delivery_id:'same',route_key:'rt2_second'}];
 const points=[{id:111,route_id:11,point_key:'pt2_first',customer_id:'customer'},{id:222,route_id:22,point_key:'pt2_second',customer_id:'customer'}];
 const documents=[{financial_key:'fin_first',route_delivery_id:'same',route_key:'rt2_first',point_key:'pt2_first',order_amount:100,pallets:1,weight:10},{financial_key:'fin_second',route_delivery_id:'same',route_key:'rt2_second',point_key:'pt2_second',order_amount:250,pallets:2.5,weight:25}];
 const metrics=(route,point)=>{const docs=joins.pointDocuments(documents,route,point);return{documents:docs.map(x=>x.financial_key),tt:docs.length?1:0,sales:docs.reduce((n,x)=>n+x.order_amount,0),pallets:docs.reduce((n,x)=>n+x.pallets,0),weight:docs.reduce((n,x)=>n+x.weight,0)}};
 assert.deepEqual(metrics(routes[0],points[0]),{documents:['fin_first'],tt:1,sales:100,pallets:1,weight:10});
 assert.deepEqual(metrics(routes[1],points[1]),{documents:['fin_second'],tt:1,sales:250,pallets:2.5,weight:25});
 assert.deepEqual(joins.pointDocuments(documents,routes[0],{...points[0],point_key:'pt2_second'}),[]);
});

test('legacy contract falls back only when stable keys are absent',()=>{
 const route={route_delivery_id:'legacy-route'},point={customer_id:'customer'},location={address_id:'address'};
 const documents=[{id:1,route_delivery_id:'legacy-route',customer_id:'customer',address_id:'address'}];
 assert.deepEqual(joins.pointDocuments(documents,route,point,location),documents);
});

test('operations runtime uses stable keys and adapter proxy',()=>{
 const operations=readFileSync(require.resolve('./patch-v43-operations.js'),'utf8');
 const build=readFileSync(require.resolve('./build.mjs'),'utf8');
 assert.match(operations,/TRTS_STABLE_KEY_JOINS\.routeDocuments/);
 assert.match(operations,/TRTS_STABLE_KEY_JOINS\.pointDocuments/);
 for(const resource of ['routes','routePoints','sourceDocuments','businessAllocations','routeFacts','routeExtraPoints','locations'])assert.match(operations,new RegExp("['\"]"+resource+"['\"]"));
 assert.match(operations,/TRTS_ADAPTER_READ\.all\(api,resource,filters,sort\)/);
 assert.ok(build.indexOf('stable-key-joins.js?v=4480')<build.indexOf('patch-v43-operations.js?v=4480'));
});

test('adapter client pages exclusively through the read proxy',async()=>{
 const calls=[];const api=async(path,opt)=>{calls.push({path,opt,body:JSON.parse(opt.body)});return{rows:calls.length===1?[{id:1}]:[]}};
 assert.deepEqual(await adapter.all(api,'routes',[],[]),[{id:1}]);
 assert.equal(calls[0].path,'/functions/v1/transport-adapter-read');assert.equal(calls[0].opt.method,'POST');assert.equal(calls[0].body.limit,1000);
});
