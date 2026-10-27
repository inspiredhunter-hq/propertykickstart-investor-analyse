#!/usr/bin/env node
// Property Kickstart release gate: every published BTL analyser starts at the
// governed 6% financed rate, or 0% for an entirely cash-funded transaction.
// This checks source defaults, not investor-selected interactive scenarios.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';

export const BASE_FINANCED_RATE=6;
export function validatePage(path,html){
  const errors=[];
  const field=id=>{
    const input=html.match(new RegExp('<input\\b[^>]*\\bid="'+id+'"[^>]*>','i'))?.[0];
    const v=input?.match(/\bvalue="([^"]*)"/)?.[1];
    const number=v===undefined?NaN:Number(v);
    if(!Number.isFinite(number))errors.push(path+': missing/non-numeric '+id+' initial value');
    return number;
  };
  const ltv=field('ltv'),rate=field('rate'),stress=field('stressRate'),slider=field('stressRateSlider');
  const expected=ltv===0?0:BASE_FINANCED_RATE;
  if(Number.isFinite(ltv)&&!(ltv>=0&&ltv<=100))errors.push(path+': invalid LTV '+ltv);
  for(const [name,n]of [['rate',rate],['stressRate',stress],['stressRateSlider',slider]]){
    if(Number.isFinite(n)&&n!==expected)errors.push(path+': '+name+' initial rate '+n+'% differs from approved '+expected+'% PK baseline');
  }
  const code=path.split('/')[0];
  if(!html.includes(code))errors.push(path+': property identity missing');
  return errors;
}
export function run(files){
  return files.flatMap(p=>validatePage(p,readFileSync(p,'utf8')));
}
if(process.argv[1]?.endsWith('check-btl-default-rates.mjs')){
  const git=spawnSync('git',['ls-files','--cached','--others','--exclude-standard','--','BTL-*/index.html'],{encoding:'utf8'});
  assert.equal(git.status,0,git.stderr||'Cannot enumerate published BTL pages');
  const files=git.stdout.trim().split('\n').filter(p=>/^BTL-[A-Z0-9-]+\/index\.html$/.test(p));
  assert.ok(files.length>0,'No published BTL files found; cannot pass without scope');
  const errors=run(files);
  if(errors.length){console.error('FAIL BTL default rate release gate:\n'+errors.join('\n'));process.exitCode=1;}
  else console.log('PASS governed BTL defaults across '+files.length+' published pages: financed 6%, cash 0%');
}
