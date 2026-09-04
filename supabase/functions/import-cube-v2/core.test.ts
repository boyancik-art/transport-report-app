import assert from "node:assert/strict";
import test from "node:test";
import { buildSafeSync } from "./core.ts";

const headers = ["ID групи (Операції)","Код продажі","Дата документу","ID Доставки","Код операції","Склад відправника","Експедитор","ID Контрагента","Контрагент","ID Адреса доставки","Адреса доставки","EmployeeID","Бізнес одиниця","К-ть пляшок","Кількість місць","Вага","Мат пал.","Сума замовлення"];
const row = (group="G1", sale="S1", sourceRow=2, amount=100) => ({ sourceRow, values:[group,sale,"2026-09-01","R1","OP","W","E","C1","Customer","A1","Address","EMP","BU",1,2,3,4,amount] });
const fact = (saleId="90071992547409931234", group="G1", sale="S1", moves:any[]=[{sourceMoveId:"70000000000000000001",sourceWarehouseId:"W1"}], businesses:any[]=[{sourceBusinessUnitId:"80000000000000000001",business:"BU"}]) => ({sourceContract:"cube-source-identity-v1",sourceFirmId:"8000005798851",sourceSaleId:saleId,group,sale,sourceOperationId:"OP-ID",deliveryAddressObjectId:"ADDR-ID",date:"2026-09-01",route:"R1",op:"OP",customerId:"C1",addressId:"A1",bottles:1,places:2,weight:3,pallets:4,amount:100,movements:moves,businessUnits:businesses});
const payload = (rows:any[], facts:any[]) => ({report:{status:"exported_for_review",refreshConfirmed:true,exportCompleted:true,sourceNamespace:"ts-plus-cube",financialCollisionGroups:0,requestedPeriod:{from:"2026-08-01",to:"2026-09-03"}},sourceProjection:{headers,rows},financialFacts:facts});

test("one DocSale and one DocMove",()=>{const x=buildSafeSync(payload([row()],[fact()]),"h");assert.equal(x.documents.length,1);assert.equal(x.movements.length,1);assert.equal(x.report.totalOrderAmount,100)});
test("one DocSale with two DocMove does not multiply amount",()=>{const x=buildSafeSync(payload([row(),row("G1","S1",3)],[fact(undefined,"G1","S1",[{sourceMoveId:"M1"},{sourceMoveId:"M2"}])]),"h");assert.equal(x.documents.length,1);assert.equal(x.movements.length,2);assert.equal(x.report.duplicateBaseRows,1);assert.equal(x.report.totalOrderAmount,100)});
test("identical DocSale twice in Base remains one financial fact",()=>{const x=buildSafeSync(payload([row(),row("G1","S1",3)],[fact()]),"h");assert.equal(x.documents.length,1);assert.equal(x.baseLinks.length,2)});
test("duplicate Base rows do not multiply financial measures",()=>{const x=buildSafeSync(payload([row(),row("G1","S1",3,101)],[{...fact(),amount:100}]),"h");assert.equal(x.report.totalOrderAmount,100)});
test("Source Identity fact absent from Base is ignored",()=>{const x=buildSafeSync(payload([row()],[fact(),fact("90071992547409939999","G2","S2")]),"h");assert.equal(x.documents.length,1)});
test("Base row without identity fails closed",()=>assert.throws(()=>buildSafeSync(payload([row("missing","missing")],[fact()]),"h"),/matching failed/));
test("duplicate financial key fails closed",()=>assert.throws(()=>buildSafeSync(payload([row()],[fact(),fact("90071992547409931234","G2","S2")]),"h"),/collision/));
test("bigint IDs remain exact strings",()=>{const x=buildSafeSync(payload([row()],[fact()]),"h");assert.equal(x.documents[0].source_sale_id,"90071992547409931234");assert.equal(x.movements[0].source_move_id,"70000000000000000001")});
test("numeric source IDs are rejected",()=>assert.throws(()=>buildSafeSync(payload([row()],[{...fact(),sourceSaleId:9007199254740992}]),"h"),/text ID/));
test("financial measures are counted once from the active Source Identity fact",()=>{const x=buildSafeSync(payload([row("G1","S1",2,123.45)],[{...fact(),amount:999999}]),"h");assert.equal(x.report.totalOrderAmount,999999)});
test("validation report uses financial facts, not Base duplicates",()=>{const x=buildSafeSync(payload([row(),row("G1","S1",3)],[fact()]),"h");assert.deepEqual([x.report.baseRows,x.report.matchedRows,x.report.financialFacts,x.report.duplicateBaseRows,x.report.validationPassed,x.report.promoted],[2,2,1,1,true,false])});

test("v1.5 control snapshot acceptance",()=>{
  const active=10743, duplicateCount=60, targetAmount=57322442.30;
  const rows=[]; const facts=[];
  for(let i=0;i<active;i++){const group=`G${i}`,sale=`S${i}`,amount=i===0?targetAmount:0;rows.push(row(group,sale,i+2,amount));facts.push({...fact(`SALE${i}`,group,sale,[],[]),amount,bottles:0,places:0,weight:0,pallets:0});}
  for(let i=0;i<duplicateCount;i++) rows.push(row(`G${i}`,`S${i}`,active+i+2,i===0?targetAmount:0));
  for(let i=0;i<10;i++) facts.push(fact(`INACTIVE${i}`,`IG${i}`,`IS${i}`,[],[]));
  const x=buildSafeSync(payload(rows,facts),"v1.5-fixture");
  assert.deepEqual({baseRows:x.report.baseRows,matchedRows:x.report.matchedRows,unmatchedRows:x.report.unmatchedRows,financialFacts:x.report.financialFacts,duplicateBaseRows:x.report.duplicateBaseRows,financialCollisionGroups:x.report.financialCollisionGroups,totalOrderAmount:x.report.totalOrderAmount,sourceFacts:x.run.source_facts_total},{baseRows:10803,matchedRows:10803,unmatchedRows:0,financialFacts:10743,duplicateBaseRows:60,financialCollisionGroups:0,totalOrderAmount:targetAmount,sourceFacts:10753});
});
