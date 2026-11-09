// BUG-47 browser acceptance: professionals follow-up for Q5 and ranked Q8 (first or second), shown once, optional.
const {chromium}=require('playwright-core');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const html=fs.readFileSync(process.env.SURVEY_HTML||'production/2027/index.html','utf8');
const Q4="Finding reliable professionals",Q7="Finding reliable local professionals",OTHER7="Finding properties that meet my requirements";
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 let page;
 const prompts=()=>page.locator('#professionalPrompt').count();
 const go=async(n)=>{await page.evaluate(n=>{step=n;render()},n);};
 // New page per scenario: setContent reuses the global scope, so top-level const/let would be redeclared.
 const fresh=async()=>{if(page)await page.close();page=await browser.newPage({viewport:{width:375,height:812}});await page.setContent(html);await page.evaluate(()=>{a[0]="Yes"});};
 const pick=async t=>page.locator('button.choice',{hasText:t}).first().click();
 const data=()=>page.evaluate(()=>professionalData());
 try{
  // 1 Q4 only
  await fresh();await go(4);await pick(Q4);assert.equal(await prompts(),1,'Q4 only: one prompt on Q4');
  await go(7);assert.equal(await prompts(),0,'Q4 only: no prompt on Q7');
  // 2 Q7 first rank
  await fresh();await go(7);await pick(Q7);await pick(OTHER7);assert.equal(await prompts(),1,'Q7 first rank');
  // 3 Q7 second rank
  await fresh();await go(7);await pick(OTHER7);await pick(Q7);assert.equal(await prompts(),1,'Q7 second rank');
  assert.equal(await page.evaluate(()=>a[7].indexOf("Finding reliable local professionals")),1);
  // 4 both triggers: exactly one prompt overall (Q4), none duplicated on Q7
  await fresh();await go(4);await pick(Q4);await go(7);await pick(Q7);await pick(OTHER7);
  assert.equal(await prompts(),0,'both triggers: Q7 must not repeat the prompt');
  await go(4);assert.equal(await prompts(),1,'both triggers: Q4 keeps the single prompt');
  // 5 no trigger
  await fresh();await go(4);await pick("Assessing risks");assert.equal(await prompts(),0);
  await go(7);await pick(OTHER7);assert.equal(await prompts(),0);assert.equal(await data(),undefined);
  // 6 optional: Yes + Other with blank detail never blocks Continue (Q7 route)
  await fresh();await go(7);await pick(Q7);await pick(OTHER7);
  await page.locator('#professionalYes').check();
  await page.locator('[data-professional]').last().check();
  assert.equal(await page.locator('#professionalOther').isVisible(),true);
  await page.locator('#next').click();
  assert.equal(await page.evaluate(()=>step),8,'Continue accepted with blank Other detail');
  let d=await data();assert.equal(d.wantsToTell,true);assert.equal(d.other,"");assert(d.selected.includes("Other"));
  // 7 back navigation preserves selections while parent remains
  await page.locator('#back').click();assert.equal(await page.evaluate(()=>step),7);
  assert.equal(await page.locator('#professionalYes').isChecked(),true);
  assert.equal(await page.locator('[data-professional]').last().isChecked(),true);
  // 8 unanswered / Yes with nothing selected still continues
  await fresh();await go(7);await pick(Q7);await pick(OTHER7);await page.locator('#next').click();assert.equal(await page.evaluate(()=>step),8);
  await go(7);await page.locator('#professionalYes').check();await page.locator('#next').click();assert.equal(await page.evaluate(()=>step),8);
  // 9 deselecting the only parent clears the follow-up data
  await go(7);await pick(Q7);assert.equal(await prompts(),0);
  assert.equal(await data(),undefined);
  assert.deepEqual(await page.evaluate(()=>({...professionalFollowup})),{wantsToTell:false,selected:[],other:""});
  // 10 Q4 parent keeps data when Q7 trigger removed
  await fresh();await go(4);await pick(Q4);await page.locator('#professionalYes').check();await page.locator('[data-professional]').first().check();
  await go(7);await pick(Q7);await pick(Q7);
  d=await data();assert.equal(d.wantsToTell,true);assert.deepEqual(d.selected,["Mortgage brokers"]);
  console.log('PASS: BUG-47 browser scenarios on '+(process.env.SURVEY_HTML||'production/2027/index.html'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
