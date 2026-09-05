(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TRTS_STABLE_KEY_JOINS=api})(typeof window==='undefined'?globalThis:window,()=>{
 'use strict';
 const text=value=>String(value??'').trim();
 function routeDocuments(documents,route){
  const routeKey=text(route?.route_key);
  if(routeKey)return documents.filter(document=>text(document.route_key)===routeKey);
  return documents.filter(document=>text(document.route_delivery_id)===text(route?.route_delivery_id));
 }
 function pointDocuments(documents,route,point,location={}){
  const pointKey=text(point?.point_key);
  if(pointKey)return routeDocuments(documents,route).filter(document=>text(document.point_key)===pointKey);
  return routeDocuments(documents,route).filter(document=>text(document.customer_id)===text(point?.customer_id)&&(!location.address_id||text(document.address_id)===text(location.address_id)));
 }
 return{routeDocuments,pointDocuments};
});
