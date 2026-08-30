import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';

await mkdir('dist',{recursive:true});
for(const f of ['index.html','manifest.webmanifest','sw.js','patch-v15.js']) await copyFile(f,'dist/'+f);

// iOS uses a real pre-generated 180x180 static PNG. No runtime image processing.
await copyFile('apple-touch-icon-v14.png','dist/apple-touch-icon-v14.png');

const b64=(await readFile('../assets/app_icon.png.b64','utf8')).trim();
const source=Buffer.from(b64,'base64');
for(const f of ['icon.png','icon-192.png','icon-512.png']) await writeFile('dist/'+f,source);

let html=await readFile('dist/index.html','utf8');
html=html
  .replace(/<link rel="manifest" href="[^"]+">/,'<link rel="manifest" href="/manifest.webmanifest?v=15">')
  .replace(/<link rel="apple-touch-icon"[^>]*>/,'<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-v14.png">')
  .replace(/<link rel="apple-touch-icon-precomposed"[^>]*>/g,'')
  .replace('</body>','<script src="/patch-v15.js?v=15"></script></body>');
await writeFile('dist/index.html',html);
console.log('Transport Report TS PWA v15 built');
