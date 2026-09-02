const assert=require('node:assert/strict'),{workbook}=require('../web/xlsx-v444.js');
const bytes=Buffer.from(workbook([['Дата','Витрати','Номер'],['2026-09-02',123.45,'=HYPERLINK("https://bad.invalid")'],['Київ',0,'<>&']]));let pos=0,files={};
while(bytes.readUInt32LE(pos)===0x04034b50){const size=bytes.readUInt32LE(pos+18),n=bytes.readUInt16LE(pos+26),name=bytes.subarray(pos+30,pos+30+n).toString();files[name]=bytes.subarray(pos+30+n,pos+30+n+size).toString();pos+=30+n+size}
assert.equal(Object.keys(files).length,5);assert.match(files['xl/worksheets/sheet1.xml'],/<v>123.45<\/v>/);assert.match(files['xl/worksheets/sheet1.xml'],/t="inlineStr"/);assert.ok(!files['xl/worksheets/sheet1.xml'].includes('<f>'));assert.match(files['xl/worksheets/sheet1.xml'],/&lt;&gt;&amp;/);
console.log('PASS XLSX: OOXML ZIP structure, numeric costs, Ukrainian strings, formula-like identifiers stored as text');
