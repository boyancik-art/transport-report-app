(()=>{'use strict';
// Temporary manual-test compatibility layer has been retired.
// Canonical store/address rendering and actual-pallet editing now live in native runtimes.
function darkFix(){const id='manual-test-dark-fix';if(document.getElementById(id))return;const s=document.createElement('style');s.id=id;s.textContent='.ops-panel,.ref-cards a{background:#0e1a25!important;color:#fff!important;border-color:#26394a!important}.ops-flow>div{border-color:#26394a!important}.ops-flow span,.ref-cards span{color:#aeb9c4!important}.ops-register input[type=number]{background:#111923;color:#fff;border:1px solid #506274}';document.head.append(s)}
darkFix();
window.RetailManualTestStabilization={canonicalAddress:false,actualPalletsInline:false,retired:true};
})();
