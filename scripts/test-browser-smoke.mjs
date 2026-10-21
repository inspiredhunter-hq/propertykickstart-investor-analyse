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
 // ACT-838 / 21 October 2026 authoritative Deal Register snapshot at 75% LTV and 6%.
 // The public SMART homepage and Maidstone property route deliberately share a baseline.
 const registerBaseline={
   'index.html':{capital:206199,annual:26979,roi:13.083962579837924},
   'HA-SE-3FTDU/index.html':{capital:206199,annual:26979,roi:13.083962579837924},
   'HA-NW-9JSFK/index.html':{capital:106359,annual:13707,roi:12.88748483908273},
   'BTL-NE-WLETS/index.html':{capital:50649,annual:2848,roi:5.623013287527888},
   'HMO-NW-2S98D/index.html':{capital:80499,annual:2718.28,roi:3.376787289283095}
 };
 const baseline=registerBaseline[item.path];
 if(baseline){
   const parseMoney=s=>Number(String(s).replace(/[^0-9.-]/g,''));
   const capActual=parseMoney(capital);
   assert.ok(Math.abs(capActual-baseline.capital)<=1,
     `${item.path}: website capital ${capActual} differs from approved Deal Register ${baseline.capital}`);
   const annualId=item.gate==='ha'?'#annual':'#profitOut';
   const roiId=item.gate==='ha'?'#roi':'#roiOut';
   const annualActual=parseMoney(await page.locator(annualId).textContent());
   const roiActual=parseMoney(await page.locator(roiId).textContent());
   assert.ok(Math.abs(annualActual-baseline.annual)<=1.01,
     `${item.path}: annual net ${annualActual} differs from Deal Register ${baseline.annual}`);
   assert.ok(Math.abs(roiActual-baseline.roi)<0.015,
     `${item.path}: ROI ${roiActual}% differs from Deal Register ${baseline.roi}%`);
   console.log(`PASS Deal Register parity ${item.path}: capital £${capActual}, annual net £${annualActual}, ROI ${roiActual}%`);
 }
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
 if(item.gate==='ha'){
   // The confirmation UI is screen-only: return to screen media before interacting.
   await page.emulateMedia({media:'screen'});
   await page.locator('#adviceAcknowledgement').check();
   const decision=page.locator('input[name="investorDecision"]');
   await decision.first().check();
   await page.evaluate(()=>window.makeInvestorPrintSummary());
   const summary=await page.locator('#printSummary').innerHTML();
   assert.ok(summary.includes('Estimated buying costs'),`${item.path}: HA print missing buying costs`);
   assert.ok(summary.includes('Other buying costs')||summary.includes('Other acquisition costs'),
     `${item.path}: HA print missing optional acquisition cost`);
   await page.emulateMedia({media:'print'});
   const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});
   const meta=spawnSync('pdfinfo',['-'],{input:pdf,encoding:'utf8'});
   assert.equal(meta.status,0,`${item.path}: pdfinfo failed: ${meta.stderr}`);
   const pages=Number(meta.stdout.match(/^Pages:\s*(\d+)/m)?.[1]);
   assert.equal(pages,2,`${item.path}: expected 2 A4 PDF pages, received ${pages}`);
   const extraction=spawnSync('pdftotext',['-','-'],{input:pdf,encoding:'utf8'});
   assert.equal(extraction.status,0,`${item.path}: PDF text extraction failed`);
   assert.match(extraction.stdout,/Other (buying|acquisition) costs/i,`${item.path}: Other costs omitted from actual PDF`);
   assert.match(extraction.stdout,/975/,`${item.path}: edited £975 was not printed`);
   console.log(`PASS HA PDF ${item.path}: 2 A4 pages, Other costs and edited £975 printed`);
 }
 if(item.gate==='btl'||item.gate==='hmo'){
   const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});
   const meta=spawnSync('pdfinfo',['-'],{input:pdf,encoding:'utf8'});
   assert.equal(meta.status,0,`${item.path}: pdfinfo failed: ${meta.stderr}`);
   const count=Number(meta.stdout.match(/^Pages:\s*(\d+)/m)?.[1]);
   assert.equal(count,2,`${item.path}: expected two printable A4 pages but got ${count}`);
   const extraction=spawnSync('pdftotext',['-','-'],{input:pdf,encoding:'utf8'});
   assert.equal(extraction.status,0,`${item.path}: PDF text extraction failed`);
   assert.match(extraction.stdout,/Other acquisition costs/i,`${item.path}: Other acquisition costs absent from PDF`);
   assert.match(extraction.stdout,/975/,`${item.path}: edited £975 was not included on PDF`);
   console.log(`PASS ${item.path}: 2 A4 pages, Other costs and edited £975 printed`);
 }
 await page.close();
 console.log('PASS real Chromium mobile+print '+item.path);
}
}finally {await browser.close()}
