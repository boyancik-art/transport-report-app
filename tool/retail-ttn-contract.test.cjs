const fs=require('fs');const path=require('path');const assert=require('assert');
const read=n=>fs.readFileSync(path.join(__dirname,'../web/retail-cloudflare',n),'utf8');
const src=read('route-ttn-generator.js'),guard=read('ttn-sideeffect-guard-v1.js'),index=read('index.html');
function has(re,msg,s=src){assert(re.test(s),msg)}
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
has(/actualPallets===(?:\"\"|'')\|\|t\.actualPallets==null/,'actual pallets guard missing');
has(/loadingRegister:reg\.number/,'route-to-loading-register persistence missing');
has(/ttnCount:points\.length/,'route TTN count persistence missing');
// Native side-effect boundaries: preview is read-only; register edit writes only L; generation finalizes journal + route.
has(/function preview\(no\).*virtualRegister\(d\.route,d\.points\).*numbersFor\(d\.route,d\.points\).*openDoc/s,'preview must use virtual data only');
const preview=src.match(/function preview\(no\)([\s\S]*?)function editRegister/)[1];
assert(!/RetailState\.(?:write|commit)\(/.test(preview),'preview must not persist state');
const edit=src.match(/function editRegister\(no\)([\s\S]*?)function generate/)[1];
has(/saveRegister\(d\.route,d\.points/,'register edit must persist loading register',edit);
assert(!/finalizeRecords\(/.test(edit),'register edit must not finalize TTN journal/route');
const generate=src.match(/function generate\(no(?:,options=\{\})?\)([\s\S]*?)window\.RetailRouteTTN/)[1];
has(/finalizeRecords\(d\.route,d\.points,reg\)/,'generate must finalize journal and route',generate);
// Compatibility guard is intentionally narrow: validation only, no snapshot/restore monkey patching.
assert(!/originalPreview|originalRegister|snap\(|restore\(/.test(guard),'TTN guard must not monkey-patch preview/register state');
has(/originalGenerate=api\.generate\?\.bind\(api\)/,'generation validation guard missing',guard);
has(/if\(!reg\)/,'generation must require a saved loading register',guard);
has(/const missing=.*reg\.seals/,'generation must validate seals',guard);
has(/route-ttn-generator\.js[^<]*<\/script><script src="\.\/ttn-sideeffect-guard-v1\.js/,'generation validation guard must load immediately after TTN generator',index);
console.log('Retail TTN contract: PASS');
