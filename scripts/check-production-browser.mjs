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
  {path:'HMO-NW-2S98D/index.html',type:'hmo',capital:80379,profit:2718.28,roi:3.38,rate:12}
];
const cash=s=>Number(String(s).replace(/[^0-9.-]/g,''));
const browser=await chromium.launch({headless:true,...(process.env.PK_CHROMIUM_PATH?{executablePath:process.env.PK_CHROMIUM_PATH}: {})});
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
 assert.equal(await page.locator('#pkQuestions').isVisible(),true,'question panel visible after acknowledgement');
 const questionLink=page.locator('#pkQuestions a');
 assert.equal(await questionLink.getAttribute('href'),'https://forms.gle/Mk4hDeGhupuJj3ap8','existing questionnaire reused without transmitting analyser data');
 assert.equal(await questionLink.getAttribute('target'),'_blank');
 const reference=await page.locator('#pkQuestionReference').textContent();
 assert.match(reference,/(?:HA|BTL|HMO)-[A-Z]{2}-[A-Z0-9]+/,'property reference displayed');
 assert.match(await page.locator('#pkQuestions').textContent(),/cannot guarantee an answer or a personal reply/);
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
 assert.ok(Math.abs(actualRoi-(row.type==='hmo'?Math.round(row.roi):row.roi))<=0.015,row.path+': Deal Register ROI mismatch '+actualRoi);
 if(row.type==='hmo'){
   const model=await page.evaluate(()=>compute());
   assert.ok(Math.abs(model.profit-2718.28)<0.01,'exact HMO cashflow retained beneath whole-pound display');
   assert.ok(Math.abs(model.roi-2718.28/80379*100)<1e-8,'exact HMO ROI independently reconciled');
   assert.equal(await page.locator('#propertyCount').inputValue(),'1','default portfolio planning should start at one property');
   assert.equal(await page.locator('#spend').inputValue(),'100,474','one-property starting capital with current planning uplift');
   assert.equal(await page.locator('#spend').getAttribute('readonly'),'','illustrative capital not directly editable');
   assert.equal(await page.locator('#spend').getAttribute('type'),'text','read-only budget formatted with thousands separators');
   assert.equal(await page.locator('#incomeGoalEntry').evaluate(e=>e.closest('.grid').children[1].contains(e)),true,'Cash Flow should be in right SCORE column');
   assert.equal(await page.locator('[aria-label="Contingency information"]').count(),1,'reserve tooltip present');
   assert.equal(await page.locator('#availableOut').textContent(),'£90,427','calculated available capital reflects contingency');
   assert.equal(await page.locator('#pkfee').getAttribute('type'),'hidden','fee must not be an editable textbox');
   assert.equal(await page.locator('#pkFeeOut').textContent(),'£5,280','PK fee calculated from approved formula');
   await page.locator('#propertyCount').fill('3');
   assert.equal(await page.locator('#spend').inputValue(),'301,421','property count drives planning capital');
   await page.locator('#reserve').fill('20');
   assert.equal(await page.locator('#spend').inputValue(),'301,421','reserve does not change starting capital');
   assert.equal(await page.locator('#availableOut').textContent(),'£241,137','reserve reduces available capital');
   await page.locator('#customBudget').check();
   assert.equal(await page.locator('#spend').isEditable(),true,'actual investor capital can be edited');
   await page.locator('#spend').fill('100000');
   await page.locator('#price').fill('230000');
   assert.equal(await page.locator('#spend').inputValue(),'100000','custom budget must not be overwritten');
   await page.locator('#price').fill('220000');
   await page.locator('#customBudget').uncheck();
   await page.locator('#reserve').fill('10');
   await page.locator('#propertyCount').fill('1');
   assert.equal(await page.locator('#spend').inputValue(),'100,474','reset planning scenario');
   assert.equal(await page.locator('#notes').getAttribute('placeholder'),'Record questions for Property Kickstart, information you would like to verify and your next steps (optional)');
 }
 if(row.rate){
   assert.equal(Number(await page.locator('#managementRate').inputValue()),row.rate,'management baseline');
   const help=page.locator(row.type==='hmo'?'.info-toggle':'details.info-tip');
   const infoCount=await help.count();
   assert.ok(infoCount>=3,'at least three informative help controls should be available');
   for(let i=0;i<infoCount;i++){
     const el=help.nth(i);
     const control=row.type==='hmo'?el:el.locator('summary');
     await control.click();
     assert.equal(await el.evaluate(e=>e.matches('button')?e.getAttribute('aria-expanded')==='true':e.open),true,'information icon must expand');
     await control.click();
     assert.equal(await el.evaluate(e=>e.matches('button')?e.getAttribute('aria-expanded')==='true':e.open),false,'information icon must close');
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
