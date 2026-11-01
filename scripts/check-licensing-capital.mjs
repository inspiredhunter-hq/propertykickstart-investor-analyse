import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';

const origin = process.env.PK_TEST_ORIGIN || 'http://127.0.0.1:8766';
const server = process.env.PK_TEST_ORIGIN ? null : spawn('python3', ['-m','http.server','8766','--bind','127.0.0.1'], {stdio:'ignore'});
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const fields = [['hmoLicenceApplication','HMO licence application fee'],['additionalLicensing','Additional licensing fee'],['selectiveLicensing','Selective licensing fee']];
const close = (a,b,msg) => assert.ok(Math.abs(a-b)<0.005, `${msg}: ${a} vs ${b}`);
const evidence = [];
mkdirSync('qa-evidence/licensing', {recursive:true});
try {
 for (const suffix of ['2S98D','5NG2E']) {
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  const url=`${origin}/test/hmo/${suffix}/`;
  for(let i=0;;i++){try{await page.goto(url,{waitUntil:'networkidle'});break;}catch(e){if(i===15)throw e;await new Promise(r=>setTimeout(r,100));}}
  assert.equal(await page.locator('#ackBox').isChecked(),false);
  assert.equal(await page.locator('#revealBtn').isDisabled(),true);
  await page.emulateMedia({media:'print'});
  assert.equal(await page.locator('#printContent').isVisible(),false,'print hidden until acknowledgement');
  await page.emulateMedia({media:'screen'});
  await page.locator('#ackBox').check(); await page.locator('#revealBtn').click();
  const base = await page.evaluate(()=>compute());
  const renewal = await page.locator('[data-field-id="op.hmo_licence"]').inputValue();
  const raw = id=>page.locator('#'+id);
  const fill = async(id,value)=>{await raw(id).fill(String(value));await raw(id).dispatchEvent('input');};
  for(const [id,label] of fields){
   assert.equal(await page.locator('.acquisition-card #'+id).count(),1);
   assert.equal(await page.getByLabel(label,{exact:true}).isEditable(),true);
  }
  if(suffix==='5NG2E'){
   close(Number((await raw('hmoLicenceApplication').inputValue()).replaceAll(',','')),1571,'existing Coventry provision migrated');
   assert.equal(await raw('otherAcquisition').inputValue(),'','no duplicate in other acquisition');
  }
  const initialFees = await page.evaluate(()=>num('hmoLicenceApplication')+num('additionalLicensing')+num('selectiveLicensing'));
  for(const [id] of fields)await fill(id,'');
  const zero=await page.evaluate(()=>compute());
  close(base.capitalWithout-zero.capitalWithout,initialFees,'initial fees counted once');
  for(const [id,label] of fields){
   await fill(id,'1,234.56'); await raw(id).blur();
   const c=await page.evaluate(()=>compute());
   close(c.capitalWithout,zero.capitalWithout+1234.56,label+' acquisition');
   close(c.capital,(zero.capitalWithout+1234.56)*1.1,label+' contingency');
   close(c.profit,base.profit,label+' leaves annual cashflow unchanged');
   close(c.roi,c.profit/c.capital*100,label+' ROI');
   assert.match(await page.locator('#pAcquisition').innerText(),new RegExp(label+'\\s+£1,234.56'));
   await fill(id,'');
  }
  await fill('hmoLicenceApplication',1571);await fill('additionalLicensing',222.22);await fill('selectiveLicensing',333.33);
  const sum=2126.55,c=await page.evaluate(()=>compute());
  close(c.capitalWithout,zero.capitalWithout+sum,'combined fees');
  close(c.costs,base.costs,'renewal and operating costs preserved');
  assert.equal(await page.locator('[data-field-id="op.hmo_licence"]').inputValue(),renewal);
  close(c.roi,c.profit/c.capital*100,'combined ROI');
  const stressRoi = await page.locator('#stressRoi').innerText();
  assert.equal(stressRoi,(c.stress/c.capital*100).toFixed(2)+'%','stress uses updated capital');
  await fill('reserve',0);close((await page.evaluate(()=>compute())).capital,zero.capitalWithout+sum,'zero contingency');
  await fill('ltv',0);
  const cash=await page.evaluate(()=>compute());
  close(cash.loan,0,'cash purchase loan');
  close(cash.roi,cash.profit/cash.capital*100,'cash purchase ROI');
  await fill('ltv',75);await fill('reserve',10);
  for(const width of [320,390,430,1280]){
   await page.setViewportSize({width,height:900});
   const d=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
   assert.ok(d.scroll<=d.width+1,'no horizontal overflow at '+width);
   for(const [id] of fields){const b=await raw(id).boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width,'field fits '+id);}
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('.acquisition-card').screenshot({path:`qa-evidence/licensing/${suffix}-capital-mobile.png`});
  await page.emulateMedia({media:'print'});
  const pdf=`qa-evidence/licensing/${suffix}.pdf`;
  await page.pdf({path:pdf,format:'A4',printBackground:true,preferCSSPageSize:true});
  const info=execFileSync('pdfinfo',[pdf],{encoding:'utf8'});
  const pages=Number(info.match(/^Pages:\s*(\d+)/m)?.[1]);
  assert.equal(pages,2,'two-page PDF after three additional rows');
  const pdfText=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
  for(const [,label] of fields)assert.ok(pdfText.includes(label),'PDF includes '+label);
  await page.emulateMedia({media:'screen'});
  await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('#ackBox').isChecked(),false,'refresh resets gate');
  await page.locator('#ackBox').check();await page.locator('#revealBtn').click();
  close((await page.evaluate(()=>compute())).capital,base.capital,'reload restores defaults');
  assert.deepEqual(errors,[],'no page errors');
  evidence.push({url,status:'PASS',baseline:base,feesTestedIndividually:1234.56,combinedFees:sum,pdfPages:pages,widths:[320,390,430,1280]});
  await page.close();
 }
 writeFileSync('qa-evidence/licensing/results.json',JSON.stringify(evidence,null,2));
 console.log(JSON.stringify(evidence,null,2));
} finally {await browser.close();server?.kill('SIGTERM');}
