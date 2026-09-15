/* Presentation navigation; operations.js retains all import/document logic. */
(() => {
 const dashboard=document.querySelector('.dashboard'), documents=document.getElementById('ops-documents');
 function navigate(){const target=location.hash.slice(1)||'home',show=target==='documents';dashboard.hidden=show;documents.hidden=!show;let active=false;document.querySelectorAll('.side nav a').forEach(a=>{const match=!active&&a.getAttribute('href')==='#'+target;a.classList.toggle('active',match);if(match)active=true});if(!show&&target!=='home')document.getElementById(target)?.scrollIntoView({block:'nearest'});}
 document.querySelectorAll('[data-documents]').forEach(b=>b.addEventListener('click',()=>{location.hash='documents'}));
 document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(t=>t.classList.toggle('on',t===b));document.querySelectorAll('.routes tbody tr').forEach(r=>{r.hidden=b.dataset.filter!=='all'&&r.dataset.type!==b.dataset.filter});}));
 window.addEventListener('hashchange',navigate);navigate();
})();

