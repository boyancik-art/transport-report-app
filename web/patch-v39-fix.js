(()=>{
  const originalApi=window.api;
  if(typeof originalApi==='function'){
    window.api=async function(path,opt={}){
      if(typeof path==='string' && path.startsWith('/rest/v1/cube_imports?')){
        try{return await originalApi(path,opt)}catch(e){console.warn('v39 cube_imports fallback:',e?.message||e);return []}
      }
      return originalApi(path,opt);
    };
  }

  // Safari/PWA does not reliably expose element ids as global variables.
  window.dataTag=document.getElementById('dataTag')||{textContent:''};

  const style=document.createElement('style');
  style.textContent='#login.hide{display:none!important}#login[style*="display: none"]{display:none!important}.loginbox .logo{display:block!important;margin:0 auto 16px!important}';
  document.head.appendChild(style);

  function fixLogo(){
    document.querySelectorAll('img.logo').forEach(img=>{
      img.src='./icon.png?v=392';
      img.onerror=()=>{
        const b=document.createElement('div');
        b.className='logo';
        b.style.cssText='display:grid;place-items:center;margin:0 auto 16px;background:#fff;color:#2f7bff;font-weight:900;font-size:25px';
        b.textContent='TS';
        img.replaceWith(b);
      };
    });
  }

  function syncAuthUi(){
    const l=document.getElementById('login'),a=document.getElementById('app');
    const hasToken=!!localStorage.getItem('trts_token');
    if(l&&a&&hasToken&&!a.classList.contains('hide')){
      l.classList.add('hide');
      l.style.display='none';
    }
    if(!hasToken&&l){l.style.removeProperty('display');l.classList.remove('hide')}
    fixLogo();
    const u=document.getElementById('trts-update');
    if(u){const s=u.querySelector('span');if(s)s.textContent='TEST · v39'}
  }

  const oldStart=window.start;
  if(typeof oldStart==='function'){
    window.start=async function(...args){
      const result=await oldStart.apply(this,args);
      syncAuthUi();
      return result;
    };
  }

  const oldSignIn=window.signIn;
  if(typeof oldSignIn==='function'){
    window.signIn=async function(...args){
      const result=await oldSignIn.apply(this,args);
      setTimeout(syncAuthUi,0);
      setTimeout(syncAuthUi,250);
      return result;
    };
  }

  syncAuthUi();
  new MutationObserver(syncAuthUi).observe(document.body,{subtree:true,attributes:true,attributeFilter:['class']});
})();