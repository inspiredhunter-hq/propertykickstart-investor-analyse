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
  {path:'BTL-NE-WLETS/index.html',type:'btl',capital:55713.9,profit:2848,roi:5.11,rate:10},
  {path:'HMO-NW-2S98D/index.html',type:'hmo',capital:80379,profit:2718.28,roi:3.38,rate:12}
];
const cash=s=>Number(String(s).replace(/[^0-9.-]/g,''));
const browser=await chromium.launch({headless:true,...(process.env.PK_CHROMIUM_PATH?{executablePath:process.env.PK_CHROMIUM_PATH}: {})});
try {
for(const row of golden){
 const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const pageErrors=[];page.on('pageerror',e=>pageErrors.push(e.message));
 await page.goto(pathToFileURL(resolve(row.path)).href,{waitUntil:'load'});
 const gate=row.type==='btl'?'#ackGate':'#pkDisclosureGate';
 const checkbox=row.type==='btl'?'#ackBox':'#pkAccept';
 const reveal=row.type==='btl'?'#revealBtn':'#pkReveal';
 assert.equal(await page.locator(gate).isVisible(),true,'mandatory acknowledgement gate visible');
 assert.equal(await page.locator(checkbox).isChecked(),false,'acknowledgement starts unchecked');
 assert.equal(await page.locator(reveal).isDisabled(),true,'analysis locked until acknowledged');
 if(row.type==='btl')assert.equal(await page.locator('#analysisContent').isVisible(),false);
 await page.locator(checkbox).check();
 assert.equal(await page.locator(reveal).isEnabled(),true);
 await page.locator(reveal).click();
 assert.equal(await page.locator(gate).isVisible(),false,'gate closes only after acknowledgement');
 // ACT-882 Section 3 specific regression checks on all strategy pages.
 const heading=page.locator('h2').filter({hasText:/^3\. Annual operating costs$/});
 assert.equal(await heading.count(),1,row.path+': Section 3 must use universal operating cost heading');
 const section3=heading.locator('xpath=..');
 if(row.type==='ha'){
   const annualCost=section3.locator('#haAnnualCostTotal');
   const monthlyCost=section3.locator('#haMonthlyCostTotal');
   assert.ok(Math.abs(cash(await annualCost.textContent())-1071)<0.01,row.path+': original HA initial annual costs');
   assert.ok(Math.abs(cash(await monthlyCost.textContent())-89.25)<0.01,row.path+': original HA initial monthly costs');
   await section3.locator('#boilerInput').fill('466');
   assert.ok(Math.abs(cash(await annualCost.textContent())-1171)<0.01,row.path+': editable boiler flows to annual total');
   assert.ok(Math.abs(cash(await monthlyCost.textContent())-(1171/12))<0.02,row.path+': editable boiler flows to monthly total');
   await section3.locator('#boilerInput').fill('366');
   assert.equal(await section3.locator('#runningCostsInput').count(),1,row.path+': running cost override appears in Section 3');
 } else if(row.type==='btl'){
   const score=page.locator('#scoreSection');
   assert.equal(await score.locator('.score-intro').innerText(),'Know your SCORE before you assess the VALUE.');
   assert.deepEqual(await score.locator('.score-options legend strong, .score-item > label:first-child strong, .score-item > strong').allTextContents(),['S','C','O','R','E']);
   assert.equal(await score.locator('input[name="cashflowMode"]:checked').count(),0,'no cashflow option preselected');
   assert.equal(await score.locator('input[name="riskChoice"]:checked').count(),0,'no risk option preselected');
   assert.equal(await page.locator('#reserve').evaluate(x=>x.closest('.card').querySelector('h2').textContent.startsWith('2.')),true,'contingency belongs in section 2');
   const card2=page.locator('.acquisition-card');
   assert.equal(await card2.locator('#price').inputValue(),'135,000','pence hidden by default for whole-pound figures');
   assert.equal(await card2.locator('#price').evaluate(e=>e.parentElement.nextElementSibling?.querySelector('#depositPercentOut')?.id),'depositPercentOut','deposit percentage follows asking price');
   assert.ok(Math.abs(cash(await card2.locator('#capitalWithoutOut').textContent())-50649)<0.01,'baseline excludes contingency');
   assert.ok(Math.abs(cash(await card2.locator('#contingencyOut').textContent())-5064.90)<0.01,'10 percent contingency calculated on unreserved capital');
   assert.ok(Math.abs(cash(await card2.locator('#capitalOut').textContent())-55713.90)<0.01,'total includes contingency');
   await card2.locator('#showPence').check();
   assert.equal(await card2.locator('#price').inputValue(),'135,000.00','pence switch displays trailing zeros');
   await card2.locator('#showPence').uncheck();
   await card2.locator('#reserve').fill('0');
   assert.ok(Math.abs(cash(await card2.locator('#contingencyOut').textContent()))<0.01,'investor can remove contingency entirely');
   assert.ok(Math.abs(cash(await card2.locator('#capitalOut').textContent())-50649)<0.01,'zero contingency has no uplift');
   await card2.locator('#reserve').fill('10');
   assert.equal((await page.locator('#depositPercentOut').innerText()).trim(),'25.00%','75% LTV means 25% calculated deposit');
   assert.ok(Math.abs(cash(await page.locator('#depositOut').innerText())-33750)<0.01,'deposit amount follows LTV');
   await page.locator('#ltv').fill('65');
   assert.equal((await page.locator('#depositPercentOut').innerText()).trim(),'35.00%','deposit percentage follows editable LTV');
   assert.ok(Math.abs(cash(await page.locator('#depositOut').innerText())-47250)<0.01,'deposit recalculates after LTV edit');
   await page.locator('#ltv').fill('75');
   assert.equal(await page.locator('#spend').getAttribute('readonly'),'','suggested budget defaults read-only');
   assert.equal(await page.locator('#horizon').inputValue(),'20 years');
   assert.equal(await page.locator('#targetField').isVisible(),false);
   await score.locator('input[name="cashflowMode"][value="target"]').check();
   assert.equal(await page.locator('#targetField').isVisible(),true);
   await score.locator('input[name="cashflowMode"][value="explore"]').check();
   assert.equal(await page.locator('#targetField').isVisible(),false);
   await page.locator('#customBudget').check();
   assert.equal(await page.locator('#spend').isEditable(),true);
   await page.locator('#spend').fill('120000.50');
   await page.locator('#reserve').fill('15');
   assert.ok(Math.abs(cash(await page.locator('#spend').inputValue())-120000.50)<0.01,'manual investor budget must survive finance changes; got '+await page.locator('#spend').inputValue());
   await page.locator('#restoreBudget').click();
   assert.equal(await page.locator('#spend').getAttribute('readonly'),'','restore enables calculated budget');
   await page.locator('#reserve').fill('10');
   const fields=section3.locator('.cost-input');
   assert.equal(await fields.count(),12,'BTL retains all twelve annual operating cost inputs');
   assert.equal(await fields.first().inputValue(),'1,362.00','initial management cost is comma-formatted with pence');
   assert.equal(await section3.locator('[data-cost="5"]').inputValue(),'0.00','zero annual cost shows pence');
   const insurance=section3.locator('[data-cost="3"]');
   assert.equal(await insurance.inputValue(),'285.00');
   await insurance.focus();
   assert.equal(await insurance.inputValue(),'285.00','focus keeps an ungrouped editable decimal');
   await insurance.fill('1234.56');
   await insurance.blur();
   assert.equal(await insurance.inputValue(),'1,234.56','edited annual cost is displayed with grouping and pence');
   assert.ok(Math.abs(cash(await section3.locator('#costOut').textContent())-5646.56)<0.01,'annual operating cost total reconciles at pence precision');
   await insurance.focus();await insurance.fill('285.00');await insurance.blur();
   assert.equal(await insurance.inputValue(),'285.00','restored value stays consistently formatted');
   assert.ok(Math.abs(cash(await section3.locator('#costOut').textContent())-4697)<0.01,'restored annual total matches approved original');
 } else if(row.type==='hmo'){
   assert.equal(await section3.locator('.cost-input').count(),9,'preserve all nine HMO cost inputs');
   assert.equal(await section3.locator('h3').filter({hasText:'Additional HMO operating costs'}).count(),1);
   const inputIds=await section3.locator('.cost-input').evaluateAll(nodes=>nodes.map(n=>n.id));
   assert.deepEqual(inputIds.slice(-3),['cost-5','cost-6','cost-7'],'HMO additional groups retain their existing input IDs and order');
 }

 // Governance invariant: every strategy and the homepage use the exact approved SCORE copy.
 const scoreIntro=page.locator('main .notice').filter({hasText:'Know your SCORE before you assess the VALUE.'});
 assert.equal(await scoreIntro.count(),1,row.path+': exactly one approved SCORE introduction required');
 assert.equal((await scoreIntro.innerText()).trim(),'Know your SCORE before you assess the VALUE.',row.path+': SCORE introduction must remain standard');
 // Universal shared introduction must retain approved wording and paragraph separation.
 const explainer=page.locator('.pk-header-intro');
 assert.equal(await explainer.count(),1,row.path+': shared exploration introduction present once');
 assert.equal((await explainer.locator('h2').innerText()).trim(),'Explore the numbers.');
 const explanation=await explainer.locator('p').allInnerTexts();
 assert.deepEqual(explanation,[
   'This analyser uses Property Kickstart’s standard assumptions for acquisition costs, financing and ongoing property expenses.',
   'Figures can be changed to explore different scenarios.'
 ],row.path+': approved two-paragraph explanation');



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
 // Editable expense changes must affect cash flow and ROI without rounding intermediate arithmetic.
 const costInput=row.type==='ha'?'#boilerInput':row.type==='btl'?'[data-cost="3"]':'#cost-3';
 const startingInput=Number(await page.locator(costInput).inputValue());
 await page.locator(costInput).fill(String(startingInput+1.25));
 const afterExpenseCash=cash(await page.locator(annual).textContent());
 const afterExpenseROI=cash(await page.locator(roi).textContent());
 assert.ok(Math.abs(afterExpenseCash-(actualAnnual-1.25))<=0.02,row.path+': £1.25 annual expense edit must reduce cash flow by exactly £1.25');
 assert.ok(Math.abs(afterExpenseROI-(afterExpenseCash/actualCapital*100))<=0.51,row.path+': edited expense must reconcile ROI with annual cash flow/capital');
 await page.locator(costInput).fill(String(startingInput));
 assert.ok(Math.abs(cash(await page.locator(annual).textContent())-actualAnnual)<=0.02,row.path+': restoring expense must restore cash flow');
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
   assert.ok(Math.abs(cash(await page.locator('#availableOut').textContent())-90426.6)<0.01,'calculated available capital reflects contingency at pence precision');
   assert.equal(await page.locator('#pkfee').getAttribute('type'),'hidden','fee must not be an editable textbox');
   assert.ok(Math.abs(cash(await page.locator('#pkFeeOut').textContent())-5280)<0.01,'PK fee calculated from approved formula');
   await page.locator('#propertyCount').fill('3');
   assert.equal(await page.locator('#spend').inputValue(),'301,421','property count drives planning capital');
   await page.locator('#reserve').fill('20');
   assert.equal(await page.locator('#spend').inputValue(),'301,421','reserve does not change starting capital');
   // The capital breakdown is explicitly a one-property allocation.
   assert.ok(Math.abs(cash(await page.locator('#availableOut').textContent())-(301421*0.8/3))<0.01,'reserve reduces each property allocation without whole-pound display rounding');
   const portfolio=await page.evaluate(()=>compute());
   assert.ok(Math.abs(portfolio.available-301421*0.8)<0.01,'total portfolio capital after contingency');
   assert.ok(Math.abs(cash(await page.locator('#startingCapitalOut').textContent())-(301421/3))<0.01,'starting capital allocated per property without whole-pound rounding');
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
 assert.ok(Math.abs(cash(await page.locator(capital).textContent())-actualCapital-(row.type==='btl'?1072.50:975))<=1,'additional cost and applicable contingency must increase total capital');
 // ACT-882: explicit two-decimal rendering on key sterling outputs.
 const sterlingSelectors=row.type==='ha'
  ? ['#haAnnualCostTotal','#haMonthlyCostTotal','#annual','#monthlyFinancial','#capitalSummary']
  : row.type==='btl'?['#costOut','#costMonthly','#profitOut']:['#costOut','#costMonthly','#profitOut','#capitalOut'];
 for(const selector of sterlingSelectors){
  const value=(await page.locator(selector).textContent()).trim();
  assert.match(value,/^[−-]?£\d{1,3}(?:,\d{3})*\.\d{2}$/,row.path+': monetary output must display exactly two decimals at '+selector+'; got '+value);
 }
 // Exercise Section 3 fields at three phone widths before PDF checks.
 for(const width of [320,390,430]){
  await page.setViewportSize({width,height:844});
  const screen=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,viewport:innerWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&b.right>innerWidth+2}).slice(0,12).map(e=>({tag:e.tagName,id:e.id,className:String(e.className).slice(0,80),right:Math.round(e.getBoundingClientRect().right)}))}));
  assert.ok(screen.doc<=width+2,row.path+': horizontal page overflow at '+width+'px '+JSON.stringify(screen));
 }
 await page.setViewportSize({width:390,height:844});
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
 // Print geometry audit: detectable text must fit the A4 page, without tiny or clipped glyph boxes.
 const bbox=spawnSync('pdftotext',['-bbox','-','-'],{input:pdf,encoding:'utf8'});
 assert.equal(bbox.status,0,row.path+': PDF geometry extraction should succeed');
 const extracted=[...bbox.stdout.matchAll(/<word xMin="([0-9.]+)" yMin="([0-9.]+)" xMax="([0-9.]+)" yMax="([0-9.]+)">/g)]
  .map(m=>({x1:+m[1],y1:+m[2],x2:+m[3],y2:+m[4]}));
 assert.ok(extracted.length>80,row.path+': PDF must contain enough readable selectable text');
 const outside=extracted.filter(w=>w.x1 < -1||w.x2 > 596||w.y1 < -1||w.y2 > 843);
 assert.equal(outside.length,0,row.path+': PDF has text outside its A4 page bounds');
 const tiny=extracted.filter(w=>w.y2-w.y1<4.3);
 assert.ok(tiny.length/extracted.length<0.06,row.path+': PDF has too much unusually small print');
 assert.deepEqual(pageErrors,[],row.path+' runtime errors');
 console.log('PASS '+row.path+' Deal Register, mobile, controls, no overflow, two-page PDF');
 await page.close();
}
}finally{await browser.close()}
