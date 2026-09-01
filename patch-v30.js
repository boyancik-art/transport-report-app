(()=>{
/* v31: force the new logistics controls to be visible and remove legacy burgundy accents. */
const st=document.createElement('style');st.textContent=`
:root{--accent:#4f72ff!important;--soft:#edf2ff!important;--dark:#111722!important;--ok:#1f8a70!important}
body:before{display:none!important}.top{background:#111722!important}.btn{background:#4f72ff!important}.tag{background:#edf2ff!important;color:#3457d5!important}.nav button.active{background:#4f72ff!important}
html[data-tr-theme="dark"]{--accent:#6f8cff!important;--soft:#18212c!important;--dark:#0e141d!important}
html[data-tr-theme="dark"] .btn{background:#5876f3!important}html[data-tr-theme="dark"] .tag{background:#1b2740!important;color:#9eb1ff!important}
#logDateFilter29{order:-20!important;margin:0 0 10px!important}.filters{display:grid!important;grid-template-columns:1fr!important}.filters>#p20,.filters>#d20,.filters>#w20,.filters>#r20,.filters>.data-controls{display:none!important}
.log-toolbar{display:grid!important}.log-filter-btn{display:flex!important}.multi-wh-wrap{order:-19!important}
`;
document.head.appendChild(st);

function mountLogControls31(){
 if(page!=='logistics')return;
 try{if(typeof mountDateFilter==='function')mountDateFilter()}catch(e){console.warn(e)}
 try{if(typeof mountMultiWarehouse==='function')mountMultiWarehouse()}catch(e){console.warn(e)}
}
const oldGo31=go;go=function(...a){const x=oldGo31(...a);setTimeout(mountLogControls31,0);setTimeout(mountLogControls31,80);return x};
document.addEventListener('click',e=>{if(e.target.closest('.bottom button')||e.target.closest('.nav button'))setTimeout(mountLogControls31,30)},true);
setTimeout(mountLogControls31,100);
})();