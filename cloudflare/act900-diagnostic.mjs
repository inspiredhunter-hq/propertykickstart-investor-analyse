// ACT-900: recover only the already-submitted synthetic Assessment through the deployed matcher.
import {withInvestorProfileLink} from './assessment-investor-link.mjs';
import {notionClient} from './notion-client.mjs';
const lead='4102aad7-d30e-8170-95df-df6993b6fe17', email='act900-later-profile-20261106@example.invalid';
export async function runDiagnostic(env){
 if(Date.now()>Date.parse('2026-11-07T23:59:00Z')||!env.NOTION_API_KEY)return;
 const headers={Authorization:'Bearer '+env.NOTION_API_KEY,'Notion-Version':'2025-09-03','Content-Type':'application/json'};
 const call=async(path,method='GET',body)=>{const r=await fetch('https://api.notion.com/v1/'+path,{method,headers,redirect:'manual',signal:AbortSignal.timeout(15000),...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw Error('recovery_http_'+r.status);return r.json();};
 try{
 const before=await call('pages/'+lead);
 if(before.properties?.Email?.email!==email)return;
 const action=before.properties['Next Action']?.rich_text?.map(x=>x.plain_text??x.text?.content??'').join('')??'';
 if(action.startsWith('ACT900 automatic recovery v1:'))return;
 const notion=withInvestorProfileLink({notion:notionClient({token:env.NOTION_API_KEY,dataSourceId:'32b2aad7-d30e-8056-b178-000b8143dc48'}),token:env.NOTION_API_KEY,investorDataSourceId:'0c8ed56c-8c78-40ba-9f44-b8e8c97d0aec'});
 await notion.writeLead({state:'ready',operation:'update',pageId:lead,properties:{Email:{email}}});
 const after=await call('pages/'+lead);
 const summary={linked:after.properties?.['Investor Profile']?.relation?.length===1,review:after.properties?.['Contact Match Review']?.checkbox??null};
 await call('pages/'+lead,'PATCH',{properties:{'Next Action':{rich_text:[{text:{content:'ACT900 automatic recovery v1: '+JSON.stringify(summary)+'; processed existing synthetic Assessment through deployed matcher. No notification replay. Do not contact.'}}]}}});
 }catch{console.warn('act900_recovery_unavailable');}
}
