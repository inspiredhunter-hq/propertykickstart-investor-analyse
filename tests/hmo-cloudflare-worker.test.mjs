import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../cloudflare/hmo-step5-worker.mjs';

const env = { HMO_INTAKE_TOKEN: 'test-only-incoming', GITHUB_HMO_TOKEN: 'test-only-github' };
const financials = {price:200000,rent:30000,ltv:75,rate:6,stamp:11500,legal:2500,broker:2200,arrangement:1999,survey:500,managementRate:12,'cost-0':3600,'cost-1':2400,'cost-2':2400,'cost-3':500,'cost-4':230,'cost-5':4800,'cost-6':2100,'cost-7':3000,'cost-8':366};
const body = {approved_step:5,finance_qa:'approved', property:{property_code:'HMO-NE-TESTA',town:'Testville',region:'North East',room_description:'Six lettable rooms',headline:'Illustrative HMO analysis',financials}};
function request(json = body, token = env.HMO_INTAKE_TOKEN) {
 return new Request('https://test.example/internal/hmo-draft',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(json)});
}
test('requires configured credentials', async () => {
 const result = await worker.fetch(request(), {});
 assert.equal(result.status,503);
});
test('rejects unauthenticated and unapproved payloads without dispatching', async () => {
 assert.equal((await worker.fetch(request(body,'invalid'),env)).status,401);
 assert.equal((await worker.fetch(request({...body,finance_qa:'pending'}),env)).status,422);
 assert.equal((await worker.fetch(request({...body,property:{...body.property,financials:{...financials,'cost-0':0}}}),env)).status,422);
});
test('dispatches validated Step 5 data and never publishes', async () => {
 const previous = globalThis.fetch;
 let captured;
 globalThis.fetch = async (url,init) => {
  captured={url,init};
  return new Response(null,{status:204});
 };
 try {
  const response=await worker.fetch(request(),env);
  assert.equal(response.status,202);
  assert.equal(captured.url,'https://api.github.com/repos/inspiredhunter-hq/propertykickstart-investor-analyse/dispatches');
  assert.equal(captured.init.headers.authorization,'Bearer '+env.GITHUB_HMO_TOKEN);
  const sent=JSON.parse(captured.init.body);
  assert.equal(sent.event_type,'pk_hmo_analyser_step5');
  assert.deepEqual(JSON.parse(sent.client_payload.property_json),body.property);
 } finally {globalThis.fetch=previous;}
});
