/* Source -> Orders guard v1. Keeps source identity, cutoff eligibility and duplicate-safe grouping. */
(()=>{'use strict';const S=window.RetailState;if(!S)return;const OK='tc_retail_orders_v1';
const read=()=>S.read(OK,[]),write=v=>S.write(OK,v),key=d=>S.docKey(d),docs=()=>S.documents();
function usedKeys(){return new Set(read().flatMap(o=>o.documentKeys||[]))}
function eligibleVisible(){const used=usedKeys();return [...document.querySelectorAll('[data-doc]')].filter(x=>!x.disabled&&x.offsetParent!==null&&!used.has(x.dataset.doc)).map(x=>x.dataset.doc)}
function syncUsed(){const used=usedKeys();document.querySelectorAll('[data-doc]').forEach(x=>{if(used.has(x.dataset.doc)){x.checked=false;x.disabled=true;x.closest('tr')?.classList.add('rt-used')}})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-rt-action="select-all"]');if(!b)return;setTimeout(()=>{const eligible=new Set(eligibleVisible());document.querySelectorAll('[data-doc]').forEach(x=>{x.checked=eligible.has(x.dataset.doc)});},0)},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-rt-action="to-orders"]');if(!b)return;const chosen=[...document.querySelectorAll('[data-doc]:checked')].map(x=>x.dataset.doc),used=usedKeys(),dupes=chosen.filter(k=>used.has(k));if(dupes.length){e.preventDefault();e.stopImmediatePropagation();S.notice('Частина вибраних документів уже передана в «Замовлення». Повторне створення групи заблоковано.');syncUsed();}},true);
window.addEventListener('hashchange',()=>setTimeout(syncUsed,50));new MutationObserver(()=>{if(location.hash==='#base-excel')syncUsed()}).observe(document.querySelector('.content')||document.body,{childList:true,subtree:true});syncUsed();
window.RetailSourceOrdersGuard={usedKeys,eligibleVisible,syncUsed};})();