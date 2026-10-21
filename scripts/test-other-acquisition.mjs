#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const pages=[
  ['BTL-NE-WLETS/index.html','otherAcquisition'],
  ['HMO-NW-2S98D/index.html','otherAcquisition'],
  ['index.html','otherBuyingInput'],
  ['HA-SE-3FTDU/index.html','otherBuyingInput'],
  ['HA-NW-9JSFK/index.html','otherBuyingInput'],
  ['staging/ha-model-2/analyser-review.html','otherBuyingInput']
];
for(const [path,id] of pages){
  const html=fs.readFileSync(path,'utf8');
  const input=html.match(new RegExp('<input[^>]*id="'+id+'"[^>]*>'))?.[0];
  assert.ok(input,path+': optional field not found');
  assert.match(input,/value=""/,path+': optional field must start blank');
  assert.doesNotMatch(input,/readonly|disabled/,path+': optional field must be editable');
  if(path.startsWith('BTL')||path.startsWith('HMO-NW')){
    assert.match(html,/num\('otherAcquisition'\)/,path+': missing cost calculation');
    assert.match(html,/\['stamp','legal','broker','arrangement','survey','otherAcquisition','pkfee'\]/,path+': printed acquisition breakdown missing');
  }else{
    assert.match(html,/c\.otherBuying/,path+': missing cost calculation');
  }
  console.log('PASS '+path+': blank editable acquisition-cost field and calculation linkage');
}
const ha=fs.readFileSync('staging/ha-model-2/analyser-review.html','utf8');
assert.doesNotMatch(ha,/<tr hidden><td>Other <div/, 'HA stage additional acquisition field must not be hidden');
assert.match(ha,/const cash=c\.price-loan\+c\.stamp\+c\.legal\+c\.otherBuying\+pkfee/);
assert.match(ha,/const initialCapital=c\.price\+c\.stamp\+c\.legal\+c\.otherBuying\+/);
const body=ha.match(/function calculate\(ltv,rate,incomeRatio=1,other=0,c=selected\(\)\)\{([\s\S]*?)\}\nfunction render/)?.[1];
assert.match(ha,/\['Other acquisition costs',money\(val\('otherBuyingInput'\)\)\]/,'HA investor printout must show optional acquisition costs');
assert.ok(body,'HA formula not found');
const calculate=vm.runInNewContext('(function(ltv,rate,incomeRatio,other,c){'+body+'})');
const c={price:80000,rent:11400,stamp:4000,legal:2500,otherBuying:0,boiler:366,buildings:285,otherOwner:0};
const base=calculate(65,6.5,1,0,c);
const extra=calculate(65,6.5,1,0,{...c,otherBuying:975});
assert.equal(extra.cash-base.cash,975,'HA other costs must increase capital pound-for-pound');
assert.ok(extra.roi<base.roi,'HA other acquisition costs must reduce ROI');
console.log('PASS staged HA capital and ROI differential for £975 optional acquisition cost');
