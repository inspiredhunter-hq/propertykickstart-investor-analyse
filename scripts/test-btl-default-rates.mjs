#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validatePage} from './check-btl-default-rates.mjs';
const financed='BTL-NE-2CUEP/index.html',cash='BTL-WM-UAXC7/index.html';
const good=readFileSync(financed,'utf8'),cashGood=readFileSync(cash,'utf8');
assert.deepEqual(validatePage(financed,good),[],'current financed page passes');
assert.deepEqual(validatePage(cash,cashGood),[],'current cash-only page passes');
const input=(html,id,from,to)=>html.replace(new RegExp('(<input\\b[^>]*\\bid="'+id+'"[^>]*\\bvalue=")'+from+'(")','i'),'$1'+to+'$2');
for(const field of ['rate','stressRate','stressRateSlider']){
  const bad=input(good,field,'6','5');
  assert.notEqual(bad,good,'fixture must change '+field);
  assert.ok(validatePage(financed,bad).some(x=>x.includes(field+' initial rate 5%')),'must reject incorrect '+field);
}
assert.ok(validatePage(cash,input(cashGood,'rate','0','6')).length,'cash cannot inherit financed default');
console.log('PASS BTL default gate mutation tests, cash and investor scenario boundaries');
