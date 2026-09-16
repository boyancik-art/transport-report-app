/* One transfer owner; group by the existing warehouse/store grouping. */
(() => {
  const D = "tc_retail_docs_v3", T = "tc_retail_tickets_v1", S = RetailState;
  const groupKey = d => [d.senderWarehouse,d.store,d.receiverWarehouse].map(x=>String(x||"").trim().toLowerCase()).join("|");
  function transfer(keys) {
    const docs=S.documents(), tickets=S.read(T), wanted=new Set(keys), assigned=new Set(tickets.flatMap(t=>S.docsFor(t,docs).map(S.docKey)));
    const fresh=docs.filter(d=>wanted.has(S.docKey(d))&&!assigned.has(S.docKey(d))&&!["routed","ttn_created","dispatched","delivered","cancelled"].includes(d.workflowStatus));
    if(!fresh.length)return S.notice("Оберіть нові документи, які ще не передано на комплектацію.");
    const groups=new Map(); for(const d of fresh){const k=groupKey(d);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(d)}
    for(const ds of groups.values()) tickets.push({number:S.nextNumber(tickets,"number","TK-",4),createdAt:new Date().toISOString(),documentIds:ds.map(d=>String(d.id)),documentKeys:ds.map(S.docKey),status:"Очікує",printStatus:"not_printed",pickingStatus:"waiting",completionResult:null,actualPallets:"",picked:{},store:ds[0].store||"",storeAddress:ds[0].storeAddress||"",senderWarehouse:ds[0].senderWarehouse||"",receiverWarehouse:ds[0].receiverWarehouse||""});
    const moved=new Set(fresh.map(S.docKey)); S.commit({[D]:docs.map(d=>moved.has(S.docKey(d))?{...d,status:"На комплектації",workflowStatus:"picking"}:d),[T]:tickets});
    S.notice("Передано документів: "+fresh.length+". Створено талонів: "+groups.size,"success"); location.hash="#picking-tickets";
  }
  function enhance(){const box=document.getElementById("base-doc-details");if(!box)return;const bar=box.querySelector(".ops-toolbar");if(!bar)return;const button=bar.querySelector("[data-ticket]");if(button){button.textContent="Передати обрані на комплектацію";button.onclick=S.guard(()=>transfer([...box.querySelectorAll("tbody [data-doc]:checked")].map(x=>x.dataset.doc)))}if(!bar.querySelector("[data-ticket-all]")){const all=document.createElement("button");all.className="ops-primary";all.dataset.ticketAll="1";all.textContent="Передати всі на комплектацію";all.onclick=S.guard(()=>transfer(S.documents().map(S.docKey)));bar.prepend(all)}}
  window.RetailPicking={transfer,enhance};
})();