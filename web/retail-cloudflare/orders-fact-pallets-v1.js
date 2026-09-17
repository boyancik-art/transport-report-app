/* Fact pallets for transport-first Orders workspace. */
(() => {
  "use strict";
  const O="tc_retail_orders_v1";
  const read=()=>RetailState.read(O,[]);
  const write=a=>RetailState.write(O,a);
  const fmt=x=>{const n=Number(x);return Number.isFinite(n)?n.toLocaleString("uk-UA",{maximumFractionDigits:2}):"—"};
  function patch(){
    if(location.hash!=="#orders") return;
    const table=document.querySelector(".content .ui-table");
    if(!table) return;
    const heads=[...table.querySelectorAll("thead th")];
    const mat=heads.findIndex(th=>th.textContent.trim()==="Мат. палет");
    if(mat<0 || heads.some(th=>th.textContent.trim()==="Факт палет")) return;
    const th=document.createElement("th"); th.textContent="Факт палет"; heads[mat].after(th);
    const os=read();
    [...table.querySelectorAll("tbody tr")].forEach((tr,i)=>{
      const cells=[...tr.children]; if(cells.length<mat+1) return;
      const o=os[i]; const td=document.createElement("td");
      if(!o){td.textContent="—";} else {
        const input=document.createElement("input"); input.type="number"; input.min="0"; input.step="0.01"; input.inputMode="decimal"; input.value=o.actualPallets??""; input.placeholder="Факт"; input.style.cssText="width:82px;min-width:72px"; input.setAttribute("aria-label","Факт палет");
        input.addEventListener("change",()=>{const a=read(),x=a.find(v=>v.id===o.id);if(!x)return;x.actualPallets=input.value===""?"":Number(input.value);write(a);}); td.append(input);
      }
      cells[mat].after(td);
    });
  }
  function syncToTickets(){
    if(location.hash!=="#routes-page") return;
    const os=read(), ts=RetailState.read("tc_retail_tickets_v1",[]); let changed=false;
    ts.forEach(t=>{const o=os.find(x=>x.id===t.orderGroupId);if(o && o.actualPallets!=="" && o.actualPallets!=null && t.actualPallets!==Number(o.actualPallets)){t.actualPallets=Number(o.actualPallets);changed=true;}});
    if(changed) RetailState.write("tc_retail_tickets_v1",ts);
  }
  const run=()=>setTimeout(()=>{patch();syncToTickets()},40);
  window.addEventListener("hashchange",run); document.addEventListener("DOMContentLoaded",run);
  const mo=new MutationObserver(()=>{if(location.hash==="#orders"&&!document.querySelector('.content .ui-table thead th[data-fact-marker]')) patch();});
  document.addEventListener("DOMContentLoaded",()=>{const c=document.querySelector(".content");if(c)mo.observe(c,{childList:true,subtree:true})});
  run();
})();