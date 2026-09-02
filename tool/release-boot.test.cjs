const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const script=fs.readFileSync('web/security-boot-v443.js','utf8');
function boot(initial){const values={...initial},storage=new Proxy({getItem:k=>values[k]??null,setItem:(k,v)=>values[k]=String(v),removeItem:k=>delete values[k]},{get:(target,k)=>k in target?target[k]:values[k],set:(target,k,v)=>(values[k]=v,true)}),ctx={localStorage:storage,sessionStorage:{removeItem(){}},window:{},document:{documentElement:{dataset:{}}},matchMedia:()=>({matches:false}),fetch:async()=>({ok:true}),AbortSignal,console};vm.runInNewContext(script,ctx);return{values,ctx}}
let x=boot({trts_seen_build:'v44.3',trts_token:'old',trts_refresh:'old-refresh',trts_vault:'{"id":"old","secret":"secret","cipher":"old"}'});assert.equal(x.values.trts_token,undefined);assert.equal(x.values.trts_refresh,undefined);assert.equal(x.values.trts_vault,undefined);assert.equal(x.values.trts_update_notice,'v44.5');assert.equal(x.ctx.window.TRTS_UNLOCKED,false);
x=boot({trts_seen_build:'v44.5',trts_vault:'{"cipher":"current"}'});assert.ok(x.values.trts_vault);assert.equal(x.values.trts_update_notice,undefined);assert.equal(x.ctx.window.TRTS_UNLOCKED,false);
x=boot({});assert.equal(x.values.trts_update_notice,undefined);
x=boot({trts_token:'pre-version-owner'});assert.equal(x.values.trts_token,undefined);assert.equal(x.values.trts_update_notice,'v44.5');
console.log('PASS update boot: changed version removes token/refresh/encrypted quick unlock; same version preserves PIN lock; first install has no false update notice');
