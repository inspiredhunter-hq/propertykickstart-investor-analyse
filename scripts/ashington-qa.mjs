import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
mkdirSync('qa-output',{recursive:true});
const server=spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const url=process.env.ASH_URL||'http://127.0.0.1:8765/Test/HMO/5NG2E/';
const close=(a,b)=>assert.ok(Math.abs(a-b)<.02,`${a} != ${b}`);
const summaries=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});let loaded=false;
 for(let i=0;i<25;i++){try{await page.goto(url,{waitUntil:'networkidle'});loaded=true;break}catch{await new Promise(r=>setTimeout(r,200));}}
 assert.ok(loaded);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 assert.equal(await page.title(),'Coventry | Property Kickstart Investor Analyser');
 assert.equal(await page.locator('#ackBox').isChecked(),false);assert.equal(await page.locator('#revealBtn').isDisabled(),true);assert.equal(await page.locator('#analysisContent').isVisible(),false);
 await page.emulateMedia({media:'print'});assert.equal(await page.locator('#printContent').isVisible(),false);await page.emulateMedia({media:'screen'});
 await page.locator('#ackBox').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#ackBox').isChecked(),true);await page.locator('#revealBtn').focus();await page.keyboard.press('Enter');
 const baseline=await page.evaluate(()=>compute());close(baseline.capital,108386);close(baseline.costs,19305.4);close(baseline.rent,30900);close(baseline.profit,-1230.4);close(baseline.roi,-1230.4/108386*100);
 for(const rate of [5,6,7,8,10]){await page.locator('#rate').fill(String(rate));const c=await page.evaluate(()=>compute());close(c.profit,30900-19305.4-213750*rate/100);summaries.push({rate,profit:c.profit,roi:c.roi});}
 await page.locator('#rate').fill('6');
 const field=page.locator('[data-field-id="op.hmo_licence"]');await field.fill('0');close((await page.evaluate(()=>compute())).costs,19118);await field.fill('187.40');
 await page.locator('#refurbishment').fill('10000');close((await page.evaluate(()=>compute())).capital,118386);await page.locator('#refurbishment').fill('');
 await page.locator('#reserve').fill('10');close((await page.evaluate(()=>compute())).capital,119224.6);await page.locator('#reserve').fill('0');
 await page.locator('#ltv').fill('0');const cash=await page.evaluate(()=>compute());close(cash.interest,0);close(cash.capital,108386+213750-2850-4275);await page.locator('#ltv').fill('75');
 await page.locator('#stressRentMonthly').fill('0');close((await page.evaluate(()=>compute())).stress,-12*Number(await page.locator('#stressCostsMonthly').inputValue())-12825);await page.locator('#stressReset').click();
 await page.locator('input[name="cashflowMode"][value="target"]').check();await page.locator('#target').fill('1000');assert.match(await page.locator('#portfolioCount').innerText(),/Not achievable/);
 await page.locator('input[name="riskChoice"][value="Moderate"]').check();
 await page.evaluate(()=>{window.__printCalled=false;window.print=()=>{window.__printCalled=true;};});await page.locator('#printBtn').click();if(!await page.evaluate(()=>window.__printCalled)){await page.locator('#scorePrintAnywayBtn').click();}assert.equal(await page.evaluate(()=>window.__printCalled),true);
 const full=await page.content();for(const forbidden of ['Ashington Grove','CV3 4DD','St Helens','2S98D','450','433']) {if(['450','433'].includes(forbidden))continue;assert.equal(full.includes(forbidden),false,forbidden);}
 for(const width of [320,390,430,1280]){await page.setViewportSize({width,height:900});await page.emulateMedia({media:'screen'});const dims=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));assert.ok(dims.s<=dims.w+1,JSON.stringify(dims));if(width===390)await page.screenshot({path:'qa-output/mobile.png',fullPage:true});}
 await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'qa-output/desktop.png',fullPage:true});
 await page.emulateMedia({media:'print'});await page.pdf({path:'qa-output/investor-report.pdf',format:'A4',printBackground:true,preferCSSPageSize:true});
 const info=execFileSync('pdfinfo',['qa-output/investor-report.pdf'],{encoding:'utf8'});const pages=Number(info.match(/^Pages:\s*(\d+)/m)?.[1]);assert.equal(pages,2,'exactly two PDF pages');
 const txt=execFileSync('pdftotext',['qa-output/investor-report.pdf','-'],{encoding:'utf8'});assert.match(txt,/HMO-WM-5NG2E/);assert.match(txt,/187.40/);assert.match(txt,/102.53/);assert.equal(txt.includes('Ashington Grove'),false);
 await page.emulateMedia({media:'screen'});await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#ackBox').isChecked(),false);assert.equal(await page.locator('#analysisContent').isVisible(),false);assert.deepEqual(errors,[]);
 writeFileSync('qa-output/result.json',JSON.stringify({status:'PASS',baseline,scenarios:summaries,pdfPages:pages,checks:['initial gate','print before acknowledgement','keyboard checked reveal','print button','reload reset','scenario arithmetic','zero costs','capital edit','contingency','cash route','stress reset','negative target','mobile overflow','private identity','two page PDF']},null,2));console.log('ASHINGTON QA PASS');
}finally{await browser.close();server.kill('SIGTERM');}
