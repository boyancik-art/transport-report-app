(()=>{
function uniqueDocsForPoint(x){
 const r=D.routes.find(z=>z.id===x.route_id);
 const raw=D.docs.filter(d=>String(d.route_delivery_id)===String(r?.route_delivery_id)&&(!x.customer_id||String(d.customer_id)===String(x.customer_id)));
 const m=new Map();
 for(const d of raw){
   const key=String(d.sale_code||d.operation_code||d.id)+'|'+String(d.customer_id||'');
   if(!m.has(key))m.set(key,d);
 }
 return [...m.values()];
}
showTT=function(filterIds=null){
 let p=filterIds?D.points.filter(x=>filterIds.includes(x.route_id)):D.points;
 view.innerHTML='<button class="btn back" onclick="go(\'home\')">← Назад</button><h2>Торгові точки · '+p.length+'</h2><div class="card tablecard"><table class="table"><thead><tr><th>Клієнт</th><th>Продажів</th><th>Вага</th><th>Палети</th><th>Продажі</th><th>Бізнес</th><th>ТП / EmployeeID</th></tr></thead><tbody>'+p.map(x=>{let a=D.alloc.filter(z=>z.route_point_id===x.id),bu=[...new Set(a.map(z=>business(z.business_unit)))].join(', '),em=[...new Set(a.map(z=>z.employee_id).filter(Boolean))].join(', '),dc=uniqueDocsForPoint(x).length;return'<tr class="click" onclick="pointCard('+x.id+')"><td><b>'+E(x.customer_name||'—')+'</b></td><td>'+dc+'</td><td>'+N(x.weight)+'</td><td>'+N(x.pallets)+'</td><td>'+M(x.order_amount)+'</td><td>'+E(bu||'—')+'</td><td>'+E(em||'—')+'</td></tr>'}).join('')+'</tbody></table></div>'
};
pointCard=function(id){
 let x=D.points.find(z=>z.id===id),r=D.routes.find(z=>z.id===x.route_id),docs=uniqueDocsForPoint(x),a=D.alloc.filter(z=>z.route_point_id===id);
 view.innerHTML='<button class="btn back" onclick="showTT()">← ТТ</button><div class="card box section"><div class="label">Торгова точка</div><h2>'+E(x.customer_name||'—')+'</h2><p>Маршрут: <b>'+E(r?.route_delivery_id||'—')+'</b> · Склад: '+E(r?.warehouse||'—')+'</p><p>Палети: <b>'+N(x.pallets)+'</b> · Вага: <b>'+N(x.weight)+'</b> · Продажі: <b>'+M(x.order_amount)+'</b></p><p>Бізнес: '+E([...new Set(a.map(z=>business(z.business_unit)))].join(', ')||'—')+' · ТП/EmployeeID: '+E([...new Set(a.map(z=>z.employee_id).filter(Boolean))].join(', ')||'—')+'</p></div><h3>Продажі · '+docs.length+'</h3><div class="card tablecard"><table class="table"><thead><tr><th>Дата</th><th>Продаж</th><th>Клієнт</th><th>Адреса</th><th>Бізнес</th><th>EmployeeID</th><th>Сума</th></tr></thead><tbody>'+docs.map(d=>'<tr><td>'+E(d.document_date)+'</td><td><b>'+E(d.sale_code||d.operation_code||'—')+'</b></td><td>'+E(d.customer_name||'—')+'</td><td>'+E(d.delivery_address||'—')+'</td><td>'+E(business(d.business_unit))+'</td><td>'+E(d.employee_id||'—')+'</td><td>'+M(d.order_amount)+'</td></tr>').join('')+'</tbody></table></div>'
};
})();