#!/usr/bin/env node
// ACT-882 production custom-domain acceptance: run from GitHub Actions runner.
import assert from 'node:assert/strict';
const sites=[
 ['/','Maidstone','incomeComparison'],
 ['/HA-SE-3FTDU/','Maidstone','incomeComparison'],
 ['/HA-NW-9JSFK/','Preston','incomeComparison'],
 ['/BTL-NE-WLETS/','BTL-NE-WLETS','risk-highlight'],
 ['/HMO-NW-2S98D/','HMO-NW-2S98D','managementRate']
];
for(const [path,identity,feature] of sites){
 const url='https://deals.propertykickstart.co.uk'+path;
 let last;
 for(let attempt=0;attempt<4;attempt++){
   try{
     const response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(15000),headers:{'cache-control':'no-cache'}});
     assert.equal(response.status,200,url+' returned '+response.status);
     const body=await response.text();
     assert.ok(body.includes(identity),url+' property identity not found');
     assert.ok(body.includes(feature),url+' expected feature not found');
     assert.ok(body.includes('Investment risk:'),url+' investment risk notice missing');
     console.log('PASS live HTTP '+url+' status 200, identity '+identity+', feature '+feature);
     last=null; break;
   }catch(err){last=err;console.log('RETRY '+url+' '+String(err).slice(0,200));}
 }
 if(last)throw last;
}
console.log('ALL 5 public routes reachable with expected content on custom domain');
