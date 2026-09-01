(()=>{
const css=`
/* Force the same mobile-first shell on laptop and phone. */
.wrap{max-width:560px!important;margin:0 auto!important;padding:11px!important;padding-bottom:88px!important}
.nav{display:none!important}
.bottom{display:grid!important;grid-template-columns:repeat(5,1fr)!important;position:fixed!important;bottom:0!important;left:50%!important;right:auto!important;transform:translateX(-50%)!important;width:min(560px,100%)!important;background:#fff!important;border-top:1px solid var(--line)!important;z-index:30!important;padding-bottom:env(safe-area-inset-bottom)!important}
.bottom button{border:0!important;background:#fff!important;padding:10px 2px!important;font-size:10px!important;color:#555!important}.bottom button b{display:block!important;font-size:20px!important;margin-bottom:2px!important}
.top{max-width:560px!important;margin:0 auto!important;padding:8px 11px!important}.top .sub{display:none!important}.top .btn{margin-left:auto!important}
.kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}
.grid2,.tiles,.cost-blocks,.week-strip{grid-template-columns:1fr!important}
.route-grid,.tt-metrics,.route-card-v19 .route-summary{grid-template-columns:1fr 1fr!important}
.formgrid,.fact-grid{grid-template-columns:1fr!important}
.formgrid .full{grid-column:auto!important}
.data-controls{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}.data-controls>*{width:100%!important;min-width:0!important;flex:none!important}
.data-controls .btn{width:100%!important}
.route-card,.route-card-v19,.fact-editor,.route-detail-head,.tt-route,.doc-list{max-width:100%!important}
.warehouse-head,.head,.route-top,.doc-mini-top{align-items:flex-start!important;flex-wrap:wrap!important}
.tablecard{overflow:visible!important}.mobile-hide{display:none!important}
.val{font-size:22px!important}.route-card,.route-card-v19{padding:13px!important}
@media(min-width:561px){body{background:var(--bg)!important}.top{border-left:1px solid #0000;border-right:1px solid #0000}}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
})();
