#!/usr/bin/env node
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';import assert from 'node:assert/strict';
const dir=mkdtempSync(join(tmpdir(),'pk-btl-map-'));
const here=resolve(new URL('.',import.meta.url).pathname);
const reference=JSON.parse(readFileSync(join(here,'reference.south-shields.json'),'utf8'));
const pipeline={'Property Code':'BTL-NE-WLETS','Town':'South Shields','UK Region':'North East','Asking Price':135000,'Annual Rent (PDF)':13620,'Monthly Rent (PDF)':1135};
pipeline['Unit Rental Breakdown']=reference.UNIT_RENTAL_BREAKDOWN_JSON;
const mapping={PROPERTY_CODE:'Property Code',TOWN:'Town',REGION:'UK Region',PRICE:'Asking Price',RENT_MONTHLY:'Monthly Rent (PDF)',MANAGEMENTRATE:'Management %',RATE:'Interest Rate % Assumption',STAMP:'Stamp Duty',LEGAL:'Legal Fees',BROKER:'Brokerage',ARRANGEMENT:'Mortgage Arrangement Fee (£)',SURVEY:'Survey / Valuation Cost (£)',COST_0:'Annual Management Cost',COST_1:'Annual Maintenance Allowance',COST_2:'Annual Void Allowance',COST_3:'Annual Insurance',COST_11:'Boiler Heating Plumbing Cover pa',COST_4:'Annual Compliance and Licensing Costs',COST_6:'Service Charge pa',COST_7:'Ground Rent pa',COST_8:'Annual Accounting / Admin Cost',COST_9:'Annual Landlord Council Tax Cost',COST_10:'Other Annual Costs'};
for(const [k,v] of Object.entries(mapping)){if(['PROPERTY_CODE','TOWN','REGION','PRICE','RENT_MONTHLY'].includes(k))continue;pipeline[v]=reference[k]}
const extra=['PROPERTY_SUMMARY','PROPERTY_PRINT_SUMMARY','LTV','RESERVE','COST_5'];
const assumptions={propertyCode:reference.PROPERTY_CODE,values:Object.fromEntries(extra.map(k=>[k,reference[k]])),evidence:Object.fromEntries(extra.map(k=>[k,'Test fixture approved source, not live evidence']))};
const run=(p,a)=>{writeFileSync(join(dir,'pipeline.json'),JSON.stringify(p));writeFileSync(join(dir,'assumptions.json'),JSON.stringify(a));return spawnSync(process.execPath,[join(here,'from-pipeline.mjs'),join(dir,'pipeline.json'),join(dir,'assumptions.json'),join(dir,'result.json')],{encoding:'utf8'})};
try{
 let r=run(pipeline,assumptions);assert.equal(r.status,0,r.stderr);
 const output=JSON.parse(readFileSync(join(dir,'result.json')));
 assert.deepEqual(output,reference,'Pipeline mapping and explicit assumptions must recreate golden South Shields config');
 const missing={...pipeline};delete missing['Asking Price'];r=run(missing,assumptions);assert.notEqual(r.status,0,'Missing price must fail closed');
 const bad={...pipeline};delete bad['Annual Insurance'];r=run(bad,assumptions);assert.notEqual(r.status,0,'Missing cost and unapproved default must fail closed');
 const mismatch={...assumptions,propertyCode:'BTL-OTHER'};r=run(pipeline,mismatch);assert.notEqual(r.status,0,'Property-code mismatch must fail');
 console.log('PASS BTL Pipeline adapter golden conversion + missing-field and identity guards');
}finally{rmSync(dir,{force:true,recursive:true})}
