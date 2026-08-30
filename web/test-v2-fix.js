(()=>{
  const tabHost=document.getElementById('tabs');
  const refreshBtn=document.querySelector('.iconbtn');
  const choiceHost=document.getElementById('choices');

  if(tabHost){
    tabHost.addEventListener('click',e=>{
      const btn=e.target.closest('.tab');
      if(!btn)return;
      e.preventDefault();
      const label=btn.querySelector('b')?.textContent?.trim();
      if(!label)return;
      active=label;
      render();
    });
  }

  if(refreshBtn){
    refreshBtn.removeAttribute('onclick');
    refreshBtn.addEventListener('click',async e=>{
      e.preventDefault();
      refreshBtn.disabled=true;
      const prev=refreshBtn.textContent;
      refreshBtn.textContent='…';
      try{await load()}finally{refreshBtn.disabled=false;refreshBtn.textContent=prev||'↻'}
    });
  }

  const originalOpenSheet=window.openSheet;
  window.openSheet=function(id){
    selected=routes.find(r=>Number(r.id)===Number(id));
    if(!selected)return;
    sheetExp.textContent=selected.expeditor_name||'Невідомий експедитор';
    const blocks=['STV','SAV','ФОП','Курʼєрські','Поповнення філій','Пекарня/Фреш','Самовивіз'];
    choices.innerHTML='';
    blocks.forEach(name=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='choice';
      b.textContent=name;
      b.addEventListener('click',()=>saveRule(name));
      choices.appendChild(b);
    });
    sheet.classList.remove('hide');
  };

  document.getElementById('day')?.addEventListener('change',()=>load());
})();