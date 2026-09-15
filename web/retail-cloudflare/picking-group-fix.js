(()=>{
const DOCS='tc_retail_docs_v3',TICKETS='tc_retail_tickets_v1';
const get=(k,d=[])=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(d))}catch{return d}};
const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const text=v=>String(v??'').trim();
function groupKey(d){return [text(d.senderWarehouse).toLowerCase(),text(d.store).toLowerCase(),text(d.receiverWarehouse).toLowerCase()].join('|')}
function nextNo(tickets){let max=0;tickets.forEach(t=>{const m=String(t.number||'').match(/TK-(\d+)/i);if(m)max=Math.max(max,Number(m[1])||0)});return `TK-${String(max+1).padStart(4,'0')}`}
function transfer(ids){let docs=get(DOCS),tickets=get(TICKETS);const wanted=new Set(ids.map(String));const selected=docs.filter(d=>wanted.has(String(d.id)));
 if(!selected.length)return alert('Оберіть хоча б один документ.');
 const already=new Set(tickets.flatMap(t=>t.documentIds||[]).map(String));const fresh=selected.filter(d=>!already.has(String(d.id)));
 if(!fresh.length)return alert('Усі вибрані документи вже передані на комплектацію.');
 const groups=new Map();fresh.forEach(d=>{const k=groupKey(d);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(d)});
 const created=[];for(const ds of groups.values()){const no=nextNo(tickets);tickets.push({number:no,createdAt:new Date().toISOString(),documentIds:ds.map(d=>String(d.id)),status:'До комплектації',actualPallets:'',picked:{},store:ds[0]?.store||'',storeAddress:ds[0]?.storeAddress||'',senderWarehouse:ds[0]?.senderWarehouse||'',receiverWarehouse:ds[0]?.receiverWarehouse||''});created.push(`${no} — ${ds[0]?.store||ds[0]?.receiverWarehouse||'Магазин'} (${ds.length})`)}
 docs=docs.map(d=>fresh.some(x=>String(x.id)===String(d.id))?{...d,status:'На комплектації',workflowStatus:'picking'}:d);set(DOCS,docs);set(TICKETS,tickets);
 alert(`Передано документів: ${fresh.length}\nСтворено талонів: ${created.length}\n\n${created.slice(0,15).join('\n')}${created.length>15?'\n…':''}`);location.hash='#picking-tickets';
}
function enhance(){if(location.hash!=='#base-excel')return;const box=document.querySelector('#base-doc-details');if(!box)return;const toolbar=box.querySelector('.ops-toolbar');if(!toolbar)return;
 const old=toolbar.querySelector('[data-ticket]');if(old){old.textContent='Передати обрані на комплектацію';old.onclick=e=>{e.preventDefault();const ids=[...box.querySelectorAll('tbody input[data-id]:checked')].map(x=>String(x.dataset.id));transfer(ids)}}
 if(!toolbar.querySelector('[data-ticket-all]')){const all=document.createElement('button');all.className='ops-primary';all.dataset.ticketAll='1';all.textContent='Передати всі на комплектацію';all.onclick=e=>{e.preventDefault();const docs=get(DOCS).filter(d=>!['routed','ttn_created','dispatched','delivered','cancelled'].includes(d.workflowStatus));transfer(docs.map(d=>String(d.id)))};toolbar.prepend(all)}
 const master=box.querySelector('thead input[data-all]');if(master)master.onchange=()=>box.querySelectorAll('tbody input[data-id]').forEach(x=>x.checked=master.checked);
}
const mo=new MutationObserver(()=>setTimeout(enhance,0));mo.observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('hashchange',()=>setTimeout(enhance,50));setTimeout(enhance,200);
})();