import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';

await mkdir('dist',{recursive:true});
for(const f of ['index.html','manifest.webmanifest','sw.js']) await copyFile(f,'dist/'+f);

const b64=(await readFile('../assets/app_icon.png.b64','utf8')).trim();
const source=Buffer.from(b64,'base64');

// Keep the approved source icon for the in-app logo.
await writeFile('dist/icon.png',source);

// The approved source is 128x128. Build crisp nearest-neighbour PNGs without
// external image dependencies so Vercel can always generate the exact sizes.
function chunks(type,data){
  const typeBuf=Buffer.from(type);
  const len=Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf=Buffer.alloc(4);
  let crc=0xffffffff;
  for(const b of Buffer.concat([typeBuf,data])){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
  crcBuf.writeUInt32BE((crc^0xffffffff)>>>0);
  return Buffer.concat([len,typeBuf,data,crcBuf]);
}
function readPngRGBA(buf){
  const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20),bit=buf[24],color=buf[25];
  if(bit!==8||color!==6) throw new Error('Expected approved RGBA PNG');
  let p=8,id=[];while(p<buf.length){const n=buf.readUInt32BE(p),t=buf.toString('ascii',p+4,p+8);if(t==='IDAT')id.push(buf.subarray(p+8,p+8+n));p+=12+n}
  const raw=(await import('node:zlib')).inflateSync(Buffer.concat(id));
  const stride=w*4,out=Buffer.alloc(w*h*4),prev=Buffer.alloc(stride);let rp=0;
  for(let y=0;y<h;y++){const f=raw[rp++],row=Buffer.from(raw.subarray(rp,rp+stride));rp+=stride;for(let x=0;x<stride;x++){const a=x>=4?row[x-4]:0,b=prev[x],c=x>=4?prev[x-4]:0;let v=row[x];if(f===1)v=(v+a)&255;else if(f===2)v=(v+b)&255;else if(f===3)v=(v+Math.floor((a+b)/2))&255;else if(f===4){const q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);v=(v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c))&255}row[x]=v}row.copy(out,y*stride);row.copy(prev)}return{w,h,pix:out};
}
function pngRGBA(w,h,pix){const sig=Buffer.from('89504e470d0a1a0a','hex'),ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;const rows=[];for(let y=0;y<h;y++)rows.push(Buffer.concat([Buffer.from([0]),pix.subarray(y*w*4,(y+1)*w*4)]));return Buffer.concat([sig,chunks('IHDR',ih),chunks('IDAT',deflateSync(Buffer.concat(rows),{level:9})),chunks('IEND',Buffer.alloc(0))])}
const {w,h,pix}=await readPngRGBA(source);
function scale(size){const out=Buffer.alloc(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const sx=Math.min(w-1,Math.floor(x*w/size)),sy=Math.min(h-1,Math.floor(y*h/size));pix.copy(out,(y*size+x)*4,(sy*w+sx)*4,(sy*w+sx)*4+4)}return pngRGBA(size,size,out)}
const i180=scale(180),i192=scale(192),i512=scale(512);
await writeFile('dist/apple-touch-icon.png',i180);
await writeFile('dist/apple-touch-icon-precomposed.png',i180);
await writeFile('dist/icon-192.png',i192);
await writeFile('dist/icon-512.png',i512);

let html=await readFile('dist/index.html','utf8');
html=html
  .replace(/<link rel="manifest" href="[^"]+">/,'<link rel="manifest" href="/manifest.webmanifest?v=8">')
  .replace(/<link rel="apple-touch-icon"[^>]*href="[^"]+">(?:<link rel="apple-touch-icon-precomposed"[^>]*>)?/,'<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=8"><link rel="apple-touch-icon-precomposed" sizes="180x180" href="/apple-touch-icon-precomposed.png?v=8">');
await writeFile('dist/index.html',html);
console.log('Transport Report TS PWA built with exact iOS icon sizes');
