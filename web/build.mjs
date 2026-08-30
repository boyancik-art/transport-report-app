import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';

await mkdir('dist',{recursive:true});
for(const f of ['index.html','manifest.webmanifest','sw.js']) await copyFile(f,'dist/'+f);

// Decode the approved Transport Report TS artwork only; no image generation in Vercel.
const b64=(await readFile('../assets/app_icon.png.b64','utf8')).trim();
const source=Buffer.from(b64,'base64');
for(const f of ['icon.png','apple-touch-icon-v12.png','icon-192-v12.png','icon-512-v12.png']) {
  await writeFile('dist/'+f,source);
}

let html=await readFile('dist/index.html','utf8');
html=html
  .replace(/<link rel="manifest" href="[^"]+">/,'<link rel="manifest" href="/manifest.webmanifest?v=12">')
  .replace(/<link rel="apple-touch-icon"[^>]*href="[^"]+">(?:<link rel="apple-touch-icon-precomposed"[^>]*>)?/,'<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-v12.png"><link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-v12.png">');
await writeFile('dist/index.html',html);
console.log('Transport Report TS PWA built with fresh iOS icon v12');
