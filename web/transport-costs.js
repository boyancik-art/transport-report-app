(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TRTS_COSTS=api})(typeof window==='undefined'?globalThis:window,()=>{
 'use strict';
 const n=x=>{const v=Number(String(x??'').replace(',','.'));return Number.isFinite(v)?v:0};
 const own=name=>String(name||'').trim().replace(/\s+/g,' ').toUpperCase()==='ТОВ ТС ПЛЮС';
 const geo=s=>String(s||'').toLocaleLowerCase('uk-UA').replace(/[’ʼ`]/g,"'").replace(/(?:область|обл\.?|район|р-н)/gu,'').replace(/[^\p{L}\p{N}]/gu,'');
 function share(item,total){let value=0,active=0;for(const [key,w] of [['pals',.3],['bottles',.5],['weight',.2]])if(n(total[key])>0){value+=w*n(item[key])/n(total[key]);active+=w}return active?value/active:(n(total.tt)>0?n(item.tt)/n(total.tt):0)}
 function split(amount,items){
  if(!Number.isFinite(+amount)||+amount<0)throw Error('Сума має бути невід’ємною');
  const cents=Math.round(+amount*100);if(!items.length){if(cents)throw Error('Немає ТТ для розподілу');return[]}
  const total=items.reduce((a,x)=>{for(const k of ['pals','bottles','weight','tt'])a[k]+=n(x[k]);return a},{pals:0,bottles:0,weight:0,tt:0});
  let weights=items.map(x=>share(x,total)),sum=weights.reduce((a,b)=>a+b,0);if(sum<=0){weights=items.map(()=>1);sum=items.length}
  const raw=weights.map(w=>cents*w/sum),parts=raw.map(Math.floor);let rest=cents-parts.reduce((a,b)=>a+b,0);
  const order=raw.map((x,i)=>({i,r:x-parts[i]})).sort((a,b)=>b.r-a.r||a.i-b.i);
  for(let k=0;k<rest;k++)parts[order[k%order.length].i]++;
  return items.map((x,i)=>({id:x.id,cost:parts[i]/100}));
 }
 function geography(location,address){
  return {region:String(location?.region||String(address||'').match(/([^,]+?)\s+обл(?:асть|\.)/iu)?.[1]||'').trim(),district:String(location?.district||String(address||'').match(/(?:^|,)\s*([^,]+?)\s+(?:р-н|район)/iu)?.[1]||'').trim()};
 }
 function zoneQuote({carrier,month,region,district,pallets,zones,rates}){
  const errors=[];if(!region)errors.push('Область не вказана');if(!district)errors.push('Район не вказаний');
  const rows=zones.filter(x=>x.carrier===carrier&&geo(x.region)===geo(region)&&geo(x.district)===geo(district));
  const zone=rows.length===1?rows[0]:null;
  if(!zone)errors.push(rows.length>1?'Дублюється запис області й району':'Не знайдено філію покриття та зону: '+[region,district].filter(Boolean).join(' / '));
  if(zone&&!zone.branch)errors.push('Не вказана філія покриття');
  if(zone&&![1,2,3,4,5].includes(+zone.zone))errors.push('Не вказана зона доставки');
  const rate=rates.find(x=>x.carrier===carrier&&x.month===month);
  if(!rate)errors.push('Не збережено тариф '+carrier+' за '+month.slice(0,7));
  if(rate&&zone&&(rate.tt_fixed==null||rate['zone'+zone.zone]==null))errors.push('Не заповнено тариф ТТ або зони');
  return {branch:zone?.branch||null,zone:zone?.zone||null,region,district,errors,cost:errors.length?null:Math.round((n(rate.tt_fixed)+n(rate['zone'+zone.zone])*n(pallets))*100)/100};
 }
 return {n,own,geo,share,split,geography,zoneQuote};
});
