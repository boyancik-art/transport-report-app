/* Retail WT transport directions — runtime enrichment only; does not rewrite approved directory storage. */
(()=>{'use strict';
const D=window.RetailDirectories;if(!D||typeof D.stores!=='function')return;
const original=D.stores.bind(D);
const norm=s=>String(s||'').toLowerCase().replace(/[ії]/g,'і').replace(/[^a-zа-я0-9]+/gi,' ').trim();
const west=['чернівці','луцьк','хмельницький','ужгород','івано франківськ','крихівці','рівне','львів','тернопіль','вінниця'];
const east=['чернігів','черкаси','полтава','кременчук','дніпро'];
function direction(x){if(x.direction)return x.direction;const t=norm(`${x.name||''} ${x.city||''} ${x.address||''}`);if(west.some(v=>t.includes(norm(v))))return'Захід';if(east.some(v=>t.includes(norm(v))))return'Схід';if(t.includes('київ')||t.includes('козин')||t.includes('стоянка')||t.includes('соф борщагів')||t.includes('столичний'))return'Київ';return''}
D.stores=()=>original().map(x=>({...x,direction:direction(x)}));
window.RetailStoreDirection={direction};
})();