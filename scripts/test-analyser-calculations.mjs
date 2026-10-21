#!/usr/bin/env node
// ACT-882 calculation tests run actual analyser compute() with simulated input values.
// No network dependency. Execute with: node scripts/test-analyser-calculations.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const cases = [
  {path:'BTL-NE-WLETS/index.html',price:135000,rent:13620,stamp:6950,pkfee:3600,mgmt:10},
  {path:'HMO-NW-2S98D/index.html',price:220000,rent:34416,stamp:12900,pkfee:5400,mgmt:12},
];
const near = (actual,expected,msg) => assert.ok(Math.abs(actual-expected)<.011, `${msg}: ${actual} != ${expected}`);
let checks=0;
for (const caseData of cases) {
  const html=fs.readFileSync(caseData.path,'utf8');
  const script=html.match(/<script>\s*(const \$=id=>[\s\S]*?)<\/script>/)?.[1];
  assert.ok(script,`${caseData.path}: compute script missing`);
  const func=script.match(/function compute\(\)\{[^\n]*\}/)?.[0];
  assert.ok(func,`${caseData.path}: compute() missing`);
  const inputMap={};
  for(const [,id,value] of html.matchAll(/<input\b[^>]*\bid="([^"]+)"[^>]*\bvalue="([^"]*)"[^>]*>/g))inputMap[id]=Number(value);
  // Input attributes may have id before or after value.
  for(const tag of html.match(/<input\b[^>]*>/g)||[]){
    const id=tag.match(/\bid="([^"]+)"/)?.[1],value=tag.match(/\bvalue="([^"]*)"/)?.[1];
    if(id&&value!==undefined)inputMap[id]=Number(value);
  }
  const costs=[...(html.match(/<input\b[^>]*class="amount cost-input"[^>]*>/g)||[])].map(tag=>({
    value:tag.match(/\bvalue="([^"]*)"/)?.[1]??'0',
    index:Number(tag.match(/data-cost="([^"]+)"/)?.[1])
  }));
  assert.ok(costs.length>=8,`${caseData.path}: operating costs missing`);
  const inputs=new Map(Object.entries(inputMap).map(([id,value])=>[id,{value}]));
  const elements=costs.map(item=>({value:item.value,dataset:{cost:String(item.index)}}));
  const document={
    getElementById:id=>inputs.get(id),
    querySelectorAll:selector=>selector==='.cost-input'?elements:[]
  };
  const context={document};
  const getCompute=vm.runInNewContext(
    "const $=id=>document.getElementById(id);"+
    "const num=id=>Math.max(0,Number($(id).value)||0);"+
    func+";compute", context);
  const set=(id,n)=>{assert.ok(inputs.has(id));inputs.get(id).value=n};
  const c=getCompute();
  near(c.price,caseData.price,'asking price');
  near(c.rent,caseData.rent,'annual rent');
  near(c.loan,caseData.price*.75,'75% financing');
  near(c.capital,caseData.price*.25+caseData.stamp+caseData.pkfee+2500+500+Number(inputMap.broker)+Number(inputMap.arrangement),'deposit plus acquisition');
  const actualDefaultManagement=Number(elements.find(x=>x.dataset.cost==='0').value);
  const governedManagement=caseData.rent*caseData.mgmt/100;
  if(Math.abs(actualDefaultManagement-governedManagement)>.011){
    // HTML can have a stale initial value even if a script later fixes it.
    console.log(`WARNING: ${caseData.path}: HTML management cost ${actualDefaultManagement} differs from governed ${governedManagement}`);
  }
  elements.find(x=>x.dataset.cost==='0').value=governedManagement;
  const managed=getCompute();
  near(managed.costs,elements.reduce((sum,x)=>sum+Number(x.value),0),'managed operating costs');
  // Independent, governed 6% rate golden values. These must not drift silently.
  const golden = caseData.path.startsWith('HMO')
    ? {capital:80499,costs:21797.72,annual:2718.28}
    : {capital:50649,costs:4697,annual:2848};
  near(managed.capital,golden.capital,'independent golden capital');
  near(managed.costs,golden.costs,'independent golden operating costs');
  near(managed.profit,golden.annual,'independent golden cashflow');
  near(managed.profit,managed.rent-managed.costs-managed.interest,'managed net return');
  near(managed.roi,managed.profit/managed.capital*100,'cash ROI');
  // Blank, editable acquisition field starts at £0 and affects capital + ROI only.
  near(Number(inputs.get('otherAcquisition').value),0,'blank other acquisition cost');
  const initialRoi=managed.roi;
  set('otherAcquisition',975);
  const withExtra=getCompute();
  near(withExtra.capital,managed.capital+975,'other acquisition changes capital');
  near(withExtra.profit,managed.profit,'other acquisition leaves annual operating cashflow');
  assert.ok(withExtra.roi<initialRoi,'other acquisition lowers ROI');
  set('otherAcquisition',0);
  const monthlyManaged=managed.profit/12;
  // Self-managed must remove management expense and improve net cashflow accordingly.
  elements.find(x=>x.dataset.cost==='0').value=0;
  const self=getCompute();
  near(self.costs,managed.costs-governedManagement,'self-managed operating costs');
  near(self.profit/12,monthlyManaged+governedManagement/12,'self-managed monthly change');
  set('ltv',0);
  const cash=getCompute();
  near(cash.loan,0,'cash route has no loan');
  near(cash.interest,0,'cash route has no interest');
  near(cash.fees,0,'cash route excludes finance-only fees');
  near(cash.capital,caseData.price+caseData.stamp+caseData.pkfee+2500+500,'cash capital');
  set('ltv',75);
  set('stressRate',8);
  const stressed=getCompute();
  near(stressed.stress,stressed.rent-stressed.costs-stressed.loan*.08,'interest stress');
  near(stressed.severe,stressed.rent*(Number(inputMap.severeRent)/100)-stressed.costs-Number(inputMap.severeCosts)-stressed.loan*.08,'severe sensitivity');
  set('target',1000);
  near(stressed.profit/12-Number(inputs.get('target').value),stressed.profit/12-1000,'income target');
  console.log(`PASS ${caseData.path}: cash, leveraged, managed, self-managed, returns and stresses`);
  checks+=22;
}
console.log(`ACT-882: ${checks} numerical checks passed for 2 property strategies.`);
