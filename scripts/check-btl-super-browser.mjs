// ACT-914 BTL interactive TEST browser checks; mocks the protected Pipeline, never changes real records.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const root=path.resolve('test');
const example={propertyCode:'BTL-NW-12345',strategy:'Buy to Let',town:'St Helens',region:'North West',askingPrice:222000,purchasePrice:220000,monthlyRent:1500,brokerage:2200,legalFees:1500,survey:400,arrangementFee:1299,stampDuty:10500,annualInsurance:400,managementRate:10,refurb:2000,furnishing:600,maintenance:900,annualVoid:900,annualOther:200,annualGroundRent:0,annualCompliance:250,otherAcquisition:350};
const sourceFields=Object.fromEntries(Object.entries(example).map(([k])=>[k,k]));
const server=http.createServer(async(req,res)=>{
 if(req.url==='/\.netlify/functions/pipeline-property' && req.method==='POST'){
  let raw='';for await (const chunk of req)raw+=chunk;const {propertyCode}=JSON.parse(raw);
  res.setHeader('Content-Type','application/json');
  if(propertyCode!==example.propertyCode){res.writeHead(404);res.end(JSON.stringify({error:'No unique matching Pipeline record found'}));return;}
  res.end(JSON.stringify({property:example,sourceFields,lastEdited:'2026-11-11T10:00:00Z'}));return;
 }
 const target=req.url==='/NewCalculator/'?'/NewCalculator/index.html':req.url;
 const file=path.resolve(root,'.'+target.split('?')[0]);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 try{const b=fs.readFileSync(file);res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(b);}catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:'+port+'/NewCalculator/',{waitUntil:'load'});
 assert(await page.locator('#pkLookupInput').isVisible(),'Top PK Code field missing');
 assert(await page.locator('#pkLookupButton').isVisible(),'Load button missing');
 assert(await page.locator('#analysisContent').isHidden(),'Acknowledgement gate must initially block analysis');
 await page.locator('#ackBox').check();await page.locator('#revealBtn').click();
 assert(await page.locator('#analysisContent').isVisible(),'Acknowledged analysis should be visible');
 await page.locator('#pkLookupInput').fill('BTL-NW-12345');
 assert(await page.locator('#analysisContent').isHidden(),'Changing code must hide stale data');
 await page.locator('#pkLookupKey').fill('test-only-key');
 await page.locator('#pkLookupButton').click();
 await page.getByText('Loaded BTL-NW-12345 from Notion Deals Pipeline',{exact:false}).waitFor();
 assert.equal(await page.locator('#price').inputValue(),'220000','Agreed purchase price must override asking price');
 assert.equal(await page.locator('#rent').inputValue(),'1500');
 assert.equal(await page.locator('#broker').inputValue(),'2200');
 assert.equal(await page.locator('#superInitialWorks').inputValue(),'2000');
 assert.equal(await page.locator('#superFurniture').inputValue(),'600');
 assert(await page.locator('#analysisContent').isVisible(),'Loaded analysis should return after acknowledgement');
 assert((await page.locator('[data-pk-universal-header]').innerText()).includes('BTL-NW-12345'));
 assert(await page.locator('#unitDetails').isHidden(),'Old unit fixture must be hidden for new Pipeline property');
 // Altering the chosen code must never show stale figures, even if the request fails.
 await page.locator('#pkLookupInput').fill('BTL-NW-99999');
 assert(await page.locator('#analysisContent').isHidden());
 await page.locator('#pkLookupButton').click();
 await page.getByText('Unable to load BTL-NW-99999',{exact:false}).waitFor();
 assert(await page.locator('#analysisContent').isHidden(),'Failed lookup must be fail-closed');
 assert.equal(errors.length,0,'Uncaught page errors: '+errors.join('; '));
 console.log('ACT-914 BTL interactive browser checks passed');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
