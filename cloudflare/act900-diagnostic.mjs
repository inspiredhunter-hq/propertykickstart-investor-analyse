// One-off ACT-900 diagnostic. Reads only known synthetic records; no contacts or relations changed.
const lead='4102aad7-d30e-8170-95df-df6993b6fe17';
const source='0c8ed56c-8c78-40ba-9f44-b8e8c97d0aec';
const email='act900-later-profile-20261106@example.invalid';
const marker='ACT900 lookup diagnostic v1: ';
export async function runDiagnostic(env) {
 if(Date.now()>Date.parse('2026-11-07T23:59:00Z')||!env.NOTION_API_KEY)return;
 const headers={Authorization:'Bearer '+env.NOTION_API_KEY,'Notion-Version':'2025-09-03','Content-Type':'application/json'};
 const call=async(path,method='GET',body)=>{const r=await fetch('https://api.notion.com/v1/'+path,{method,headers,redirect:'manual',signal:AbortSignal.timeout(12000),...(body?{body:JSON.stringify(body)}:{})});let data;try{data=await r.json()}catch{};return {status:r.status,data};};
 try {
  const p=await call('pages/'+lead);
  if(p.status!==200||p.data?.properties?.Email?.email!==email)return;
  if(p.data.properties['Next Action']?.rich_text?.map(x=>x.plain_text??x.text?.content??'').join('').startsWith(marker))return;
  const rel=p.data.properties['Investor Profile'];
  const q=await call('data_sources/'+source+'/query','POST',{filter:{property:'Email',email:{equals:email}},page_size:100});
  const db=await call('databases/ffd4d0428cc64de2b6602e60dafa8a2f');
  const summary={lead_http:p.status,relation_present:!!rel,relation_type:rel?.type??null,query_http:q.status,query_error:q.data?.code??null,matches:q.data?.results?.length??null,database_http:db.status,actual_sources:db.data?.data_sources?.map(x=>x.id)??[]};
  // Known synthetic row only. Never write the actual relation or investor.
  await call('pages/'+lead,'PATCH',{properties:{'Next Action':{rich_text:[{text:{content:marker+JSON.stringify(summary)+'; synthetic QA only. Do not contact.'}}]}}});
 }catch{console.warn('act900_diagnostic_unavailable');}
}
