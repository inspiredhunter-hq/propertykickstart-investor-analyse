import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
import {mapCanonical,sheetRows} from '../cloudflare/hmo-canonical-mapping.mjs';import {createHmoWorker} from '../cloudflare/hmo-step5-worker.mjs';
const pid='a'.repeat(32);
function fixture(){
 const r={'Property Code':'HMO-NE-TESTA','Notion Record URL':'https://app.notion.com/p/'+pid,Strategy:'HMO','Availability (Notion)':'Available','Analysis Readiness':'Ready for analysis','Ranking Eligible':true,'Operating Cost Reconciliation':'Complete — Modelled','Capital Cost Reconciliation':'Complete — Modelled','HMO Bills Model':'Landlord Pays All',Town:'Testville',Region:'North East','Lettable Rooms':6};
 for(const k of ['Stamp Duty','Legal Fees','Mortgage Broker Fee','Mortgage Arrangement Fee','Survey / Valuation','PK Sourcing Fee','Refurbishment','Furniture / Setup','Other Acquisition / Setup','Gross Rent pm','Gross Rent pa','Management %','Management Cost pa','Maintenance pa','Void pa','Insurance pa','Licensing pa','Boiler Repairs & Replacement pa (PK allowance)','HMO Gas pa','HMO Electricity pa','HMO Water pa','HMO Broadband pa','Utilities pa','Council Tax pa','Compliance pa','Service Charge pa','Ground Rent pa','Accounting / Admin pa','Other Operating Costs pa','HMO TV Licence pa','HMO Cleaner pa','HMO Communal Supplies pa','HMO Laundry / Cleaning Supplies pa','HMO Window Cleaning pa','HMO Pest Control pa','HMO Gardening pa','HMO Gas Safety / Servicing pa','HMO EICR / PAT pa','HMO Fire Alarm Servicing pa','HMO Emergency Lighting pa'])r[k]=0;
 Object.assign(r,{'Asking Price':200000,'Deposit %':.25,'Deposit Required':50000,'PK Sourcing Fee':4800,'Mortgage Broker Fee':2000,'Gross Rent pm':2500,'Gross Rent pa':30000,'Management %':.12,'Management Cost pa':3600,'Loan Amount':150000,'Refurbishment':1000,'Furniture / Setup':500,'Other Acquisition / Setup':200,'HMO Gas pa':100,'HMO Electricity pa':200,'HMO Water pa':300,'HMO Broadband pa':400,'Utilities pa':1000,'Accounting / Admin pa':100,'HMO Cleaner pa':500,'Operating Costs pa':5200,'Net Before Finance pa':24800,'6% Net Profit':15800,'Total Capital Required':58500});
 const p={'Property Code':r['Property Code'],Strategy:'HMO',Availability:'Available','HMO Operating Costs Reconciliation Status':'Complete — Modelled','Capital Costs Reconciliation Status':'Complete — Modelled','HMO Bills Model':'Landlord Pays All','Asking Price':200000,'Purchase Price':200000,'Rent pm (Model)':2500,'Deposit % Assumption':.25,'Management %':.12,Town:['Testville'],'UK Region':'North East',Bedrooms:6,'Total Capital Required (Calc)':58500,'True Net Annual Cashflow (Post-Finance) (Calc)':15800};
 return {page:{id:pid,parent_id:'fefec54907c446a6b932cd05a38e0e92',properties:p},rows:[r]};
}
function db(){const s=new DatabaseSync(':memory:');s.exec("CREATE TABLE hmo_step5_jobs(property_code TEXT PRIMARY KEY,digest TEXT,state TEXT,updated_at TEXT)");return {prepare(q){let a=[];return {bind(...v){a=v;return this},async first(){return s.prepare(q).get(...a)},async run(){return {meta:{changes:Number(s.prepare(q).run(...a).changes)}}}}}};}
const env=()=>({HMO_ENABLED:'true',AUTOMATION_DB:db(),HMO_INTAKE_TOKEN:'test',GITHUB_HMO_TOKEN:'test-gh',HMO_NOTION_READ_TOKEN:'test-notion',HMO_GOOGLE_SERVICE_ACCOUNT:'test-google'});
const req=(b={pipeline_page_id:pid},token='test')=>new Request('https://test.invalid/internal/hmo-draft',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(b)});
test('canonical grouping, percentages, one-off costs and privacy',()=>{const s=fixture(),p=mapCanonical(s.page,s.rows);assert.equal(p.financials.otherAcquisition,1700);assert.equal(p.financials['cost-7'],600);assert.equal(p.financials['cost-5'],1000);assert.equal(p.financials.ltv,75);assert.equal(p.financials.managementRate,12);assert.ok(!JSON.stringify(p).includes(pid));});
test('reject blanks, holds, duplicates, wrong parent, fees, formulas and differing purchase price',()=>{for(const mutate of [s=>s.rows[0]['Analysis Readiness']='Review required',s=>s.rows[0]['HMO Gas pa']=null,s=>s.rows.push(s.rows[0]),s=>s.page.parent_id='wrong',s=>s.rows[0]['PK Sourcing Fee']=5400,s=>s.rows[0]['Total Capital Required']=1,s=>s.page.properties['Purchase Price']=190000,s=>s.rows[0]['Ranking Eligible']=false]){const s=fixture();mutate(s);assert.throws(()=>mapCanonical(s.page,s.rows));}assert.throws(()=>sheetRows([['a','a'],[1,2]]));});
test('disabled/auth/body guards do not read providers',async()=>{let reads=0;const w=createHmoWorker({read:async()=>{reads++;return fixture()}}),e=env();assert.equal((await w.fetch(req(),{})).status,503);assert.equal((await w.fetch(req({},'wrong'),e)).status,401);assert.equal((await w.fetch(req({pipeline_page_id:pid,finance_qa:'approved'}),e)).status,422);assert.equal((await w.fetch(req({a:'x'.repeat(2000)}),e)).status,400);assert.equal(reads,0)});
test('concurrent durable claims plus replay dispatch once',async()=>{let sends=0;const w=createHmoWorker({read:async()=>fixture(),dispatch:async()=>{sends++;return new Response(null,{status:204})}}),e=env();const rs=await Promise.all(Array.from({length:8},()=>w.fetch(req(),e)));assert.ok(rs.some(r=>r.status===202));assert.equal(sends,1);assert.equal((await w.fetch(req(),e)).status,202);assert.equal(sends,1)});
test('timeout and provider failure hold without retry',async()=>{for(const send of [async()=>{throw Error('timeout')},async()=>new Response(null,{status:500})]){let sends=0;const w=createHmoWorker({read:async()=>fixture(),dispatch:async()=>{sends++;return send()}}),e=env();assert.equal((await w.fetch(req(),e)).status,502);assert.equal((await w.fetch(req(),e)).status,409);assert.equal(sends,1)}});

