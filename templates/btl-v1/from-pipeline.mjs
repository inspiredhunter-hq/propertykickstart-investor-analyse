#!/usr/bin/env node
// BTL Standard v1 Pipeline adapter. No invented or inherited financial assumptions.
// Input: Notion Pipeline property export JSON + documented per-property assumptions.
// Output: 36-value config for build.mjs. Safe defaults exist only for derived display fields.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const [pipelineFile,approvedFile,outputFile]=process.argv.slice(2);
if(!pipelineFile||!approvedFile||!outputFile)throw Error('Usage: node templates/btl-v1/from-pipeline.mjs <pipeline-record.json> <approved-assumptions.json> <config-out.json>');
const raw=JSON.parse(readFileSync(resolve(pipelineFile),'utf8'));
const record=raw.properties??raw;
const approved=JSON.parse(readFileSync(resolve(approvedFile),'utf8'));
const val=k=>{let x=record[k];if(x&&typeof x==='object'){if(x.type==='number')return x.number;if(x.type==='formula')return x.formula?.number;if(x.type==='select')return x.select?.name;if(x.type==='rich_text'||x.type==='title')return x[x.type]?.map(z=>z.plain_text??z.text?.content??'').join('');}if(typeof x==='string'&&/^\["/.test(x)){try{return JSON.parse(x)[0]}catch{}}return x};
const missing=x=>x===undefined||x===null||x==='';
const number=(v,k)=>{if(missing(v)||!Number.isFinite(Number(v))||Number(v)<0)throw Error('Missing or invalid numeric value: '+k);return Number(v)};
const text=(v,k)=>{if(missing(v))throw Error('Missing required property fact: '+k);return String(v)};
const fmt=n=>'£'+n.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
const defs={
 PROPERTY_CODE:'Property Code',TOWN:'Town',REGION:'UK Region',PRICE:'Asking Price',
 RENT:'Annual Rent (PDF)',MANAGEMENTRATE:'Management %',RATE:'Interest Rate % Assumption',
 STAMP:'Stamp Duty',LEGAL:'Legal Fees',BROKER:'Brokerage',ARRANGEMENT:'Mortgage Arrangement Fee (£)',SURVEY:'Survey / Valuation Cost (£)',
 COST_0:'Annual Management Cost',COST_1:'Annual Maintenance Allowance',COST_2:'Annual Void Allowance',COST_3:'Annual Insurance',
 COST_11:'Boiler Heating Plumbing Cover pa',COST_4:'Annual Compliance and Licensing Costs',
 COST_6:'Service Charge pa',COST_7:'Ground Rent pa',COST_8:'Annual Accounting / Admin Cost',COST_9:'Annual Landlord Council Tax Cost',COST_10:'Other Annual Costs'};
const data={};
for(const k of ['PROPERTY_CODE','TOWN','REGION'])data[k]=text(val(defs[k]),defs[k]);
assert.match(data.PROPERTY_CODE,/^BTL-[A-Z0-9-]+$/,'BTL property code required');
data.PRICE=number(val(defs.PRICE),'Asking Price');
const annual=val('Total Annual Rent (Calc)'),sourceRent=val('Annual Rent (PDF)'),monthly=val('Rent pm (Model)')??val('Monthly Rent (PDF)');
if(!missing(annual))data.RENT=number(annual,'Total Annual Rent (Calc)');
else if(!missing(sourceRent))data.RENT=number(sourceRent,'Annual Rent (PDF)');
else if(!missing(monthly))data.RENT=number(monthly,'Monthly rent')*12;
else throw Error('Missing evidenced rent in Pipeline');
if(!missing(monthly)&&Math.abs(Number(monthly)*12-data.RENT)>0.02)throw Error('Conflicting monthly and annual rental values');
data.ASKING_PRICE_DISPLAY=fmt(data.PRICE);data.MONTHLY_RENT_DISPLAY=fmt(data.RENT/12);
// Descriptive/public facts must be explicitly reviewed; no full address auto-publication.
for(const k of ['DISPLAY_ADDRESS','PROPERTY_DESCRIPTION'])data[k]=text(approved.values?.[k],k+' (public clearance required)');
const numeric=['LTV','RATE','RESERVE','MANAGEMENTRATE','STAMP','LEGAL','BROKER','ARRANGEMENT','SURVEY','COST_0','COST_1','COST_2','COST_3','COST_11','COST_4','COST_5','COST_6','COST_7','COST_8','COST_9','COST_10'];
for(const k of numeric){
 const from=defs[k]?val(defs[k]):null;
 if(!missing(from)){data[k]=number(from,defs[k]);continue}
 const override=approved.values?.[k], evidence=approved.evidence?.[k];
 if(missing(override)||typeof evidence!=='string'||evidence.trim().length<12)throw Error('Missing approved assumption and evidence: '+k+' (Pipeline '+(defs[k]??'no direct field')+')');
 data[k]=number(override,k);
}
const sum=Array.from({length:12},(_,i)=>data['COST_'+i]).reduce((a,b)=>a+b,0);
data.STRESSRATE=data.RATE;data.STRESSRATESLIDER=data.RATE;
data.STRESSRENTMONTHLY=data.RENT/12;data.STRESSRENTSLIDER=data.RENT/12;
data.STRESSCOSTSMONTHLY=Number((sum/12).toFixed(2));data.STRESSCOSTSSLIDER=data.STRESSCOSTSMONTHLY;
// Explicitly require independent property-code match before applying any overrides.
assert.equal(approved.propertyCode,data.PROPERTY_CODE,'Assumptions must be approved for this exact property');
const template=readFileSync(fileURLToPath(new URL('./index.template.html',import.meta.url)),'utf8');
const tokens=[...new Set([...template.matchAll(/\{\{([A-Z0-9_]+)\}\}/g)].map(x=>x[1]))];
assert.deepEqual(Object.keys(data).sort(),tokens.sort(),'Adapter must generate every and only template token');
mkdirSync(dirname(resolve(outputFile)),{recursive:true});
writeFileSync(resolve(outputFile),JSON.stringify(data,null,2)+'\n');
console.log('PASS evidence-aware BTL config: '+data.PROPERTY_CODE);
