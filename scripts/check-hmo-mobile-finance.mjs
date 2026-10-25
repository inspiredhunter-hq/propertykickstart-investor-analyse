// ACT-882 BUG-13–19: independent rule-based financial and mobile regression.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const target=process.env.PK_HMO_TEST_URL||pathToFileURL(resolve('HMO-NW-2S98D/index.html')).href;
const cash=s=>Number(s.replaceAll('−','-').replace(/[^\d.-]/g,''));
const browser=await chromium.launch({headless:true,...(process.env.PK_CHROMIUM_PATH?{executablePath:process.env.PK_CHROMIUM_PATH}: {})});
mkdirSync('qa-evidence',{recursive:true});
const results=[];
try{
for(const width of [320,390,430,1280]){
 const page=await browser.newPage({viewport:{width,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(target);
 assert.equal(await page.locator('#pkGateHeading').textContent(),'St Helens · North West');
 await page.locator('#pkAccept').check();await page.locator('#pkReveal').click();
 assert.match(await page.locator('main .pk-header-intro').textContent(),/standard assumptions for acquisition costs/);
 assert.match(await page.locator('main .pk-header-risk').textContent(),/financial returns are not guaranteed/);
 assert.equal(await page.locator('.pk-universal-header .pk-location').textContent(),'HMO-NW-2S98D · St Helens · North West');
 assert.doesNotMatch(await page.locator('main').textContent(),/Deal Register/);
 const guide=await page.locator('.score-guide li').allTextContents();assert.deepEqual(guide.map(t=>t[0]),['S','C','O','R','E']);
 const overflow=await page.evaluate(()=>({width:innerWidth,doc:document.documentElement.scrollWidth,bad:[...document.querySelectorAll('main input:not([type=hidden]),main select')].filter(e=>{const b=e.getBoundingClientRect(),c=e.closest('.card').getBoundingClientRect();return b.width&& (b.right>c.right+1||b.left<c.left-1)}).map(e=>e.id)}));
 assert.ok(overflow.doc<=width+1,JSON.stringify(overflow));assert.deepEqual(overflow.bad,[]);
 assert.equal(await page.locator('#targetEntry').isVisible(),false,'exploring must hide the target input');
 const buttons=page.locator('.info-toggle');
 for(let i=0;i<await buttons.count();i++){
  const button=buttons.nth(i);await button.click();
  assert.equal(await page.locator('.info-text:not([hidden])').count(),1,'only one explanation');
  assert.equal(await button.getAttribute('aria-expanded'),'true');
  const panel=page.locator('#'+await button.getAttribute('aria-controls'));
  const bounds=await panel.boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);
  const rowBounds=await button.evaluate(e=>e.closest('.field,.cost,.fixed-fee').getBoundingClientRect().toJSON());
  assert.ok(bounds.y>=rowBounds.y&&bounds.y+bounds.height<=rowBounds.bottom+1,'help stays inside row');
  await button.click();assert.equal(await panel.isVisible(),false);
 }
 await buttons.nth(0).click();await buttons.nth(1).click();
 assert.equal(await buttons.nth(0).getAttribute('aria-expanded'),'false');
 assert.equal(await page.locator('.info-text:not([hidden])').count(),1);
 await page.locator('h2').first().click();assert.equal(await page.locator('.info-text:not([hidden])').count(),0);
 assert.equal(await page.locator('.info-text').evaluateAll(es=>es.every(e=>e.getBoundingClientRect().height===0)),true,'closed panels leave no text or space');
 assert.equal(await page.locator('#targetOut').textContent(),'Not set yet');
 assert.equal(await page.locator('.income-goal-panel #setGoalBtn').count(),1);
 await page.locator('#setGoalBtn').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'goalMode');
 // Fee benchmarks use explicit independent expected values, including the minimum boundary.
 for(const [price,fee] of [[90000,3600],[149999,3600],[150000,3600],[150001,3600.02],[220000,5280],[300000,7200]]){
  await page.locator('#price').fill(String(price));
  const actual=cash(await page.locator('#pkFeeOut').textContent());assert.ok(Math.abs(actual-fee)<0.011,'PK fee retains penny precision');
  const capital=price*0.25+12900+2500+2200+1999+500+fee;
  assert.ok(Math.abs(cash(await page.locator('#capitalOut').textContent())-capital)<=0.5);
  const costs=4129.92+2753.28+231.96+2753.28+524.52+366+5621.52+2406.24+3011;
  const profit=34416-costs-price*0.75*0.06;
  assert.ok(Math.abs(cash(await page.locator('#profitOut').textContent())-profit)<=0.5);
  assert.equal(cash(await page.locator('#roiOut').textContent()),Math.round(profit/capital*100));
  const exact=await page.evaluate(()=>compute());
  assert.ok(Math.abs(exact.capital-capital)<0.01);
  assert.ok(Math.abs(exact.profit-profit)<0.01);
  assert.ok(Math.abs(exact.roi-profit/capital*100)<1e-8);
  assert.equal(await page.locator('#spend').inputValue(),Math.round(capital*1.25).toLocaleString('en-GB'));
 }
 await page.locator('#price').fill('220000');
 assert.ok(Math.abs(cash(await page.locator('#costOut').textContent())-21797.72)<0.01);
 assert.ok(Math.abs(cash(await page.locator('#capitalOut').textContent())-80379)<0.01);
 assert.ok(Math.abs(cash(await page.locator('#contextCashflow').textContent())-(2718.28/12))<0.01);
 await page.locator('#goalMode').selectOption('portfolio');await page.locator('#target').fill('1000');
 assert.match(await page.locator('#progressText').textContent(),/approximately 5 similar-performing properties/);
 assert.equal(await page.locator('#goalPrompt').isVisible(),false);
 assert.equal(await page.locator('#setGoalBtn').textContent(),'Change my income goal');
 await page.locator('#otherAcquisition').fill('975');assert.ok(Math.abs(cash(await page.locator('#capitalOut').textContent())-81354)<0.01);
 await page.locator('#ltv').fill('0');assert.ok(Math.abs(cash(await page.locator('#capitalOut').textContent())-242155)<0.01);
 // Restore then verify management mode and printable financial outputs.
 await page.locator('#ltv').fill('75');await page.locator('#otherAcquisition').fill('');
 await page.locator('#involvement').selectOption('Self-managed');assert.equal(await page.locator('#managementRate').inputValue(),'0');
 assert.ok(Math.abs(cash(await page.locator('#profitOut').textContent())-6848.20)<0.51);
 await page.locator('#involvement').selectOption('Managed HMO');assert.ok(Math.abs(cash(await page.locator('#profitOut').textContent())-2718.28)<0.01);
 await page.locator('#goalMode').selectOption('explore');
 assert.equal(await page.locator('#targetEntry').isVisible(),false,'returning to exploring hides target input');
 await page.screenshot({path:`qa-evidence/hmo-review-${width}.png`,fullPage:true});
 if(width===390){
  const pdf=await page.pdf({format:'A4',printBackground:true,preferCSSPageSize:true});writeFileSync('qa-evidence/hmo-review.pdf',pdf);
  const info=spawnSync('pdfinfo',['-'],{input:pdf,encoding:'utf8'});assert.match(info.stdout,/Pages:\s+2/);
  const text=spawnSync('pdftotext',['-','-'],{input:pdf,encoding:'utf8'}).stdout;
  assert.match(text,/5,280\.00/);assert.match(text,/80,379\.00/);assert.match(text,/226\.52/);
  assert.doesNotMatch(text,/Supplier bills included here|12% is the standard/,'print must not contain help explanations');
 }
 assert.deepEqual(errors,[]);results.push({width,result:'PASS',fee:5280,capital:80379,annualCosts:21797.72,monthlyCashflow:226.52});
 await page.close();
}
console.log(JSON.stringify({target,results},null,2));writeFileSync('qa-evidence/hmo-review-results.json',JSON.stringify({target,results},null,2));
}finally{await browser.close()}
