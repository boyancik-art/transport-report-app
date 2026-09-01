(()=>{
  const txt=v=>String(v??'').trim();
  const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0};
  const fmt=v=>new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2}).format(num(v));

  function routeById(id){return (window.D?.routes||[]).find(r=>+r.id===+id)}
  function pointById(id){return (window.D?.points||[]).find(p=>+p.id===+id)}
  function pointDocs(r,p){
    if(!r||!p)return[];
    const loc=(window.D?.locations||[]).find(x=>+x.id===+p.location_id);
    return (window.D?.docs||[]).filter(d=>
      String(d.route_delivery_id)===String(r.route_delivery_id) &&
      txt(d.customer_id)===txt(p.customer_id) &&
      (!loc?.address_id || txt(d.address_id)===txt(loc.address_id))
    );
  }
  function setLabeledValue(root,label,value){
    for(const box of root.querySelectorAll('.mini39,.invgrid39>div')){
      const l=box.querySelector('label');
      if(l&&txt(l.textContent).toLowerCase()===label.toLowerCase()){
        const b=box.querySelector('b'); if(b)b.textContent=value;
      }
    }
  }
  function fixTtScreen(rid,pid){
    const r=routeById(rid),p=pointById(pid); if(!r||!p)return;
    const dd=pointDocs(r,p);
    const total=dd.reduce((s,d)=>s+num(d.bottles),0);
    const tt=document.querySelector('.tt39');
    if(tt)setLabeledValue(tt,'Пляшки',fmt(total));
    const grouped=new Map();
    for(const d of dd){
      const k=txt(d.sale_code)||txt(d.operation_group_id)||String(d.id);
      grouped.set(k,(grouped.get(k)||0)+num(d.bottles));
    }
    for(const card of document.querySelectorAll('.inv39')){
      const title=txt(card.querySelector('b')?.textContent).replace(/^№\s*/,'');
      if(grouped.has(title))setLabeledValue(card,'Пляшок',fmt(grouped.get(title)));
    }
  }
  function fixRouteScreen(rid){
    const r=routeById(rid); if(!r)return;
    const points=(window.D?.points||[]).filter(p=>+p.route_id===+rid);
    const cards=[...document.querySelectorAll('.tt39')];
    cards.forEach((card,i)=>{
      const p=points[i]; if(!p)return;
      const total=pointDocs(r,p).reduce((s,d)=>s+num(d.bottles),0);
      setLabeledValue(card,'Пляшки',fmt(total));
    });
  }

  const oldTT=window.v39TT;
  if(typeof oldTT==='function')window.v39TT=function(rid,pid){const x=oldTT(rid,pid);setTimeout(()=>fixTtScreen(rid,pid),0);return x};
  const oldRoute=window.v39Route;
  if(typeof oldRoute==='function')window.v39Route=function(rid){const x=oldRoute(rid);setTimeout(()=>fixRouteScreen(rid),0);return x};
})();