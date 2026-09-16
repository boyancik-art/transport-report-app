(()=>{'use strict';
const L='tc_retail_loading_register_v1',R='tc_retail_routes_v1',T='tc_retail_tickets_v1',D='tc_retail_docs_v3';
const api=window.RetailRouteTTN;if(!api||!window.RetailState)return;
const storeKey=(store,address)=>`${String(store||'').trim().toLowerCase()}|${String(address||'').trim().toLowerCase()}`;
const originalGenerate=api.generate?.bind(api);
if(originalGenerate)api.generate=RetailState.guard(no=>{
  const route=(RetailState.read(R,[])||[]).find(x=>x.number===no),reg=(RetailState.read(L,[])||[]).find(x=>x.route===no);
  if(!route)return alert('Маршрут не знайдено.');
  if(!reg){alert('Спочатку сформуйте та збережіть реєстр завантаження.');return api.editRegister(no)}
  const tickets=RetailState.read(T,[])||[],docs=RetailState.documents?.()||RetailState.read(D,[])||[],keys=new Set();
  for(const id of route.ticketIds||[]){
    const t=tickets.find(x=>String(x.number)===String(id));
    if(!t){alert(`Не знайдено талон комплектування ${id}. Формування ТТН скасовано.`);return}
    let ds;
    try{ds=RetailState.docsFor(t,docs)}catch(e){alert(`Не вдалося знайти документи для талона ${id}. Формування ТТН скасовано.`);return}
    if(!ds?.length){alert(`Не знайдено документи для талона ${id}. Формування ТТН скасовано.`);return}
    const hit=window.RetailCanonicalStores?.match?.(t.store||ds[0]?.store||t.storeAddress||ds[0]?.storeAddress),store=hit?.name||t.store||ds[0]?.store||'',address=hit?.address||t.storeAddress||ds[0]?.storeAddress||'';keys.add(storeKey(store,address));
  }
  const missing=[...keys].filter(key=>!String(reg.seals?.[key]||'').trim());
  if(missing.length){alert(`Перед формуванням ТТН вкажіть номер пломби для кожного магазину в реєстрі завантаження. Не заповнено: ${missing.length}.`);return api.editRegister(no)}
  return originalGenerate(no)
});
})();