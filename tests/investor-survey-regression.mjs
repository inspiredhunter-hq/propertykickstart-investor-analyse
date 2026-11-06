import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../cloudflare/investor-survey-worker.mjs',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../test/survey/index.html',import.meta.url),'utf8');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
const scope=vm.createContext({});
vm.runInContext(source.slice(0,source.indexOf('export default')),scope);
const valid={submission_id:'034777b8-1234-4567-8123-123456789abc',answers:{0:'Yes',1:'Actively expanding',2:['Increase dependable monthly income','Build long-term wealth'],3:['Finding suitable properties'],4:['Dependable net income','Long-term capital growth'],5:"I'm already acquiring properties",6:['Nothing, I prefer handling everything myself'],7:'',8:'',9:"I wouldn't need additional support.",10:'Not at the moment'},other:{},contact:{name:'QA Tester',email:'qa@example.com',mobile:'+44 7700 900123',emailMarketing:true,whatsappInvite:true}};
const validate=p=>{scope.payload=p;return vm.runInContext('validate(payload)',scope)};
assert.equal(validate(valid),true);
for(const email of ['sam@example.com','hanna.hunter+test@example.co.uk','test@sample.net']) assert.equal(validate({...valid,contact:{...valid.contact,email}}),true,email);
for(const email of ['a b@example.com','bad@address','test@example com'])assert.equal(validate({...valid,contact:{...valid.contact,email}}),false,email);
for(const mobile of ['07700 900123','+44 7700 900123','(07700) 900123'])assert.equal(validate({...valid,contact:{...valid.contact,mobile}}),true,mobile);
for(const mobile of ['abc','123','++44 7700 900123'])assert.equal(validate({...valid,contact:{...valid.contact,mobile}}),false,mobile);
assert.equal(validate({...valid,contact:{name:'',email:'',mobile:'',emailMarketing:false,whatsappInvite:false}}),true);
assert.equal(validate({...valid,contact:{...valid.contact,email:'',emailMarketing:true}}),false);
const nonlandlord=structuredClone(valid);Object.assign(nonlandlord.answers,{0:'No',1:'Exploring property investment',5:"I'm not currently planning to acquire a property"});
assert.equal(validate(nonlandlord),true);
assert.equal(validate({...nonlandlord,answers:{...nonlandlord.answers,5:"I'm already acquiring properties"}}),false);
assert.equal(validate({...valid,answers:{...valid.answers,3:[]}}),false);
assert.equal(validate({...valid,answers:{...valid.answers,2:['Build long-term wealth','Build long-term wealth']}}),false);
assert.equal(validate({...valid,answers:{...valid.answers,7:'x'.repeat(2001)}}),false);
const long=JSON.stringify({answers:{...valid.answers,7:'a'.repeat(2000),8:'😀'.repeat(1000)},other:{3:'z'.repeat(500)}});
scope.long=long;const chunks=vm.runInContext('rich(long)',scope);
assert.equal(chunks.map(c=>c.text.content).join(''),long);assert.deepEqual(JSON.parse(chunks.map(c=>c.text.content).join('')),JSON.parse(long));assert.ok(chunks.length>1);assert.ok(chunks.every(c=>c.text.content.length<=1900));
assert.ok(html.includes('https://privacy.propertykickstart.co.uk/'));
assert.ok(html.includes('https://assessment.propertykickstart.co.uk/'));
assert.ok(!html.includes('\\\\s@'));
console.log('PASS: frontend syntax; landlord/non-landlord validation; valid/invalid email and mobile; anonymous and consent rules; duplicate choices and text limits; long Unicode JSON round-trip; privacy and assessment links.');

const withProfessionals={...valid,answers:{...valid.answers,3:["Finding reliable professionals"]}};
for(const followup of [undefined,{wantsToTell:false,selected:[],other:""},{wantsToTell:true,selected:[],other:""},{wantsToTell:true,selected:["Other"],other:""},{wantsToTell:true,selected:["Mortgage brokers","Surveyors and valuers","Other"],other:"ACT-900 TEST optional detail"}]){
 assert.equal(validate({...withProfessionals,professional_followup:followup}),true);
}
for(const followup of [null,[],{wantsToTell:true,selected:["Unknown"],other:""},{wantsToTell:true,selected:["Mortgage brokers","Mortgage brokers"],other:""},{wantsToTell:true,selected:[],other:"x".repeat(501)}])assert.equal(validate({...withProfessionals,professional_followup:followup}),false);
scope.payload={...valid,professional_followup:{wantsToTell:true,selected:["Other"],other:"stale"}};
assert.equal(vm.runInContext('professionalData(payload)',scope),undefined);
scope.payload={...withProfessionals,professional_followup:{wantsToTell:true,selected:["Mortgage brokers"],other:"stale"}};
assert.equal(vm.runInContext('professionalData(payload).other',scope),"");
const frontend=vm.createContext({document:{getElementById:()=>({})}});
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/render\(\);\s*$/,'');
vm.runInContext(script,frontend);
vm.runInContext('a[3]=["Finding reliable professionals"];professionalFollowup.wantsToTell=true;professionalFollowup.selected=["Other"];professionalFollowup.other="";',frontend);
assert.equal(vm.runInContext('professionalData().selected[0]',frontend),'Other');
vm.runInContext('a[3]=["Assessing risks"]',frontend);
assert.equal(vm.runInContext('professionalData()',frontend),undefined);
vm.runInContext('resetFollowing(1)',frontend);
assert.equal(vm.runInContext('professionalFollowup.wantsToTell',frontend),false);
assert.equal(vm.runInContext('professionalFollowup.selected.length',frontend),0);
console.log('PASS: optional professionals omitted/skipped/empty/Other; multiple choices; payload validation; stale parent/Other protection; branch-reset state.');


