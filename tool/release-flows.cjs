const assert=require('node:assert/strict');
module.exports=async({page,frame})=>{
 const initial=await frame.evaluate(()=>TRTS_APP.buildReport()),theme=await frame.locator('html').getAttribute('data-theme');
 await frame.locator('#v444-search').click();await frame.locator('#v444-query').fill('INV-1');await frame.locator('#v444-results button').first().waitFor();await frame.locator('#v444-results button').first().click();await frame.locator('.v444-found').waitFor();
 assert.match(await frame.locator('.v444-found').innerText(),/INV-1/);
 assert.match(await frame.locator('.v43-route-detail .v444-metrics').innerText(),/Сума документів ТТ/);
 await frame.getByRole('button',{name:'‹ Маршрут',exact:true}).click();assert.match(await frame.locator('[data-route-id="1"] .v444-metrics').innerText(),/Вартість 1 ТТ/);
 await frame.evaluate(()=>v442Nav('analytics'));await frame.locator('.v444-attention').waitFor();
 assert.ok(await frame.locator('.v444-attention .v444-results button').count()>0);
 await frame.locator('.v444-attention .v444-results button').first().click();await frame.locator('#v43-modal .v444-results button').first().click();await frame.locator('.v436-detail,.v43-route-detail').first().waitFor();
 await frame.evaluate(()=>v442Nav('menu'));await frame.getByRole('button',{name:'Експорт даних',exact:false}).click();await frame.locator('#v444-export-submit:not([disabled])').waitFor();
 for(const id of ['from','to','direction','filter-branch','filter-business','filter-carrier','filter-zone'])assert.equal(await frame.locator('#v444-'+id).count(),1);
 const downloaded=page.waitForEvent('download');await frame.locator('#v444-export-submit').click();const download=await downloaded;assert.match(download.suggestedFilename(),/\.xlsx$/);const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);const bytes=Buffer.concat(chunks);assert.equal(bytes.readUInt32LE(0),0x04034b50);assert.ok(bytes.includes(Buffer.from('Транспортні витрати')));assert.ok(bytes.includes(Buffer.from('Витрати')));
 assert.deepEqual(await frame.evaluate(()=>TRTS_APP.buildReport()),initial,'Search/export/UI must not mutate financial results');
 // A genuine new boot, seeded with a previous version and an active session.
 await frame.evaluate(()=>{localStorage.trts_seen_build='v44.3';localStorage.removeItem('trts_update_ack')});
 await Promise.all([frame.waitForNavigation({waitUntil:'load'}),frame.locator('#trts-update').click()]);
 await frame.locator('#loginForm').waitFor({state:'visible'});assert.equal(await frame.locator('#v443-unlock').count(),0);
 assert.equal(await frame.evaluate(()=>localStorage.trts_token),undefined);
 await frame.locator('#email').fill('runtime-test@example.invalid');await frame.locator('#password').fill('isolated-fixture-only');await frame.locator('#loginForm button').click();await frame.locator('#v444-notice').waitFor();assert.match(await frame.locator('#v444-notice').innerText(),/Застосунок оновлено до версії v44\.8/);await frame.locator('#v444-ack').click();
 assert.equal(await frame.locator('html').getAttribute('data-theme'),theme,'Theme survives version logout and fresh email/password login');
 await frame.evaluate(()=>TRTS_RELEASE.notice());assert.equal(await frame.locator('#v444-notice').count(),0);
 console.log('PASS v44.8: search invoice deep-link, route/TT metrics, actionable attention, filtered XLSX, financial immutability, Update forces login and one-time acknowledged notice');
};
