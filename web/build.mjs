import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';

await mkdir('dist',{recursive:true});
for(const f of ['index.html','manifest.webmanifest','sw.js']) await copyFile(f,'dist/'+f);

// Keep the Vercel build deterministic: decode the approved static artwork only.
// No native image-processing dependency is required during deployment.
const b64=(await readFile('../assets/app_icon.png.b64','utf8')).trim();
const source=Buffer.from(b64,'base64');
for(const f of ['icon.png','apple-touch-icon.png','apple-touch-icon-precomposed.png','icon-192.png','icon-512.png']) {
  await writeFile('dist/'+f,source);
}

let html=await readFile('dist/index.html','utf8');
html=html
  .replace(/<link rel="manifest" href="[^"]+">/,'<link rel="manifest" href="/manifest.webmanifest?v=11">')
  .replace(/<link rel="apple-touch-icon"[^>]*href="[^"]+">(?:<link rel="apple-touch-icon-precomposed"[^>]*>)?/,'<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=11"><link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png?v=11">');
await writeFile('dist/index.html',html);
console.log('Transport Report TS PWA built with static approved icon');
