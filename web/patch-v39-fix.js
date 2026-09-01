(()=>{
  const originalApi=window.api;
  if(typeof originalApi!=='function') return;
  window.api=async function(path,opt={}){
    if(typeof path==='string' && path.startsWith('/rest/v1/cube_imports?')){
      try{
        return await originalApi(path,opt);
      }catch(e){
        console.warn('v39 cube_imports fallback:',e?.message||e);
        return [];
      }
    }
    return originalApi(path,opt);
  };
})();