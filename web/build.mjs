import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import sharp from 'sharp';

await mkdir('dist',{recursive:true});
for(const f of ['index.html','manifest.webmanifest','sw.js']) await copyFile(f,'dist/'+f);

const b64=(await readFile('../assets/app_icon.png.b64','utf8')).trim();
const source=Buffer.from(b64,'base64');

await sharp(source).resize(180,180).png().toFile('dist/icon.png');
await sharp(source).resize(192,192).png().toFile('dist/icon-192.png');
await sharp(source).resize(512,512).png().toFile('dist/icon-512.png');

console.log('Transport Report TS PWA built with valid iOS/PWA icons');