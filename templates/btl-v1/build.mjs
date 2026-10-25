#!/usr/bin/env node
// BTL Standard v1.0: render one property-specific analyser from the approved template.
// Usage: node templates/btl-v1/build.mjs <property.json> <output/index.html>
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import assert from 'node:assert/strict';
const [configurationPath,outputPath]=process.argv.slice(2);
if(!configurationPath||!outputPath)throw new Error('Usage: node templates/btl-v1/build.mjs <property.json> <output/index.html>');
const here=dirname(new URL(import.meta.url).pathname);
const template=readFileSync(resolve(here,'index.template.html'),'utf8');
const data=JSON.parse(readFileSync(resolve(configurationPath),'utf8'));
const tokens=[...new Set([...template.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map(x=>x[1]))];
const missing=tokens.filter(k=>!(k in data)||data[k]===null||data[k]==='');
if(missing.length)throw new Error('Required BTL fields missing: '+missing.join(', '));
for(const k of Object.keys(data))if(!tokens.includes(k))throw new Error('Unknown property field: '+k);
for(const k of tokens){
 const value=data[k];
 if(k==='PROPERTY_CODE'&&!/^BTL-[A-Z0-9-]+$/.test(String(value)))throw new Error('Invalid BTL property code');
 if((k==='PRICE'||k==='RENT'||k==='LTV'||k==='RATE'||k==='RESERVE'||k==='MANAGEMENTRATE'||k.startsWith('COST_')||['STAMP','LEGAL','BROKER','ARRANGEMENT','SURVEY','STRESSRATESLIDER','STRESSRATE','STRESSRENTSLIDER','STRESSRENTMONTHLY','STRESSCOSTSSLIDER','STRESSCOSTSMONTHLY'].includes(k))&&(!Number.isFinite(Number(value))||Number(value)<0))throw new Error('Invalid non-negative numeric value: '+k);
 if(typeof value==='string'&&/[<>]/.test(value))throw new Error('Markup is not allowed in property field: '+k);
}
assert.equal(Number(data.RENT),Number(data.STRESSRENTMONTHLY)*12,'Default stress rent must equal annual rental income');
assert.equal(Number(data.STRESSRATE),Number(data.RATE),'Default scenario rate must match main financing');
const costs=Object.keys(data).filter(k=>k.startsWith('COST_')).reduce((sum,k)=>sum+Number(data[k]),0);
assert.ok(Math.abs(costs/12-Number(data.STRESSCOSTSMONTHLY))<0.011,'Stress operating-cost defaults must reconcile with annual costs');
const money=n=>'£'+n.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
assert.equal(data.ASKING_PRICE_DISPLAY,money(Number(data.PRICE)),'Asking price header must match numeric model');
assert.equal(data.MONTHLY_RENT_DISPLAY,money(Number(data.RENT)/12),'Rent header must match numeric model');
const rendered=template.replace(/\{\{([A-Z0-9_]+)\}\}/g,(_,k)=>String(data[k]));
if(/\{\{[^}]+\}\}/.test(rendered))throw new Error('Unresolved BTL placeholder');
mkdirSync(dirname(resolve(outputPath)),{recursive:true});
writeFileSync(resolve(outputPath),rendered);
process.stdout.write('BTL Standard v1.0 rendered: '+data.PROPERTY_CODE+' → '+outputPath+'\n');
