(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.TRTS_ADAPTER_READ=factory()})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const page=async(api,resource,filters=[],limit=1000,offset=0,sort=[])=>{
  const result=await api('/functions/v1/transport-adapter-read',{method:'POST',body:JSON.stringify({resource,filters,limit,offset,sort})});
  if(!result||!Array.isArray(result.rows))throw Error('Сервер не повернув adapter data');return result.rows;
 };
 const all=async(api,resource,filters=[],sort=[])=>{const rows=[];for(let offset=0;;offset+=1000){const batch=await page(api,resource,filters,1000,offset,sort);rows.push(...batch);if(batch.length<1000)return rows}};
 return{page,all};
});
