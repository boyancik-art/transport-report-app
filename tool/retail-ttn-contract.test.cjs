const fs=require('fs');const path=require('path');const assert=require('assert');const src=fs.readFileSync(path.join(__dirname,'../web/retail-cloudflare/route-ttn-generator.js'),'utf8');
function has(re,msg){assert(re.test(src),msg)}
// Print packet contract: one register, one TTN identity per store, exactly three copies.
has(/function regHtml\(/,'loading register renderer missing');
has(/storeKey\(p\.store,p\.address\)/,'TTN store identity missing');
has(/\[1,2,3\]\.map\(c=>ttn\(/,'TTN must render exactly 3 copies');
// Pagination contract: real rows only, 12 lines per A4 page, no padded blank rows.
has(/i\+=12\)chunks\.push\(rows\.slice\(i,i\+12\)\)/,'TTN must paginate by 12 real goods rows');
assert(!/Array\(12\)|fill\([^)]*<tr/i.test(src),'TTN must not pad pages with artificial blank rows');
has(/@page\{size:A4 landscape/,'TTN must print landscape A4');
has(/\.sheet:last-child\{page-break-after:auto\}/,'last sheet must not force an extra blank page');
// Financial and operational fields required by the approved flow.
has(/amountWords\(total\)/,'total amount in words missing');
has(/amountWords\(vat\)/,'VAT amount in words missing');
has(/actualPallets===\"\"\|\|t\.actualPallets==null/,'actual pallets guard missing');
has(/loadingRegister:reg\.number/,'route-to-loading-register persistence missing');
has(/ttnCount:points\.length/,'route TTN count persistence missing');
console.log('Retail TTN contract: PASS');