const worker=(await import('../cloudflare/investor-survey-worker.mjs')).default;
const originalFetch=globalThis.fetch;let savedBody;
globalThis.fetch=async(url,init)=>{if(url.endsWith('/query'))return new Response(JSON.stringify({results:[]}));savedBody=JSON.parse(init.body);return new Response(JSON.stringify({id:'mock-response'}));};
try{
 for(const [answers,followup] of [[withProfessionals.answers,{wantsToTell:true,selected:['Other','Surveyors and valuers'],other:''}],[valid.answers,{wantsToTell:true,selected:['Other'],other:'stale'}]]){
  const response=await worker.fetch(new Request('https://survey.test',{method:'POST',headers:{Origin:'https://test.propertykickstart.co.uk','content-type':'application/json'},body:JSON.stringify({...valid,answers,professional_followup:followup})}),{ALLOWED_ORIGIN:'https://test.propertykickstart.co.uk',NOTION_API_TOKEN:'local-unit-test'});
  assert.equal(response.status,200);
  const stored=JSON.parse(savedBody.properties['Answers JSON'].rich_text.map(x=>x.text.content).join(''));
  if(answers===withProfessionals.answers)assert.deepEqual(stored.professional_followup,followup);else assert.equal(stored.professional_followup,undefined);
 }
}finally{globalThis.fetch=originalFetch}
console.log('PASS: Worker Notion payload stores optional selections and omits stale follow-up when parent is absent.');

const mapped=vm.runInContext('questionProperties',scope);
const fullMap=mapped({...withProfessionals,professional_followup:{wantsToTell:true,selected:["Bookkeepers","Other"],other:"Specialist QA"}});
assert.equal(Object.keys(fullMap).length,32);
assert.equal(fullMap["Q2 | Property plans"].select.name,valid.answers[1]);
for(const [index,label] of [[2,"Q3 | Investment objectives"],[4,"Q5 | Property decision"],[6,"Q7 | Support valued"]]){
 const values=valid.answers[index];
 const props=mapped(valid);
 assert.equal(props[label+" - first priority"].select.name,values[0].replaceAll(",",""));
 assert.equal(props[label+" - second priority"].select?.name||null,values[1]?.replaceAll(",","")||null);
}
assert.equal(fullMap["Q4 | Biggest challenges"].multi_select[0].name,"Finding reliable professionals");
assert.equal(fullMap["Q4 | Professionals"].multi_select[0].name,"Bookkeepers");
assert.equal(fullMap["Q4 | Other professionals"].rich_text[0].text.content,"Specialist QA");
assert.equal(mapped(valid)["Q4 | Professional follow-up"].select,null);
assert.equal(mapped({...valid,answers:{...valid.answers,7:"😀".repeat(1000)}})["Q8 | What has not worked"].rich_text.map(r=>r.text.content).join(""),"😀".repeat(1000));
assert.equal(mapped(nonlandlord)["Q2 | Property plans"].select.name,nonlandlord.answers[1]);
for(const i of [2,3,4,5,6,9]){
 const a={...valid.answers,[i]:[2,3,4,6].includes(i)?["Other"]: "Other"};
 assert.equal(mapped({...valid,answers:a,other:{[i]:"Detail "+i}})["Q"+(i+1)+" | Other detail"].rich_text[0].text.content,"Detail "+i);
}
assert.equal(mapped({...valid,other:{3:"stale detail"}})["Q4 | Other detail"].rich_text[0].text.content,"");
console.log("PASS: all dedicated Notion field mappings, rank order, professional/Other data, blank/stale protection, branch and Unicode.");

const professionalLabels=vm.runInContext('PROFESSIONALS',scope);
for(const label of professionalLabels){
 const p={...withProfessionals,professional_followup:{wantsToTell:true,selected:[label],other:""}};
 const actual=mapped(p);
 for(const candidate of professionalLabels)assert.equal(actual[candidate==="Other"?"Other professional selected":candidate].checkbox,candidate===label);
}
for(const p of [valid,withProfessionals,{...withProfessionals,professional_followup:{wantsToTell:true,selected:[],other:""}}]){
 const actual=mapped(p);
 for(const label of professionalLabels)assert.equal(actual[label==="Other"?"Other professional selected":label].checkbox,false);
}
const stale=mapped({...valid,professional_followup:{wantsToTell:true,selected:["Bookkeepers"],other:""}});
assert.equal(stale.Bookkeepers.checkbox,false);
console.log("PASS: each professional checkbox matches only its selection; omitted, empty and stale follow-up remains unticked.");
