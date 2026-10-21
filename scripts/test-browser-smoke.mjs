#!/usr/bin/env node
// ACT-882 real browser smoke tests. Run on a clean CI machine with Playwright/Chromium installed.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const browser=await chromium.launch({headless:true});
const cases=[
 {path:'BTL-NE-WLETS/index.html',gate:'btl',defaultRate:10},
 {path:'HMO-NW-2S98D/index.html',gate:'hmo',defaultRate:12},
 {path:'index.html',gate:'ha'},
 {path:'HA-SE-3FTDU/index.html',gate:'ha'},
 {path:'HA-NW-9JSFK/index.html',gate:'ha'},
 {path:'staging/ha-model-2/analyser-review.html',gate:'ha'}
];
try {
for(const item of cases){
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',error=>errors.push(String(error)));
 await page.goto(pathToFileURL(resolve(item.path)).href,{waitUntil:'load'});
 if(item.gate==='btl'){
   assert.equal(await page.locator('#analysisContent').isVisible(),false,'BTL requires per-visit acknowledgement');
   await page.locator('#ackBox').check();
   await page.locator('#revealBtn').click();
   assert.equal(await page.locator('#analysisContent').isVisible(),true,'BTL analysis unlocked after acknowledgement');
 }else if(item.gate==='hmo' || await page.locator('#pkAccept').count()){
   assert.equal(await page.locator('#pkReveal').isDisabled(),true,'HMO requires per-visit acknowledgement');
   await page.locator('#pkAccept').check();
   await page.locator('#pkReveal').click();
 }
 const other=item.gate==='ha'?'#otherBuyingInput':'#otherAcquisition';
 assert.equal(await page.locator(other).inputValue(),'','Other costs start blank');
 const output=item.gate==='ha'?'#capitalSummary':'#capitalOut';
 const capital=await page.locator(output).textContent();
 await page.locator(other).fill('975',{timeout:5000});
 await page.locator(other).dispatchEvent('input');
 const withOther=await page.locator(output).textContent();
 const pounds=s=>Number(s.replace(/[^0-9.-]/g,''));
 assert.ok(Math.abs(pounds(withOther)-pounds(capital)-975)<1.01,`${item.path}: Other costs must add £975 to capital: ${capital} -> ${withOther}`);
 if(item.defaultRate){
   const rate=page.locator('#managementRate');
   assert.equal(Number(await rate.inputValue()),item.defaultRate,'governed editable management default');
   await rate.fill('8');await rate.dispatchEvent('input');
   assert.equal(Number(await rate.inputValue()),8,'editable management rate');
   const annual=await page.locator('[data-cost="0"]').inputValue();
   const rent=Number(await page.locator('#rent').inputValue());
   assert.ok(Math.abs(Number(annual)-rent*.08)<.02,'negotiated rate changes annual management cost');
 }
 assert.deepEqual(errors,[],`${item.path}: unhandled browser script errors`);
 await page.emulateMedia({media:'print'});
 const printDisplay=await page.evaluate(()=>getComputedStyle(document.body).display);
 assert.notEqual(printDisplay,'none','print mode does not hide body');
 if(item.gate==='btl'||item.gate==='hmo'){
   const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});
   const meta=spawnSync('pdfinfo',['-'],{input:pdf,encoding:'utf8'});
   assert.equal(meta.status,0,`${item.path}: pdfinfo failed: ${meta.stderr}`);
   const count=Number(meta.stdout.match(/^Pages:\s*(\d+)/m)?.[1]);
   assert.equal(count,2,`${item.path}: expected two printable A4 pages but got ${count}`);
   console.log(`PASS ${item.path}: actual A4 investor PDF has exactly ${count} pages`);
 }
 await page.close();
 console.log('PASS real Chromium mobile+print '+item.path);
}
}finally {await browser.close()}
