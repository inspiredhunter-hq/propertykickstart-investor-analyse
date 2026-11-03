import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {spawn,execFileSync} from 'node:child_process';
const origin=process.env.PK_TEST_ORIGIN||'http://127.0.0.1:8768';
const server=process.env.PK_TEST_ORIGIN?null:spawn('python3',['-m','http.server','8768','--bind','127.0.0.1'],{stdio:'ignore'});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const directory='qa-evidence/hmo-parity';mkdirSync(directory,{recursive:true});
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<.005,`${message}: ${a} vs ${b}`);
const reports=[];
try{
 for(const [code,rent,price,standard,expectedCosts] of [['2S98D',2868,220000,1900,21756.72],['5NG2E',2575,285000,4250,20055]]){
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(let attempt=0;;attempt++){try{await page.goto(`${origin}/test/hmo/${code}/`,{waitUntil:'networkidle'});break;}catch(e){if(attempt===10)throw e;await new Promise(r=>setTimeout(r,150));}}
  assert.equal(await page.locator('html').getAttribute('data-review-version'),'hmo-parity-20261103');
  assert.equal(await page.locator('#ackBox').isChecked(),false);assert.equal(await page.locator('#revealBtn').isDisabled(),true);
  await page.emulateMedia({media:'print'});assert.equal(await page.locator('#printContent').isVisible(),false);await page.emulateMedia({media:'screen'});
  await page.locator('#ackBox').check();await page.locator('#revealBtn').click();
  const resetStyle=await page.locator('#resetSdltValues').evaluate(el=>{const s=getComputedStyle(el);return {background:s.backgroundColor,color:s.color,fontSize:s.fontSize,border:s.borderTopWidth};});
  assert.deepEqual(resetStyle,{background:'rgb(255, 255, 255)',color:'rgb(76, 38, 120)',fontSize:'13px',border:'1px'},'outlined reset matches BTL reference');
  assert.ok(Number(await page.locator('.sdlt-choice').evaluate(el=>getComputedStyle(el).fontWeight))>=650,'SDLT label bold');
  const resetBox=await page.locator('#resetSdltValues').boundingBox(),selectBox=await page.locator('#sdltSurchargeChoice').boundingBox();assert.ok(Math.abs(resetBox.x+resetBox.width-selectBox.x-selectBox.width)<=1,'reset aligned to right');
  const base=await page.evaluate(()=>compute());near(base.rent,rent*12,'source aggregate rent retained');near(base.costs,expectedCosts,'default annual costs');
  near(await page.evaluate(()=>num('stamp')),standard+price*.05,'split SDLT default total');
  assert.equal((await page.locator('#totalSdltOut').innerText()).replace(/[^0-9.]/g,''),String(standard+price*.05),'visible total SDLT');
  near(await page.evaluate(()=>num('sdltHigherInput')),price*.05,'surcharge is 5% component, not combined total');
  await page.locator('#sdltSurchargeChoice').selectOption('exclude');await page.locator('#sdltSurchargeChoice').dispatchEvent('change');
  const standardOnly=await page.evaluate(()=>compute());near(base.capitalWithout-standardOnly.capitalWithout,price*.05,'surcharge counted once');
  assert.equal(await page.locator('#sdltSurchargeRow').isVisible(),false);
  await page.locator('#sdltSurchargeChoice').selectOption('include');await page.locator('#sdltSurchargeChoice').dispatchEvent('change');
  await page.locator('#sdltHigherInput').fill('1,234.56');await page.locator('#sdltHigherInput').dispatchEvent('input');
  near(await page.evaluate(()=>num('stamp')),standard+1234.56,'manual surcharge');
  await page.locator('#price').fill(String(price+10000));await page.locator('#price').dispatchEvent('input');near(await page.evaluate(()=>num('sdltHigherInput')),1234.56,'manual surcharge override survives price edit');
  await page.locator('#resetSdltValues').click();near(await page.evaluate(()=>num('sdltHigherInput')),(price+10000)*.05,'reset restores calculated surcharge');
  await page.reload({waitUntil:'networkidle'});await page.locator('#ackBox').check();await page.locator('#revealBtn').click();
  for(const id of ['op.service_charge','op.ground_rent']){
   const field=page.locator(`[data-field-id="${id}"]`);assert.equal(await field.inputValue(),'','unknown charge blank');
   await field.fill('1,234.56');await field.dispatchEvent('input');
   const result=await page.evaluate(()=>compute());near(result.costs,base.costs+1234.56,'operating cost counted once');near(result.profit,base.profit-1234.56,'annual cashflow');near(result.capital,base.capital,'not acquisition capital');near(result.roi,result.profit/result.capital*100,'ROI reflects costs');
   assert.match(await page.locator('#pCosts').innerText(),/£1,234\.56/);
   await field.fill('');await field.dispatchEvent('input');
  }
  assert.equal(await page.locator('[data-field-id="op.landlord_registration"]').inputValue(),'');
  assert.equal(await page.locator('#landlordRegistrationInitial').inputValue(),'');
  assert.equal(await page.locator('[data-field-id="op.accounting"]').count(),1);
  assert.equal(await page.locator('[data-field-id="op.hmo.gas_servicing"]').count(),1);
  assert.equal(await page.locator('#scoreReminder').getByText('Have a question about the numbers?',{exact:false}).count(),0);
  assert.match(await page.locator('#scoreReminder').innerText(),/Your SCORE sets out what you want/);
  assert.equal(await page.locator('a').filter({hasText:'Submit a question'}).count(),1,'existing question CTA retained');
  await page.locator('#unitDetails').evaluate(el=>el.open=true);
  assert.equal(await page.locator('#unitRows tbody tr').count(),code==='5NG2E'?5:7);
  if(code==='5NG2E'){
   assert.equal(await page.locator('#unitRows').getByText('TBA',{exact:true}).count(),10);
   assert.equal(await page.locator('#unitRows').getByText('£0.00',{exact:true}).count(),0);
  }
  for(const width of [320,390,430,1280]){
   await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow '+width);
   for(const id of ['price','sdltStandardInput','sdltHigherInput']){const box=await page.locator('#'+id).boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1,'input fits '+id);}
  }
  await page.setViewportSize({width:390,height:844});await page.locator('.acquisition-card').screenshot({path:`${directory}/${code}-acquisition.png`});await page.locator('#grossRentSection').screenshot({path:`${directory}/${code}-rent.png`});
  await page.emulateMedia({media:'print'});
  for(const optional of [false,true]){
   if(optional){await page.emulateMedia({media:'screen'});await page.locator('#includeUnitPage').check();await page.emulateMedia({media:'print'});}
   const pdf=`${directory}/${code}-${optional?'three':'two'}-pages.pdf`;
   await page.pdf({path:pdf,format:'A4',printBackground:true,preferCSSPageSize:true});
   const info=execFileSync('pdfinfo',[pdf],{encoding:'utf8'});assert.equal(Number(info.match(/^Pages:\s*(\d+)/m)[1]),optional?3:2);
   const text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
   for(const label of ['Leasehold service charge','Ground rent','Accounting','Gas safety'])assert.ok(text.includes(label),'PDF field visible '+label);
   if(optional)assert.ok(text.includes('Room-by-room rental breakdown'));
   else assert.ok(!text.includes('Room-by-room rental breakdown'));
   // Fixed-height sheets must not silently crop the report.
   const bounds=await page.locator('.sheet').evaluateAll(sheets=>sheets.filter(s=>!s.hidden).map(s=>({height:s.clientHeight,scroll:s.scrollHeight})));
   assert.ok(bounds.every(b=>b.scroll<=b.height+2),'PDF sheets not clipped: '+JSON.stringify(bounds));
  }
  await page.emulateMedia({media:'screen'});await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#ackBox').isChecked(),false);
  assert.deepEqual(errors,[],'no page errors');reports.push({code,status:'PASS',base,roomRents:code==='5NG2E'?'unconfirmed; aggregate preserved':'source values retained',widths:[320,390,430,1280],pdfPages:[2,3]});await page.close();
 }
 writeFileSync(`${directory}/results.json`,JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
}finally{await browser.close();server?.kill('SIGTERM');}
