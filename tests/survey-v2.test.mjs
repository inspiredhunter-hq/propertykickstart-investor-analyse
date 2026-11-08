// Run with: node --test tests/survey-v2.test.mjs
// Static contract checks. These do not replace browser or live Notion integration testing.
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
const html=readFileSync(new URL('../test/survey/index.html',import.meta.url),'utf8');
const worker=readFileSync(new URL('../cloudflare/investor-survey-worker.mjs',import.meta.url),'utf8');
test('12-question survey and optional contact screen',()=>{
 assert.match(html,/Question "\+\(step\+1\)\+" of 12"/);
 assert.match(html,/if\(step===12\)\{/);
 assert.match(html,/if\(step===13\)\{/);
 assert.match(html,/submit your survey anonymously/i);
});
test('new timing question and storage mapping',()=>{
 assert.match(html,/When are you hoping to make your next move with property investment/);
 assert.match(worker,/"Q3 \| Next investment move timeframe":option\(a\[2\]\)/);
 assert.match(worker,/for\(let i=0;i<12;i\+\+\)/);
});
test('renumbered Notion mappings',()=>{
 for(const [q,answer] of [['Q4','a[3]'],['Q5','a[4]'],['Q6','a[5]'],['Q7','a[6]'],['Q8','a[7]'],['Q9','a[8]'],['Q10','a[9]'],['Q11','a[10]']]){
  assert.ok(worker.includes('"'+q+' | '),q+' field missing');
  assert.ok(worker.includes(answer),q+' answer index missing');
 }
});
test('professional follow-up uses Q5 and Q8',()=>{
 assert.match(worker,/p.answers\?\.\[4\]/);
 assert.match(worker,/p.answers\?\.\[7\]/);
 assert.match(html,/professionalFollowup\.selected\.length/);
});
test('Q11 punctuation and comma mapping is explicit',()=>{
 assert.match(worker,/const supportNames=\{/);
 assert.match(worker,/A fully managed service with most of the process handled for me\./);
 assert.match(worker,/Access to suitable properties with me managing the acquisition\./);
});
test('no accidental production release changes',()=>{
 assert.match(html,/is_test:true/);
 assert.match(worker,/"Test response":\{checkbox:true\}/);
});
