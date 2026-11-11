// ACT-914, offline safety checks; must run before TEST deployment. Does not verify live Notion credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('test/NewCalculator/index.html','utf8');
const fixture=fs.readFileSync('BTL-NE-WLETS/index.html','utf8');
const api=fs.readFileSync('netlify/functions/pipeline-property.mjs','utf8');
for(const token of ['id="pkPipelinePicker"','id="pkLookupInput"','id="pkLookupButton"','id="pkLookupKey"','id="analysisContent"','id="scoreSection"','VALUE · Your next decision','id="printContent"','2. Purchase and finance illustration','id="superInitialWorks"','id="superFurniture"']){
 assert(source.includes(token), 'Missing feature: '+token);
}
assert(source.indexOf('id="pkPipelinePicker"')<source.indexOf('data-pk-universal-header'),'Property Code must be ABOVE header');
assert(!fixture.includes('id="pkPipelinePicker"'),'Original production source may not be changed');
assert(source.includes("fetch('/.netlify/functions/pipeline-property'"),'Backend must be invoked through same origin');
assert(api.includes('process.env.PK_NOTION_READ_TOKEN')&&api.includes('process.env.PK_CALCULATOR_TEST_KEY'),'Missing protected credentials');
assert(api.includes('Property Code') && api.includes('page_size:3'),'Lookup must use exact Pipeline code');
assert(!api.includes('Access-Control-Allow-Origin'),'Do not enable public CORS');
assert(source.includes('el(\'analysisContent\').hidden=true'),'Prevent stale property results');
assert(source.includes("el('analysisContent').hidden=!ackAccepted"),'Ack gate must remain in force');
assert(source.includes("num('superInitialWorks')+num('superFurniture')"),'New acquisition costs must affect capital calculation');
const inline=[...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
let parsed=0;
for(const m of inline){if(/type=["']application\/json["']/.test(m[1]))continue;new vm.Script(m[2]);parsed++;}
for(const file of ['question-controls.js','shared-header.js','shared-acknowledgement.js']){
 new vm.Script(fs.readFileSync('test/NewCalculator/'+file,'utf8'));
}
await import(new URL('../netlify/functions/pipeline-property.mjs',import.meta.url));
assert(parsed>0,'No executable inline scripts found');
console.log('ACT-914 BTL TEST static checks passed; inline scripts parsed:',parsed);
