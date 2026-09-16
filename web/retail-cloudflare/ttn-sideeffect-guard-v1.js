(()=>{'use strict';
const L='tc_retail_loading_register_v1',R='tc_retail_routes_v1';
const api=window.RetailRouteTTN;if(!api||!window.RetailState)return;
const originalGenerate=api.generate?.bind(api);
if(originalGenerate)api.generate=RetailState.guard(no=>{
  const route=(RetailState.read(R,[])||[]).find(x=>x.number===no),reg=(RetailState.read(L,[])||[]).find(x=>x.route===no);
  if(!route)return alert('Маршрут не знайдено.');
  if(!reg){alert('Спочатку сформуйте та збережіть реєстр завантаження.');return api.editRegister(no)}
  const missing=(route.ticketIds||[]).filter(id=>!String(reg.seals?.[id]||'').trim());
  if(missing.length){alert(`Перед формуванням ТТН вкажіть номер пломби для кожного магазину в реєстрі завантаження. Не заповнено: ${missing.length}.`);return api.editRegister(no)}
  return originalGenerate(no)
});
})();