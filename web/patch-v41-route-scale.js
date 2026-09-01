(()=>{
const BUILD='v41.5';
const style=document.createElement('style');
style.textContent=`
/* v41.5: larger route cards on iPhone */
.pk-route{padding:15px!important;border-radius:18px!important}
.pk-topline{font-size:13px!important;line-height:1.25!important;margin-bottom:10px!important}
.pk-topline b{font-size:14px!important}
.pk-exp{min-height:54px!important;padding:0 14px!important;border-radius:14px!important;font-size:16px!important;line-height:1.2!important;font-weight:900!important;display:flex!important;align-items:center!important}
.pk-switch{min-width:52px!important;width:52px!important;height:52px!important;border-radius:13px!important;font-size:23px!important}
.pk-warehouse{padding:13px 14px!important;margin-top:10px!important;border-radius:14px!important;min-height:66px!important}
.pk-route .pk-lab{font-size:10px!important;letter-spacing:.65px!important}
.pk-warehouse .pk-val{font-size:16px!important;line-height:1.2!important;margin-top:5px!important}
.pk-three{gap:9px!important;margin-top:10px!important}
.pk-three>div{padding:12px 13px!important;min-height:68px!important;border-radius:14px!important}
.pk-three .pk-val{font-size:17px!important;line-height:1.2!important;margin-top:5px!important}
.pk-sum{padding:12px 14px!important;min-height:66px!important;margin-top:10px!important;border-radius:14px!important}
.pk-sum .pk-val{font-size:18px!important;line-height:1.2!important;margin-top:5px!important}
@media(max-width:390px){
 .pk-route{padding:14px!important}
 .pk-exp{font-size:15.5px!important}
 .pk-warehouse .pk-val{font-size:15.5px!important}
 .pk-three .pk-val{font-size:16.5px!important}
}
`;
document.head.appendChild(style);
const up=document.getElementById('trts-update');if(up){const s=up.querySelector('span');if(s)s.textContent='TEST · '+BUILD}
document.documentElement.dataset.trtsBuild=BUILD;
})();