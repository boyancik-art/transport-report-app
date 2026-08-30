import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import sharp from 'sharp';

await mkdir('dist',{recursive:true});
for(const f of ['index.html','manifest.webmanifest','sw.js']) await copyFile(f,'dist/'+f);

const b64=(await readFile('../assets/app_icon.png.b64','utf8')).trim();
const source=Buffer.from(b64,'base64');

await sharp(source).resize(180,180,{fit:'cover'}).png().toFile('dist/apple-touch-icon.png');
await sharp(source).resize(192,192,{fit:'cover'}).png().toFile('dist/icon-192.png');
await sharp(source).resize(512,512,{fit:'cover'}).png().toFile('dist/icon-512.png');
await sharp(source).resize(180,180,{fit:'cover'}).png().toFile('dist/icon.png');

let html=await readFile('dist/index.html','utf8');
html=html
  .replace('<link rel="manifest" href="/manifest.webmanifest">','<link rel="manifest" href="/manifest.webmanifest?v=3">')
  .replace('<link rel="apple-touch-icon" href="/icon.png">','<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=3">');
await writeFile('dist/index.html',html);

console.log('Transport Report TS PWA built with dedicated iOS touch icon');