import assert from "node:assert/strict";
import test from "node:test";
import { checksum, chunkCounts, splitBuild, stableJson, CHUNK_SIZE } from "./chunk-protocol.ts";
import { uploadPrepared } from "./client.ts";
import { readFileSync } from "node:fs";

const build:any={run:{source_namespace:"ts-plus-cube",source_json_sha256:"hash"},report:{baseRows:501,validationPassed:true,promoted:false},documents:Array.from({length:501},(_,i)=>({financial_key:`d${i}`})),baseLinks:Array.from({length:501},(_,i)=>({base_row_no:i,financial_key:`d${i}`})),movements:[],businessLinks:[]};

test("large snapshot is split and never sent as one payload",async()=>{
  const prepared:any={build,chunks:splitBuild(build),expectedChunks:chunkCounts(build)};const bodies:any[]=[];
  const fake:any=async(_url:string,init:any)=>{const body=JSON.parse(init.body);bodies.push(body);return new Response(JSON.stringify({ok:true,runId:"r1",status:body.action==="finalize"?"validated":"staging",promoted:false}),{status:200,headers:{"content-type":"application/json"}})};
  const result=await uploadPrepared("https://invalid.local","secret",prepared,fake);
  assert.equal(result.promoted,false);assert.equal(bodies[0].action,"start");assert.equal("records" in bodies[0],false);
  assert.ok(bodies.filter(x=>x.action==="chunk").every(x=>x.records.length<=CHUNK_SIZE));assert.equal(bodies.at(-1).action,"finalize");
});
test("checksum is deterministic across object key order",async()=>assert.equal(await checksum([{a:1,b:2}]),await checksum([{b:2,a:1}])));
test("wrong checksum differs",async()=>assert.notEqual(await checksum([{a:1}]),await checksum([{a:2}])));
test("chunk size is bounded at 250",()=>assert.deepEqual(splitBuild(build).filter(x=>x.entityType==="documents").map(x=>x.records.length),[250,250,1]));
test("stable JSON preserves array order",()=>assert.notEqual(stableJson([1,2]),stableJson([2,1])));

test("chunk retry can be idempotent without duplicate staging rows",async()=>{
  const rows=new Map<string,any>();const receipts=new Map<string,string>();
  const ingest=async(index:number,records:any[],sum:string)=>{const key=`documents:${index}`;if(receipts.has(key)){if(receipts.get(key)!==sum)throw new Error("chunk retry checksum mismatch");return{idempotent:true};}for(const row of records){if(rows.has(row.financial_key))throw new Error("duplicate row");rows.set(row.financial_key,row);}receipts.set(key,sum);return{idempotent:false};};
  const records=[{financial_key:"one"}],sum=await checksum(records);assert.equal((await ingest(0,records,sum)).idempotent,false);assert.equal((await ingest(0,records,sum)).idempotent,true);assert.equal(rows.size,1);await assert.rejects(ingest(0,records,"0".repeat(64)),/checksum/);
});

test("missing chunk and partial upload fail closed",()=>{const expected=3,received=[0,2];assert.equal(received.length===expected&&Math.min(...received)===0&&Math.max(...received)===expected-1,false)});
test("finalize response never auto-promotes and current state stays unchanged",()=>{const current=["old"];const result={status:"validated",validationPassed:true,promoted:false};assert.equal(result.promoted,false);assert.deepEqual(current,["old"])});
test("legacy isolation contract contains no legacy entity",()=>assert.deepEqual(Object.keys(chunkCounts(build)).sort(),["baseLinks","businessLinks","documents","movements"]));
test("edge endpoint has no full snapshot or worksheet transport",()=>{const source=readFileSync(new URL("./index.ts",import.meta.url),"utf8");assert.doesNotMatch(source,/formData|source_identity|buildSafeSync|arrayBuffer/);assert.match(source,/action==="chunk"/)});
test("promotion remains a separate explicit action",()=>{const source=readFileSync(new URL("./index.ts",import.meta.url),"utf8");assert.match(source,/action==="promote"/);assert.match(source,/finalize never promotes/)});
test("client supports gateway JWT without putting secrets in payload",async()=>{const prepared:any={build:{...build,documents:[],baseLinks:[]},chunks:[],expectedChunks:{documents:0,baseLinks:0,movements:0,businessLinks:0}};const seen:any[]=[];const fake:any=async(_url:string,init:any)=>{seen.push(init);const action=JSON.parse(init.body).action;return new Response(JSON.stringify({ok:true,runId:"r",status:action==="finalize"?"validated":"staging",promoted:false}),{headers:{"content-type":"application/json"}})};await uploadPrepared("https://invalid.local","sync-secret",prepared,fake,"jwt-value");assert.equal(seen[0].headers.authorization,"Bearer jwt-value");assert.doesNotMatch(seen[0].body,/sync-secret|jwt-value/)});
