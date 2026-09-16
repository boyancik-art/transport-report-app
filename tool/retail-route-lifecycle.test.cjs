const fs=require('fs');const path=require('path');const assert=require('assert');
const read=n=>fs.readFileSync(path.join(__dirname,'../web/retail-cloudflare',n),'utf8');
const completed=read('completed-routing.js'),route=read('route-builder-v7.js'),ttn=read('route-ttn-generator.js');
function has(src,re,msg){assert(re.test(src),msg)}
// Completed tickets only; routed tickets cannot return to the planning pool.
has(completed,/pickingStatus===\"completed\"\|\|t\.status===\"Скомплектовано\"/,'completed view must use explicit completed lifecycle');
has(completed,/used=new Set\(get\(R\)\.flatMap\(x=>x\.ticketIds\|\|\[\]\)\)/,'completed view must exclude routed tickets');
has(route,/used=new Set\(g\(R\)\.flatMap\(x=>x\.ticketIds\|\|\[\]\)\)/,'route pool must exclude already routed tickets');
// Manual actual pallets are mandatory and are the downstream source of truth.
has(completed,/actualPallets!==\"\"&&t\.actualPallets!=null/,'completed view must require actual pallets');
has(route,/a\.some\(x=>!x\.hasActual\)/,'route creation must reject missing actual pallets');
has(ttn,/t\.actualPallets===\"\"\|\|t\.actualPallets==null/,'TTN generation must reject missing actual pallets');
has(ttn,/fact:r\(t\.actualPallets\)/,'TTN must use manual actual pallets');
// Route creation persists membership and document lifecycle atomically.
has(route,/RetailState\.commit\(\{\[R\]:\[route,\.\.\.g\(R\)\],\[D\]:g\(D\)\.map/,'route and document state must commit together');
has(route,/workflowStatus:\"routed\"/,'documents must become routed');
has(route,/const fresh=new Set\(pool\(\)\.map\(x=>x\.t\.number\)\)/,'route save must revalidate ticket availability');
// TTN records retain document keys and route identity for reopen/audit.
has(ttn,/docKeys:p\.docs\.map\(RetailState\.docKey\)/,'TTN journal must retain stable document keys');
has(ttn,/route:route\.number/,'TTN journal must retain route identity');
has(ttn,/loadingRegister:reg\.number/,'route must retain loading register identity');
console.log('Retail route lifecycle contract: PASS');