test('changed approved payload cannot reuse accepted code',async()=>{
 let current=fixture(),sends=0;const w=createHmoWorker({read:async()=>current,dispatch:async()=>{sends++;return new Response(null,{status:204})}}),e=env();
 assert.equal((await w.fetch(req(),e)).status,202);
 current=fixture();current.rows[0].Town='Elsewhere';current.page.properties.Town=['Elsewhere'];
 assert.equal((await w.fetch(req(),e)).status,409);assert.equal(sends,1);
});
test('lost durable acknowledgement never retries delivery',async()=>{
 let sends=0;const e=env(),prepare=e.AUTOMATION_DB.prepare.bind(e.AUTOMATION_DB);
 e.AUTOMATION_DB.prepare=q=>q.startsWith('UPDATE')?{bind(){return this},async run(){throw Error('lost write')}}:prepare(q);
 const w=createHmoWorker({read:async()=>fixture(),dispatch:async()=>{sends++;return new Response(null,{status:204})}});
 assert.equal((await w.fetch(req(),e)).status,503);assert.equal((await w.fetch(req(),e)).status,409);assert.equal(sends,1);
});
test('actual additive D1 schema enforces states and code uniqueness',async()=>{
 const fs=await import('node:fs');const s=new DatabaseSync(':memory:');
 s.exec(fs.readFileSync(new URL('../cloudflare/hmo-step5-schema.sql',import.meta.url),'utf8'));
 s.prepare("INSERT INTO hmo_step5_jobs(property_code,digest,state) VALUES ('HMO-NE-TESTA','abc','sending')").run();
 assert.throws(()=>s.prepare("INSERT INTO hmo_step5_jobs(property_code,digest,state) VALUES ('HMO-NE-TESTA','abc','accepted')").run());
 assert.throws(()=>s.prepare("INSERT INTO hmo_step5_jobs(property_code,digest,state) VALUES ('HMO-NE-TESTB','abc','unknown')").run());
});
test('ACT-48 adapter preserves existing handlers; disabled HMO adds no provider work',async()=>{
 const fs=await import('node:fs/promises'),os=await import('node:os'),path=await import('node:path');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'act882-wrapper-'));
 try{
 const source=await fs.readFile(new URL('../cloudflare/act48-with-hmo.mjs',import.meta.url),'utf8');
 await fs.writeFile(path.join(dir,'act48-with-hmo.mjs'),source);
 await fs.writeFile(path.join(dir,'booking-scheduled-worker.mjs'),"export default {fetch:(r)=>new Response(new URL(r.url).pathname),scheduled:(c,e,x)=>{e.called=true;}};");
 await fs.writeFile(path.join(dir,'hmo-step5-worker.mjs'),"export default {fetch:()=>new Response('hmo')};");
 await fs.writeFile(path.join(dir,'hmo-canonical-reader.mjs'),"export async function readRegister(){throw Error('must not read when disabled')};");
 const {default:w,pollHmo}=await import('file://'+path.join(dir,'act48-with-hmo.mjs'));
 for(const route of ['/','/health','/assessment','/unrelated'])assert.equal(await (await w.fetch(new Request('https://test.invalid'+route),{},{})).text(),route);
 assert.equal(await (await w.fetch(new Request('https://test.invalid/internal/hmo-draft'),{},{})).text(),'hmo');
 const e={},pending=[];w.scheduled({},e,{waitUntil:p=>pending.push(p)});await Promise.all(pending);assert.equal(e.called,true);assert.deepEqual(await pollHmo({}),{state:'disabled'});
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
