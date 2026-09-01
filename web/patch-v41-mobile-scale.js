(()=>{
const BUILD='v41.4';
const style=document.createElement('style');
style.textContent=`
/* v41.4: larger mobile TT/address cards, route summary unchanged */
.pk-address{padding:16px 15px!important;border-radius:18px!important;margin-bottom:14px!important}
.pk-ah{gap:13px!important;align-items:flex-start!important}
.pk-n{min-width:52px!important;width:52px!important;height:52px!important;border-radius:12px!important;font-size:18px!important;display:flex!important;align-items:center!important;justify-content:center!important}
.pk-customer{font-size:17px!important;line-height:1.22!important;font-weight:900!important;letter-spacing:.1px!important}
.pk-addr{font-size:13px!important;line-height:1.38!important;margin-top:5px!important}
.pk-meta{gap:10px!important;margin-top:13px!important}
.pk-meta>div{padding:12px 12px!important;min-height:68px!important;border-radius:13px!important}
.pk-meta .pk-lab{font-size:10px!important;letter-spacing:.7px!important}
.pk-meta .pk-val{font-size:16px!important;line-height:1.2!important;margin-top:5px!important}
.pk-it{font-size:13px!important;margin:16px 0 8px!important}
.pk-invs{gap:9px!important}
.pk-inv{min-height:76px!important;padding:11px 10px!important;border-radius:13px!important;gap:8px!important}
.pk-inv .no{font-size:14px!important;line-height:1.2!important}
.pk-inv .pk-lab{font-size:10px!important;letter-spacing:.6px!important}
.pk-inv b{font-size:14px!important;line-height:1.2!important}
.pk-address-title{font-size:17px!important;margin:20px 0 12px!important}
@media (max-width:390px){
 .pk-address{padding:15px 13px!important}
 .pk-customer{font-size:16px!important}
 .pk-addr{font-size:12.5px!important}
 .pk-meta .pk-val{font-size:15px!important}
 .pk-inv .no,.pk-inv b{font-size:13.5px!important}
}
`;
document.head.appendChild(style);
const up=document.getElementById('trts-update');if(up){const s=up.querySelector('span');if(s)s.textContent='TEST · '+BUILD}
document.documentElement.dataset.trtsBuild=BUILD;
})();