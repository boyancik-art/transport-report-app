const CACHE='transport-report-ts-v43-9-runtime-4390';
const ASSETS=['./manifest.webmanifest?v=4390','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).catch(()=>{}));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const req=e.request;e.respondWith(fetch(req,{cache:'no-store'}).then(r=>r).catch(()=>caches.match(req)))})
