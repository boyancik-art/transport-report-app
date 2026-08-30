import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import sharp from 'sharp';

await mkdir('dist',{recursive:true});
for(const f of ['index.html','manifest.webmanifest','sw.js']) await copyFile(f,'dist/'+f);

const b64=(await readFile('../assets/app_icon.png.b64','utf8')).trim();
const source=Buffer.from(b64,'base64');
await writeFile('dist/icon.png',source);

// Use the approved artwork, crop only empty/near-white outer margins and enlarge it.
// Sharp handles PNG variants safely and consistently in Vercel builds.
const base=sharp(source).trim({background:'#ffffff',threshold:12});
async function makeIcon(size){
  const artwork=await base.clone().resize({width:Math.round(size*0.78),height:Math.round(size*0.78),fit:'inside',withoutEnlargement:false}).png().toBuffer();
  const meta=await sharp(artwork).metadata();
  return sharp({create:{width:size,height:size,channels:4,background:'#ffffff'}})
    .composite([{input:artwork,left:Math.floor((size-meta.width)/2),top:Math.floor((size-meta.height)/2)}])
    .png().toBuffer();
}
const [i180,i192,i512]=await Promise.all([makeIcon(180),makeIcon(192),makeIcon(512)]);
await writeFile('dist/apple-touch-icon.png',i180);
await writeFile('dist/apple-touch-icon-precomposed.png',i180);
await writeFile('dist/icon-192.png',i192);
await writeFile('dist/icon-512.png',i512);

let html=await readFile('dist/index.html','utf8');
html=html
  .replace(/<link rel="manifest" href="[^"]+">/,'<link rel="manifest" href="/manifest.webmanifest?v=10">')
  .replace(/<link rel="apple-touch-icon"[^>]*href="[^"]+">(?:<link rel="apple-touch-icon-precomposed"[^>]*>)?/,'<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=10"><link rel="apple-touch-icon-precomposed" sizes="180x180" href="/apple-touch-icon-precomposed.png?v=10">');
await writeFile('dist/index.html',html);
console.log('Transport Report TS PWA built with readable iOS icon');
