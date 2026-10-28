#!/usr/bin/env node
// ACT-882 candidate safety: no assertions about unverified source details.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
const src=readFileSync('drafts/HMO-NW-2S98D-btl-master/index.html','utf8');
const expected=['1. Your SCORE criteria','2. Acquisition and finance illustration','3. Gross Rent','4. Annual operating costs','5. Illustrative Investment returns','6. Income Target Comparison','7. Stress-test the numbers','8. VALUE · Your next decision'];
let at=0;
for(const x of expected){const i=src.indexOf(x,at);assert.ok(i>=at,'missing/out of order: '+x);at=i+x.length;}
assert.equal([...src.matchAll(/<h2[^>]*>\d+\. /g)].length,8,'exactly eight numbered sections');
assert.match(src,/data-property-code="HMO-NW-2S98D"/);
assert.match(src,/id="rate"[^>]*value="6"/);
assert.match(src,/id="managementRate"[^>]*value="12"/);
assert.doesNotMatch(src,/Our illustration assumes|What could be different\?/,'excluded duplicate risk table');
const roomJson=src.match(/<script type="application\\/json" id="unitRentalData">([\\s\\S]*?)<\\/script>/);
assert.ok(roomJson,'room rental JSON must exist');
const roomData=JSON.parse(roomJson[1]);
assert.equal(roomData.unitCount,7);
assert.deepEqual(roomData.units.map(u=>u.monthlyRentGBP),[450,320,390,440,410,425,433]);
assert.equal(roomData.units.reduce((n,u)=>n+u.monthlyRentGBP,0),2868);
const inputs=[...src.matchAll(/<input[^>]+class="amount cost-input"[^>]*>/g)].map(x=>x[0]);
assert.equal(inputs.length,9,'all nine currently reconciled St Helens cost categories');
const costs=inputs.map(s=>Number(s.match(/value="([^"]+)"/)[1]));
assert.ok(Math.abs(costs.reduce((a,b)=>a+b,0)-21797.72)<0.001);
for(const id of ['refurbishment','furniture','fireSafetyWorks','conversion']){
 assert.match(src,new RegExp('id="'+id+'"'));
 assert.match(src,new RegExp("num\\('"+id+"'\\)"),'acquisition cost participates in capital');
}
for(const m of src.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g)){
 if(m[1].trim())new Script(m[1],{filename:'HMO-candidate-inline.js'});
}
console.log('PASS HMO candidate BTL section architecture, identity, costs, rate and JavaScript parsing');
