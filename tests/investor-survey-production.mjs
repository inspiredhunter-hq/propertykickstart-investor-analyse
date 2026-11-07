import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import worker from '../cloudflare/investor-survey-worker.mjs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('production/2027/index.html');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
assert(!/TEST|localStorage|Download TEST/.test(html));
assert(html.includes('survey_year:2027'));
// BUG-47: production page offers the professionals follow-up for Q4 or Q7 (first or second rank), once only.
assert(html.includes('a[6]?.includes("Finding reliable local professionals")'));
assert(html.includes('step===6&&v==="Finding reliable local professionals"&&!a[3]?.includes("Finding reliable professionals")'));
assert(html.includes('if(step===3||step===6)drawProfessionals();'));
assert(html.includes('target="_blank" rel="noopener noreferrer">Join'));
assert(html.includes('Your survey will stay open here.'));
assert(read('production/_redirects').startsWith('/ /2027/ 302\n'));
assert(!fs.existsSync(new URL('../production/index.html',import.meta.url)));
for(const p of ['production/privacy/index.html','production/404.html'])assert(read(p).includes('href="/"'));
const source=read('cloudflare/investor-survey-worker.mjs');
const scope=vm.createContext({});vm.runInContext(source.slice(0,source.indexOf('export default')),scope);
const match=vm.runInContext('matchInvestor',scope);
const rows=[{id:'investor1',properties:{Email:{email:' Hanna@Example.com '}}}];
assert.equal(match('hanna@example.COM',rows).status,'Linked');
assert.equal(match('hanna@example.com',[...rows,...rows]).status,'Ambiguous email');
assert.equal(match('other@example.com',rows).status,'Pending email match');
assert.equal(match('',rows).status,'Anonymous');
const matchLead=vm.runInContext('matchLead',scope);
const leadRows=[{id:'lead1',properties:{Email:{email:' Hanna+Test@Example.com '}}}];
assert.equal(matchLead('hanna+test@example.COM',leadRows).status,'Linked');
assert.equal(matchLead('hanna+test@example.COM',leadRows).relation[0].id,'lead1');
assert.equal(matchLead('hanna@example.com',leadRows).status,'Pending Assessment match','plus-address tag must not be stripped');
assert.equal(matchLead('hanna+test@example.com',[...leadRows,...leadRows]).status,'Ambiguous email');
assert.equal(matchLead('',leadRows).status,'Anonymous');
const regression=read('tests/investor-survey-regression.mjs');
const payload=vm.runInNewContext('('+regression.match(/const valid=(.*);\nconst validate/)[1]+')');
const env={ALLOWED_ORIGIN:'https://survey.propertykickstart.co.uk,https://test.propertykickstart.co.uk',NOTION_API_TOKEN:'mock-only'};
const originalFetch=globalThis.fetch;
let lookups=[],writes=[],investors=rows,leads=[{id:'lead1',properties:{Email:{email:'Hanna@Example.com'}}}],existing=false,leadsDown=false;
globalThis.fetch=async(url,init)=>{
 const body=JSON.parse(init.body);lookups.push({url,body});
 if(url.includes('/databases/ffd4'))return Response.json({results:investors});
 if(url.includes('/databases/32b2aad7d30e8065'))return leadsDown?new Response('Not found',{status:404}):Response.json({results:leads});
 if(url.endsWith('/query'))return Response.json({results:existing?[{id:'prior'}]:[]});
 writes.push(body);return Response.json({id:'private-notion-id'});
};
async function submit(origin,p=payload){return worker.fetch(new Request('https://worker.invalid',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(p)}),env);}
try{
 payload.contact.email='hanna@example.com';
 let response=await submit('https://survey.propertykickstart.co.uk');
 assert.deepEqual(await response.json(),{saved:true});
 let props=writes.at(-1).properties;
 assert.equal(props['Test response'].checkbox,false);assert.equal(props['Survey year'].number,2027);
 assert.equal(props.Investor.relation[0].id,'investor1');assert.equal(props['Investor link status'].select.name,'Linked');
 // BUG-46 Assessment-first order: lead already exists when the survey arrives.
 assert.equal(props['Assessment lead'].relation[0].id,'lead1');assert.equal(props['Assessment link status'].select.name,'Linked');
 assert(writes.every(w=>!w.parent||w.parent.database_id==='d7505061004d448fb254d2614b3fae3d'),'only the survey database is ever written');
 const clauses=lookups[0].body.filter.and;
 assert.equal(clauses[1].checkbox.equals,false);assert.equal(clauses[2].number.equals,2027);
 lookups=[];writes=[];
 response=await submit('https://test.propertykickstart.co.uk');
 assert.equal(writes[0].properties['Test response'].checkbox,true);
 assert.equal(writes[0].properties.Investor.relation.length,0);
 assert.equal(lookups.filter(x=>x.url.includes('/databases/ffd4')).length,0);
 assert.equal(lookups.filter(x=>x.url.includes('/databases/32b2')).length,0);
 assert.equal(writes[0].properties['Assessment lead'].relation.length,0);
 assert.equal(writes[0].properties['Assessment link status'].select.name,'TEST - not linked');
 assert.equal(writes[0].properties['Investor link status'].select.name,'TEST - not linked');
 investors=[...rows,...rows];await submit('https://survey.propertykickstart.co.uk');
 assert.equal(writes.at(-1).properties['Investor link status'].select.name,'Ambiguous email');
 assert.equal(writes.at(-1).properties.Investor.relation.length,0);
 investors=[];await submit('https://survey.propertykickstart.co.uk');
 assert.equal(writes.at(-1).properties['Investor link status'].select.name,'Pending email match');
 // Survey-first order: no Assessment lead yet -> Pending, retried by the scheduled sweep.
 leads=[];await submit('https://survey.propertykickstart.co.uk');
 assert.equal(writes.at(-1).properties['Assessment link status'].select.name,'Pending Assessment match');
 assert.equal(writes.at(-1).properties['Assessment lead'].relation.length,0);
 leads=[{id:'a',properties:{Email:{email:'hanna@example.com'}}},{id:'b',properties:{Email:{email:'HANNA@example.com'}}}];await submit('https://survey.propertykickstart.co.uk');
 assert.equal(writes.at(-1).properties['Assessment link status'].select.name,'Ambiguous email');
 assert.equal(writes.at(-1).properties['Assessment lead'].relation.length,0);
 // Lead lookup failure must never lose the survey nor block the Investor link.
 investors=rows;leadsDown=true;response=await submit('https://survey.propertykickstart.co.uk');
 assert.deepEqual(await response.json(),{saved:true});
 assert.equal(writes.at(-1).properties['Assessment link status'].select.name,'Pending Assessment match');
 assert.equal(writes.at(-1).properties['Investor link status'].select.name,'Linked');
 leadsDown=false;
 await submit('https://survey.propertykickstart.co.uk',{...payload,contact:{...payload.contact,email:'',emailMarketing:false}});
 assert.equal(writes.at(-1).properties['Assessment link status'].select.name,'Anonymous');
 assert.equal(writes.at(-1).properties['Investor link status'].select.name,'Anonymous');
 existing=true;writes=[];await submit('https://survey.propertykickstart.co.uk');assert.equal(writes.length,0);
 existing=false;response=await submit('https://evil.invalid');assert.equal(response.status,403);
 response=await submit('https://survey.propertykickstart.co.uk',null);assert.equal(response.status,400);
 response=await submit('https://survey.propertykickstart.co.uk',{padding:'a'.repeat(14001)});assert.equal(response.status,413);
 globalThis.fetch=async()=>new Response('Unavailable',{status:503});
 response=await submit('https://survey.propertykickstart.co.uk');assert.deepEqual(await response.json(),{error:'Storage unavailable'});
 // Scheduled sweeps: Survey-first rows get linked to the Investor and the Assessment lead once those exist.
 const sweepWith=async(leadRowsNow,{leadsFail=false}={})=>{
  let queued;lookups=[];writes=[];
  globalThis.fetch=async(url,init)=>{
   const body=JSON.parse(init.body);lookups.push({url,body});
   if(url.includes('/databases/ffd4'))return Response.json({results:rows});
   if(url.includes('/databases/32b2aad7d30e8065'))return leadsFail?new Response('Not found',{status:404}):Response.json({results:leadRowsNow});
   if(url.endsWith('/query'))return Response.json({results:[{id:'survey1',properties:{'Contact email':{email:'Hanna@Example.com'}}}]});
   writes.push({url,body});return Response.json({id:'survey1'});
  };
  worker.scheduled({},env,{waitUntil:p=>{queued=p;}});await queued;
 };
 await sweepWith([{id:'lead1',properties:{Email:{email:'hanna@example.com'}}}]);
 const surveyQueries=lookups.filter(x=>x.url.includes('/databases/d7505061'));
 assert.equal(surveyQueries.length,2);
 assert(surveyQueries.every(x=>x.body.filter.and[0].checkbox.equals===false),'sweeps never touch TEST rows');
 assert.deepEqual(surveyQueries.map(x=>x.body.filter.and[1].property).sort(),['Assessment lead','Investor']);
 const byRel=Object.fromEntries(writes.map(w=>[Object.keys(w.body.properties)[0],w]));
 assert.equal(writes.length,2);
 assert.equal(byRel.Investor.url,'https://api.notion.com/v1/pages/survey1');
 assert.equal(byRel.Investor.body.properties.Investor.relation[0].id,'investor1');
 assert.equal(byRel['Assessment lead'].body.properties['Assessment lead'].relation[0].id,'lead1');
 assert.equal(byRel['Assessment lead'].body.properties['Assessment link status'].select.name,'Linked');
 assert(writes.every(w=>Object.keys(w.body.properties).length===2),'sweep only writes link fields: no consent/CRM/stage changes');
 assert(writes.every(w=>w.url.includes('/pages/survey1')),'sweep only edits the survey row');
 // Assessment lookup failure leaves the Assessment link pending but the Investor sweep still completes.
 await sweepWith([],{leadsFail:true});
 assert.equal(writes.length,1);assert(writes[0].body.properties.Investor);
 // Duplicate Assessment leads are flagged for review, never guessed.
 await sweepWith([{id:'x',properties:{Email:{email:'hanna@example.com'}}},{id:'y',properties:{Email:{email:'hanna@example.com'}}}]);
 const amb=writes.find(w=>w.body.properties['Assessment link status']);
 assert.equal(amb.body.properties['Assessment link status'].select.name,'Ambiguous email');assert.equal(amb.body.properties['Assessment lead'].relation.length,0);
}finally{globalThis.fetch=originalFetch;}
console.log('PASS: BUG-46 Survey<->Assessment lead matching in both submission orders, plus-address, ambiguous, lookup failure, TEST isolation, sweep independence and link-only writes; BUG-47 production parity; annual routing/source; production script; optional WhatsApp; unique/duplicate/pending/anonymous matching; TEST isolation; year-scoped retries; public error privacy; size/null validation; deferred reconciliation and consent preservation.');
