import {mkdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {deflateSync,inflateSync} from 'node:zlib';

await mkdir('dist',{recursive:true});
for(const f of ['index.html','manifest.webmanifest','sw.js']) await copyFile(f,'dist/'+f);

const b64=(await readFile('../assets/app_icon.png.b64','utf8')).trim();
const source=Buffer.from(b64,'base64');
await writeFile('dist/icon.png',source);

function chunk(type,data){
  const typeBuf=Buffer.from(type),len=Buffer.alloc(4),crcBuf=Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  let crc=0xffffffff;
  for(const b of Buffer.concat([typeBuf,data])){crc^=b;for(let k=0;k<8;k++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
  crcBuf.writeUInt32BE((crc^0xffffffff)>>>0);
  return Buffer.concat([len,typeBuf,data,crcBuf]);
}
function readPngRGBA(buf){
  const w=buf.readUInt32BE(16),h=buf.readUInt32BE(20),bit=buf[24],color=buf[25];
  if(bit!==8||color!==6) throw new Error('Expected approved RGBA PNG');
  let p=8,id=[];
  while(p<buf.length){const n=buf.readUInt32BE(p),t=buf.toString('ascii',p+4,p+8);if(t==='IDAT')id.push(buf.subarray(p+8,p+8+n));p+=12+n}
  const raw=inflateSync(Buffer.concat(id)),stride=w*4,out=Buffer.alloc(w*h*4),prev=Buffer.alloc(stride);let rp=0;
  for(let y=0;y<h;y++){
    const f=raw[rp++],row=Buffer.from(raw.subarray(rp,rp+stride));rp+=stride;
    for(let x=0;x<stride;x++){
      const a=x>=4?row[x-4]:0,b=prev[x],c=x>=4?prev[x-4]:0;let v=row[x];
      if(f===1)v=(v+a)&255;else if(f===2)v=(v+b)&255;else if(f===3)v=(v+Math.floor((a+b)/2))&255;else if(f===4){const q=a+b-c,pa=Math.abs(q-a),pb=Math.abs(q-b),pc=Math.abs(q-c);v=(v+(pa<=pb&&pa<=pc?a:pb<=pc?b:c))&255}
      row[x]=v;
    }
    row.copy(out,y*stride);row.copy(prev);
  }
  return{w,h,pix:out};
}
function pngRGBA(w,h,pix){
  const sig=Buffer.from('89504e470d0a1a0a','hex'),ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=6;
  const rows=[];for(let y=0;y<h;y++)rows.push(Buffer.concat([Buffer.from([0]),pix.subarray(y*w*4,(y+1)*w*4)]));
  return Buffer.concat([sig,chunk('IHDR',ih),chunk('IDAT',deflateSync(Buffer.concat(rows),{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
const {w,h,pix}=readPngRGBA(source);

// Detect the visible approved logo against its white background, crop the empty
// margin, and enlarge only the existing artwork. No redesign or new artwork.
let minX=w,minY=h,maxX=-1,maxY=-1;
for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=(y*w+x)*4,r=pix[i],g=pix[i+1],b=pix[i+2],a=pix[i+3];
  if(a>20 && (r<242||g<242||b<242)){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)}
}
if(maxX<minX){minX=0;minY=0;maxX=w-1;maxY=h-1}
const bw=maxX-minX+1,bh=maxY-minY+1;
function makeIcon(size){
  const out=Buffer.alloc(size*size*4,255),target=Math.round(size*0.78),scale=Math.min(target/bw,target/bh),dw=Math.max(1,Math.round(bw*scale)),dh=Math.max(1,Math.round(bh*scale)),ox=Math.floor((size-dw)/2),oy=Math.floor((size-dh)/2);
  for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
    const sx=minX+Math.min(bw-1,Math.floor(x/scale)),sy=minY+Math.min(bh-1,Math.floor(y/scale)),si=(sy*w+sx)*4,di=((oy+y)*size+(ox+x))*4;
    pix.copy(out,di,si,si+4);
  }
  return pngRGBA(size,size,out);
}
const i180=makeIcon(180),i192=makeIcon(192),i512=makeIcon(512);
await writeFile('dist/apple-touch-icon.png',i180);
await writeFile('dist/apple-touch-icon-precomposed.png',i180);
await writeFile('dist/icon-192.png',i192);
await writeFile('dist/icon-512.png',i512);

let html=await readFile('dist/index.html','utf8');
html=html
  .replace(/<link rel="manifest" href="[^"]+">/,'<link rel="manifest" href="/manifest.webmanifest?v=9">')
  .replace(/<link rel="apple-touch-icon"[^>]*href="[^"]+">(?:<link rel="apple-touch-icon-precomposed"[^>]*>)?/,'<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=9"><link rel="apple-touch-icon-precomposed" sizes="180x180" href="/apple-touch-icon-precomposed.png?v=9">');
await writeFile('dist/index.html',html);
console.log('Transport Report TS PWA built with readable iOS icon');
