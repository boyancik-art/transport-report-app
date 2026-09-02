(()=>{
 let current={kind:'tab',key:'dashboard'},history=[],replaying=false,reportRestore=null,touch=null;
 const O=TRTS_OPS,originals={};
 function push(next){if(replaying)return;if(JSON.stringify(next)===JSON.stringify(current))return;history.push(current);if(history.length>50)history.shift();current=next}
 window.v445DeleteButton=id=>TRTS_SECURITY.isAdmin()?'<button type="button" class="v445-route-delete v443-danger" onclick="event.stopPropagation();v443DeleteRoute('+Number(id)+')"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg>Видалити маршрут</button>':'';
 function adminDelete(id){if(!TRTS_SECURITY.isAdmin())return;const host=O.view().querySelector('.v436-detail-head,.v437-detail-head');if(host&&!host.parentElement.querySelector('.v443-delete,.v445-route-delete')){const b=document.createElement('button');b.className='v443-delete v443-danger';b.textContent='Видалити маршрут';b.onclick=()=>window.v443DeleteRoute(id);host.append(b)}}
 for(const name of ['v43OpenRoute','v437PickupRoute','v43OpenTT']){
  originals[name]=window[name];window[name]=(...args)=>{push({kind:name,args});const result=originals[name](...args);if(name!=='v43OpenTT')adminDelete(args[0]);return result};
 }
 function restore(item){replaying=true;try{current=item;if(item.kind==='tab')v442Nav(item.key);else if(item.kind==='report')item.restore?.();else window[item.kind]?.(...item.args)}finally{replaying=false}}
 function back(){
  for(const id of ['v431-modal','v43-modal']){const node=document.getElementById(id);if(node?.style.display==='block'){(id==='v431-modal'?v431CloseModal:v43CloseModal)();return}}
  if(current.kind==='tab'&&TRTS_APP.current()==='menu'&&TRTS_SETTINGS.back())return;
  if((current.kind==='tab'||current.kind==='report')&&['dashboard','analytics'].includes(TRTS_APP.current())&&TRTS_DASHBOARD.back())return;
  if(history.length)restore(history.pop());else v442Nav('routes');
 }
 // Existing back buttons use the same history as the edge gesture.
 document.addEventListener('click',e=>{const button=e.target.closest('.v43-back,.v437-detail-head>button:first-child');if(button){e.preventDefault();e.stopImmediatePropagation();back()}},true);
 document.addEventListener('touchstart',e=>{const t=e.touches[0];touch=e.touches.length===1&&t.clientX<=26&&!e.target.closest('input,select,textarea,[role=slider]')?{x:t.clientX,y:t.clientY,time:Date.now()}:null},{passive:true});
 document.addEventListener('touchmove',e=>{if(!touch)return;const t=e.touches[0],dx=t.clientX-touch.x,dy=t.clientY-touch.y;if(Math.abs(dy)>50)touch=null;else if(dx>20&&Math.abs(dx)>Math.abs(dy)*1.5)e.preventDefault()},{passive:false});
 document.addEventListener('touchend',e=>{if(!touch)return;const t=e.changedTouches[0],ok=t.clientX-touch.x>75&&Math.abs(t.clientY-touch.y)<50&&Date.now()-touch.time<800;touch=null;if(ok)back()},{passive:true});
 let deleting=false;
 window.v443DeleteRoute=async id=>{
  if(deleting||!TRTS_SECURITY.isAdmin())return;const r=O.dat().routes.find(x=>+x.id===+id);if(!r||!confirm('Видалити маршрут '+r.route_delivery_id+'? Цю дію неможливо скасувати.'))return;
  deleting=true;try{const result=await api('/rest/v1/rpc/transport_archive_route',{method:'POST',body:JSON.stringify({target_route_id:Number(id)})});if(!result?.ok)throw Error('Видалення не підтверджено');history=[];current={kind:'tab',key:'routes'};v442Nav('routes');await v435Refresh()}catch(e){alert('Не видалено: '+e.message)}finally{deleting=false}
 };
 window.v443DeleteManualRoute=async id=>{if(deleting||!TRTS_SECURITY.isAdmin()||!confirm('Видалити маршрут '+id+'? Цю дію неможливо скасувати.'))return;deleting=true;try{const result=await api('/rest/v1/rpc/transport_archive_manual_route',{method:'POST',body:JSON.stringify({target_route_id:Number(id)})});if(!result?.ok)throw Error('Видалення не підтверджено');await v435Refresh()}catch(e){alert(e.message)}finally{deleting=false}};
 window.TRTS_NAVIGATION={tab:key=>{if(!replaying)push({kind:'tab',key})},capture:()=>{},reportReturn:restore=>{current={kind:'report',restore}},back,reset:()=>{history=[];current={kind:'tab',key:'dashboard'}}};
})();
