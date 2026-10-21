#!/usr/bin/env node
// ACT-882 production-source release acceptance. Tests current main-compatible pages,
// not drafts. Browser checks are separate from live custom-domain acceptance.
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
mkdirSync('qa-evidence',{recursive:true});
const golden=[
  {path:'index.html',type:'ha',capital:206199,profit:26979,roi:13.08},
  {path:'HA-SE-3FTDU/index.html',type:'ha',capital:206199,profit:26979,roi:13.08},
  {path:'HA-NW-9JSFK/index.html',type:'ha',capital:106359,profit:13707,roi:12.89},
  {path:'BTL-NE-WLETS/index.html',type:'btl',capital:50649,profit:2848,roi:5.62,rate:10},
  {path:'HMO-NW-2S98D/index.html',type:'hmo',capital:80499,profit:2718.28,roi:3.38,rate:12}
];
const cash=s=>Number(String(s).replace(/[^0-9.-]/g,''));
const browser=await chromium.launch({headless:true});
try {
for(const row of golden){
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto(pathToFileURL(resolve(row.path)).href,{waitUntil:'load'});
 if(row.type==='btl'){
   assert.equal(await page.locator('#analysisContent').isVisible(),false,'BTL acknowledgement should block analysis before acceptance');
   await page.locator('#ackBox').check();
   await page.locator('#revealBtn').click();
 }else{
   assert.equal(await page.locator('#pkReveal').isDisabled(),true,'per-visit risk acknowledgement should be mandatory');
   await page.locator('#pkAccept').check();
   await page.locator('#pkReveal').click();
 }
 const other=row.type==='ha'?'#otherBuyingInput':'#otherAcquisition';
 const capital=row.type==='ha'?'#capitalSummary':'#capitalOut';
 const annual=row.type==='ha'?'#annual':'#profitOut';
 const roi=row.type==='ha'?'#roi':'#roiOut';
 assert.equal(await page.locator(other).inputValue(),'','extra acquisition costs start blank');
 const actualCapital=cash(await page.locator(capital).textContent());
 const actualAnnual=cash(await page.locator(annual).textContent());
 const actualRoi=cash(await page.locator(roi).textContent());
 assert.ok(Math.abs(actualCapital-row.capital)<=1,row.path+': Deal Register capital mismatch '+actualCapital);
 assert.ok(Math.abs(actualAnnual-row.profit)<=1.01,row.path+': Deal Register cashflow mismatch '+actualAnnual);
 assert.ok(Math.abs(actualRoi-row.roi)<=0.015,row.path+': Deal Register ROI mismatch '+actualRoi);
 if(row.rate){
   assert.equal(Number(await page.locator('#managementRate').inputValue()),row.rate,'management baseline');
   const help=page.locator('details.info-tip');
   assert.equal(await help.count(),3,'three information panels should be visible');
   for(let i=0;i<3;i++){
     const el=help.nth(i);
     await el.locator('summary').click();
     assert.equal(await el.evaluate(e=>e.open),true,'information icon must expand');
     await el.locator('summary').click();
     assert.equal(await el.evaluate(e=>e.open),false,'information icon must close');
   }
   assert.equal(await page.locator('#involvement option').count(),2,'only Managed and Self-managed allowed');
 }
 await page.locator(other).fill('975');
 await page.locator(other).dispatchEvent('input');
 assert.ok(Math.abs(cash(await page.locator(capital).textContent())-actualCapital-975)<=1,'additional cost must increase capital by £975');
 const metrics=await page.evaluate(()=>({documentWidth:document.documentElement.scrollWidth,viewportWidth:window.innerWidth}));
 assert.ok(metrics.documentWidth<=metrics.viewportWidth+2,row.path+': horizontal mobile overflow '+JSON.stringify(metrics));
 await page.screenshot({path:'qa-evidence/'+row.path.replaceAll('/','-')+'.png',fullPage:true});
 if(row.type==='ha'){
   await page.locator('#adviceAcknowledgement').check();
   await page.locator('input[name="investorDecision"]').first().check();
   await page.evaluate(()=>window.makeInvestorPrintSummary());
 }
 const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});
 const info=spawnSync('pdfinfo',['-'],{input:pdf,encoding:'utf8'});
 assert.equal(info.status,0,'pdfinfo must read generated PDF');
 const pages=Number(info.stdout.match(/^Pages:\s*(\d+)/m)?.[1]);
 assert.equal(pages,2,row.path+' must produce 2 A4 pages');
 const text=spawnSync('pdftotext',['-','-'],{input:pdf,encoding:'utf8'});
 assert.equal(text.status,0,'pdftotext must succeed');
 assert.match(text.stdout,/Other (acquisition|buying) costs/i,'edited cost must be in PDF');
 assert.match(text.stdout,/975/,'edited amount must be in PDF');
 assert.deepEqual(pageErrors,[],row.path+' runtime errors');
 console.log('PASS '+row.path+' Deal Register, mobile, controls, no overflow, two-page PDF');
 await page.close();
}
}finally{await browser.close()}
