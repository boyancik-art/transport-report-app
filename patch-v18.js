(()=>{
const css=`
/* Keep TT navigation visually identical on laptop and phone. */
.tt-route{max-width:820px;margin:14px auto 0}
.tt-route-head{display:block!important}
.tt-route-head .tag{display:inline-block;margin-top:7px}
.tt-list{display:grid!important;grid-template-columns:1fr!important;gap:8px!important}
.tt-card{width:100%;padding:13px!important}
.tt-grid{display:none!important}
.tt-metrics{grid-template-columns:repeat(2,minmax(0,1fr))!important}
.doc-list,.route-card.section+ h3 + div{max-width:820px}
.doc-card-v17{width:100%}
@media(min-width:651px){
 .tt-name{font-size:15px!important}
 .tt-address{font-size:12px!important}
 .tt-metric span{font-size:10px!important}
 .tt-metric b{font-size:13px!important}
}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
})();
