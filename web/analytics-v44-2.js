// Read-only presentation totals. Money is summed in cents; no tariff is recalculated here.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.TRTS_ANALYTICS=api})(typeof window==='undefined'?globalThis:window,()=>{
 const text=v=>String(v??'').trim(),num=v=>Number(v)||0,cents=v=>Math.round(num(v)*100);
 const UNKNOWN_BRANCH='Філію не визначено',UNKNOWN_BUSINESS='Бізнес не визначено';
 const cities=['Біла Церква','Білогородка','Вінниця','Дніпро','Житомир','Запоріжжя','Київ','Кременчук','Кривий Ріг','Луцьк','Львів','Миколаїв','Мукачево','Одеса','Полтава','Рівне','Тернопіль','Умань','Харків','Хмельницький','Черкаси','Чернівці'];
 function branch(value){const name=text(value).replace(/\s+(STV|SAV|Ecol|TS|ТС)$/i,'').trim();if(/^Чайки$/i.test(name))return'Київ';if(/^(Ів\.?-?\s?Франківськ|Івано-Франківськ)$/i.test(name))return'Івано-Франківськ';return cities.find(c=>c.toLocaleLowerCase('uk-UA')===name.toLocaleLowerCase('uk-UA'))||UNKNOWN_BRANCH}
 function business(value,map={}){const name=text(map[text(value)]||value);if(/horeca/i.test(name))return'HoReCa';if(/крафт|craft/i.test(name))return'Крафт';if(/дистриб|distrib|(^|\s)опт(\s|$)/i.test(name))return'Дистрибуція';return UNKNOWN_BUSINESS}
 function total(lines){const points=new Map();let sales=0,cost=0,pallets=0;const missing=new Set();for(const x of lines){points.set(x.pointId,num(x.tt));sales+=cents(x.sales);cost+=cents(x.cost);pallets+=num(x.pallets);if(x.incomplete)missing.add(x.pointId)}const tt=[...points.values()].reduce((a,b)=>a+b,0);return{tt,pallets,sales:sales/100,cost:cost/100,missing:missing.size,costTT:tt&&!missing.size?cost/100/tt:null,log:sales&&!missing.size?cost/sales*100:null}}
 function group(lines,key){const groups=new Map();for(const x of lines){const name=text(x[key])||"Не визначено";if(!groups.has(name))groups.set(name,[]);groups.get(name).push(x)}return [...groups].map(([name,rows])=>({name,...total(rows)})).sort((a,b)=>a.name.localeCompare(b.name,'uk'))}
 return{branch,business,total,group,cents,UNKNOWN_BRANCH,UNKNOWN_BUSINESS};
});
