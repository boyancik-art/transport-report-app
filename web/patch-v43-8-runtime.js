// One version owner. Rendering must be idempotent: never observe and rewrite the same text.
(()=>{
  const BUILD='v44.7';
  window.TRTS_BUILD=BUILD;
  window.TRTS_MODERN_RUNTIME=true;
  window.TRTS_RENDER_BUILD=()=>{
    const button=document.getElementById('trts-update');
    if(button){
      let label=button.querySelector('span');
      if(!label){
        label=document.createElement('span');
        button.replaceChildren(document.createTextNode('↻ Оновити '),label);
      }
      const text='TEST · '+BUILD;
      if(label.textContent!==text)label.textContent=text;
    }
    if(document.documentElement.dataset.trtsBuild!==BUILD)
      document.documentElement.dataset.trtsBuild=BUILD;
  };
})();
