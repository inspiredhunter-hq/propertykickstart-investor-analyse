const {chromium}=require('playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 fs.mkdirSync('survey-qa',{recursive:true});
 const html=fs.readFileSync('production/2027/index.html','utf8');
 try{for(const width of [320,375,768,1366]){
  const page=await browser.newPage({viewport:{width,height:812}});
  await page.setContent(html);
  await page.evaluate(()=>{step=11;render()});
  const inputs=await page.locator('input[type=text],input[type=email],input[type=tel]').evaluateAll(els=>els.map(e=>({width:e.getBoundingClientRect().width,display:getComputedStyle(e).display})));
  assert.equal(inputs.length,3);
  assert(inputs.every(e=>e.display==='block'&&e.width>200&&e.width<width));
  assert.equal(new Set(inputs.map(e=>e.width)).size,1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByRole('checkbox',{name:'Yes, show me the joining link.',exact:true}).check();
  const link=page.getByRole('link',{name:'Join the Property Kickstart WhatsApp community',exact:true});
  assert.equal(await link.getAttribute('target'),'_blank');
  assert(await page.getByText('Opens in a new tab or WhatsApp. Your survey will stay open here.',{exact:true}).isVisible());
  await page.screenshot({path:`survey-qa/contact-${width}.png`,fullPage:true});
  await page.evaluate(()=>{a[10]="Possibly, for the right opportunity";step=12;render()});
  const cta=page.getByRole('link',{name:'Continue to Investor Assessment →',exact:true});
  assert.equal(await cta.getAttribute('target'),'_blank');
  assert.equal(await cta.evaluate(e=>e.getClientRects().length),1);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await page.getByRole('button',{name:'Submit survey',exact:true}).count(),0);
  await page.screenshot({path:`survey-qa/success-${width}.png`,fullPage:true});
  await page.evaluate(()=>{a[10]='Not at the moment';render()});
  assert.equal(await page.getByRole('link',{name:'Continue to Investor Assessment →',exact:true}).count(),0);
  await page.close();console.log(`PASS: ${width}px contact fields, no overflow, WhatsApp note, wrapped CTA and interest branching`);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
