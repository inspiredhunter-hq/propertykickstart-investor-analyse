#!/usr/bin/env node
// ACT-882 test: actual management control event wiring from BTL/HMO pages.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

for(const [path,defaultRate,managedLabel] of [
  ['HMO-NW-2S98D/index.html',12,'Managed HMO'],
  ['BTL-NE-WLETS/index.html',10,'Managed Buy to Let']
]){
  const html=fs.readFileSync(path,'utf8');
  const js=html.slice(html.indexOf('let managementOverride='),html.indexOf('</script>',html.indexOf('let managementOverride=')));
  assert.ok(js.startsWith('let managementOverride='),path+' missing management wiring');
  const listeners={};
  const elem=(value='')=>({value:String(value),dataset:{},listeners:{},addEventListener(event,callback){this.listeners[event]=callback}});
  const rate=elem(defaultRate),rent=elem(path.startsWith('HMO')?34416:13620);
  const management=elem(path.startsWith('HMO')?4129.92:1362);
  const mode=elem(managedLabel);
  const targetInput=elem(1000);
  const elements={managementRate:rate,rent,involvement:mode,printBtn:elem(),resetBtn:elem()};
  rate.closest=()=>({nextElementSibling:{querySelector:()=>management}});
  management.classList={contains:s=>s==='cost-input'};
  management.dataset.cost='0';
  const document={
    getElementById:id=>elements[id]??(elements[id]=elem()),
    querySelectorAll:selector=>selector==='.cost-input'?[management]:[]
  };
  const ctx={
    document,window:{print(){}},location:{reload(){}},
    render(){},
    num:id=>Math.max(0,Number(document.getElementById(id).value)||0)
  };
  vm.runInNewContext("const $=id=>document.getElementById(id);"+js,ctx);
  const approx=(a,b,label)=>assert.ok(Math.abs(a-b)<0.011,`${path}: ${label}: ${a} versus ${b}`);
  const trigger=(node,event)=>{assert.ok(node.listeners[event],path+': missing '+event);node.listeners[event]({target:node})};
  assert.equal(Number(rate.value),defaultRate,'governed default rate');
  assert.equal(Number(management.value),Number(rent.value)*defaultRate/100,'governed default cost');
  rate.value='10';trigger(rate,'input');
  approx(Number(management.value),Number(rent.value)*.10,'negotiated 10% recalculation');
  rent.value=Number(rent.value)+1200;trigger(rent,'input');
  approx(Number(management.value),Number(rent.value)*.10,'rent change reflows percent');
  management.value=Number(rent.value)*.08;trigger(management,'input');
  assert.equal(Number(rate.value),8,'manual cost change must reflect 8% actual rate');
  mode.value='Self-managed';trigger(mode,'change');
  assert.equal(Number(rate.value),0,'self-managed rate');
  assert.equal(Number(management.value),0,'self-managed cost');
  mode.value=managedLabel;trigger(mode,'change');
  assert.equal(Number(rate.value),8,'return to managed restores negotiated rate');
  approx(Number(management.value),Number(rent.value)*.08,'managed cost restored');
  console.log('PASS '+path+': 12/10 baseline, 10% negotiation, changed rent, manual annual override, self-manage and restore');
}
