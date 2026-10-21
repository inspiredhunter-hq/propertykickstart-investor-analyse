#!/usr/bin/env node
// ACT-882 governed HA finance regression, including preservation of the featured SMART page.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const near=(a,b,label)=>assert.ok(Math.abs(a-b)<.011,`${label}: ${a} expected ${b}`);
const properties=[
  {path:'index.html',rent:52800,price:550000,baselineCapital:206199,baselineMonth:2248},
  {path:'HA-SE-3FTDU/index.html',rent:52800,price:550000,baselineCapital:206199,baselineMonth:2248},
  {path:'HA-NW-9JSFK/index.html',rent:27828,price:290000}
];
for (const p of properties){
  const html=fs.readFileSync(p.path,'utf8');
  const def=html.match(/const DEFAULT=(\{[^\n]*\});/)?.[1];
  const body=html.match(/function calculate\(ltv,rate,incomeRatio=1,other=0,c=selected\(\)\)\{([\s\S]*?)\}\nfunction render/)?.[1];
  assert.ok(def&&body,`${p.path}: model missing`);
  const DEFAULT=vm.runInNewContext('('+def+')');
  const calculate=vm.runInNewContext('(function(ltv,rate,incomeRatio,other,c){'+body+'})');
  near(DEFAULT.price,p.price,p.path+' asking price');
  near(DEFAULT.rent,p.rent,p.path+' annual rent');
  const base=calculate(75,6,1,0,DEFAULT),cash=calculate(0,6,1,0,DEFAULT);
  near(base.loan,.75*DEFAULT.price,p.path+' leveraged advance');
  near(base.cash,.25*DEFAULT.price+DEFAULT.stamp+DEFAULT.legal+DEFAULT.survey+DEFAULT.otherBuying+base.pkfee+DEFAULT.broker+DEFAULT.arrangement,p.path+' acquisition total');
  near(cash.loan,0,p.path+' cash route loan');
  near(cash.fees,0,p.path+' no mortgage fee in cash route');
  near(cash.interest,0,p.path+' no interest for cash buyer');
  near(cash.cash,DEFAULT.price+DEFAULT.stamp+DEFAULT.legal+DEFAULT.survey+DEFAULT.otherBuying+cash.pkfee,p.path+' cash capital');
  const changed=calculate(75,6,1,0,{...DEFAULT,otherBuying:625});
  near(changed.cash-base.cash,625,p.path+' optional other costs affect capital');
  near(changed.profit,base.profit,p.path+' acquisition cost is not recurring');
  assert.ok(changed.roi<base.roi,p.path+' ROI decreases with additional capital');
  const stress=calculate(75,8,.90,2500,DEFAULT);
  near(stress.profit,.9*DEFAULT.rent-base.ops-2500-.08*base.loan,p.path+' stressed profit');
  assert.ok(stress.profit<base.profit,p.path+' stress reduces profit');
  if(p.baselineCapital)near(base.cash,p.baselineCapital,p.path+' preserved Maidstone capital');
  if(p.baselineMonth)near(base.profit/12,p.baselineMonth,p.path+' preserved Maidstone monthly net');
  assert.match(html,/Other buying costs',money\(val\('otherBuyingInput'\)\)/,p.path+' printable costs missing');
  console.log('PASS '+p.path+': HA 6% base, cash purchase, other acquisition, 8% stress and print');
}
console.log('ACT-882: 3 established HA/SMART locations verified numerically');
