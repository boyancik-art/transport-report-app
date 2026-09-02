(()=>{
  const originalApi=window.api;
  if(typeof originalApi==='function'){
    window.api=async function(path,opt={}){
      if(window.TRTS_MODERN_RUNTIME&&typeof token!=='undefined'&&!token)throw new Error('Потрібно увійти в застосунок');
      if(typeof path==='string' && path.startsWith('/rest/v1/cube_imports?')){
        try{return await originalApi(path,opt)}catch(e){console.warn('v39 cube_imports fallback:',e?.message||e);return []}
      }
      return originalApi(path,opt);
    };
  }

  window.dataTag=document.getElementById('dataTag')||{textContent:''};

  const style=document.createElement('style');
  style.textContent=`
    #login.hide{display:none!important}
    #login[style*="display: none"]{display:none!important}
    .loginbox .logo{display:block!important;margin:0 auto 16px!important}
    .top{padding-top:calc(10px + env(safe-area-inset-top))!important;min-height:calc(70px + env(safe-area-inset-top))!important}
    .wrap{padding-top:14px!important}
    .filters{margin-top:0!important}
    @media(max-width:600px){.top{padding-left:16px!important;padding-right:16px!important}.brand{font-size:17px!important}.wrap{padding-left:12px!important;padding-right:12px!important}}
  `;
  document.head.appendChild(style);

  function fixLogo(){
    document.querySelectorAll('img.logo').forEach(img=>{
      if(!img.dataset.v39logo){img.dataset.v39logo='1';img.src='./icon.png?v=393'}
      img.onerror=()=>{
        const b=document.createElement('div');
        b.className='logo';
        b.style.cssText='display:grid;place-items:center;margin:0 auto 16px;background:#fff;color:#2f7bff;font-weight:900;font-size:25px;border-radius:18px';
        b.textContent='TS';
        img.replaceWith(b);
      };
    });
  }

  function syncAuthUi(){
    const l=document.getElementById('login'),a=document.getElementById('app');
    const hasToken=!!localStorage.getItem('trts_token');
    if(l&&a&&hasToken){l.classList.add('hide');l.style.display='none';a.classList.remove('hide')}
    if(!hasToken&&l){l.style.removeProperty('display');l.classList.remove('hide')}
    fixLogo();
  }

  async function fallbackLoad(){
    const v=document.getElementById('view');
    try{
      const d=document.getElementById('date')?.value||new Date().toISOString().slice(0,10);
      const routes=await window.api('/rest/v1/routes?select=id,route_date,route_delivery_id,expeditor_name,warehouse,total_points,total_documents,total_weight,total_pallets,total_bottles,total_order_amount&route_date=eq.'+d+'&order=route_delivery_id');
      window.D={...(window.D||{}),routes:routes||[],points:[],facts:[],alloc:[],manual:[],docs:[],locations:[],carriers:[],waves:[],drivers:[]};
      if(typeof window.logistics==='function') window.logistics();
      else if(v) v.innerHTML='<div class="empty39">Дані завантажено. Оновіть екран ще раз.</div>';
    }catch(e){if(v)v.innerHTML='<div class="empty39">Помилка завантаження: '+String(e?.message||e)+'</div>'}
  }

  function showShellNow(){
    const v=document.getElementById('view');
    if(!v)return;
    if(typeof window.logistics==='function'){
      try{window.D=window.D||{routes:[],points:[],facts:[],alloc:[],manual:[],docs:[],locations:[],carriers:[],waves:[],drivers:[]};window.logistics();return}catch(e){}
    }
    v.innerHTML='<div class="empty39">Завантаження маршрутів…</div>';
  }

  syncAuthUi();
  if(!window.TRTS_MODERN_RUNTIME&&localStorage.getItem('trts_token')){
    showShellNow();
    setTimeout(()=>{
      const v=document.getElementById('view');
      if(v && !v.textContent.trim()) fallbackLoad();
    },2500);
    setTimeout(()=>{
      const v=document.getElementById('view');
      if(v && (/Завантаження/.test(v.textContent)||!v.textContent.trim())) fallbackLoad();
    },7000);
  }
})();