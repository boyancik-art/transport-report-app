import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';

await mkdir('dist',{recursive:true});
for(const f of ['index.html','manifest.webmanifest','sw.js']) await copyFile(f,'dist/'+f);

// Keep the PWA build dependency-free on Vercel. The approved app icon is
// already a PNG asset; iOS accepts it for apple-touch-icon and scales it.
const b64=(await readFile('../assets/app_icon.png.b64','utf8')).trim();
const source=Buffer.from(b64,'base64');
await writeFile('dist/apple-touch-icon.png',source);
await writeFile('dist/icon.png',source);
await writeFile('dist/icon-192.png',source);
await writeFile('dist/icon-512.png',source);

let html=await readFile('dist/index.html','utf8');
html=html
  .replace('<link rel="manifest" href="/manifest.webmanifest">','<link rel="manifest" href="/manifest.webmanifest?v=4">')
  .replace('<link rel="apple-touch-icon" href="/icon.png">','<link rel="apple-touch-icon" href="/apple-touch-icon.png?v=4">');
await writeFile('dist/index.html',html);

console.log('Transport Report TS PWA built with iOS touch icon');