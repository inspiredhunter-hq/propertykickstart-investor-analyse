import {mapCanonical} from './hmo-canonical-mapping.mjs';
import {readCanonical} from './hmo-canonical-reader.mjs';
const route='/internal/hmo-draft';
const reply=(body,status)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json','cache-control':'no-store'}});
async function equal(a,b){
 const digest=s=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));
 const [x,y]=await Promise.all([digest(a),digest(b)]);let diff=0;
 const aa=new Uint8Array(x),bb=new Uint8Array(y);for(let i=0;i<aa.length;i++)diff|=aa[i]^bb[i];return diff===0;
}
async function bounded(request){
 if(!request.body)throw Error('Empty body');
 const reader=request.body.getReader();const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024)throw Error('Body exceeds limit');chunks.push(value);}}
 finally{await reader.cancel();}
 const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.length;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export function createHmoWorker({read=readCanonical,dispatch=fetch}={}){
 return {async fetch(request,env){
  if(new URL(request.url).pathname!==route)return reply({error:'Not found'},404);
  if(request.method!=='POST')return reply({error:'Method not allowed'},405);
  if(env.HMO_ENABLED!=='true'||!env.AUTOMATION_DB||!env.HMO_INTAKE_TOKEN||!env.GITHUB_HMO_TOKEN||!env.HMO_NOTION_READ_TOKEN||!env.HMO_GOOGLE_SERVICE_ACCOUNT)return reply({error:'Service not configured'},503);
  const auth=request.headers.get('authorization')||'';
  if(auth.length>512||!await equal(auth,'Bearer '+env.HMO_INTAKE_TOKEN))return reply({error:'Unauthorised'},401);
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return reply({error:'JSON required'},415);
  let body;try{body=await bounded(request);}catch{return reply({error:'Invalid or oversized body'},400);}
  if(!body||Object.keys(body).join()!=='pipeline_page_id'||!/^([a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i.test(body.pipeline_page_id))return reply({error:'Pipeline page ID required'},422);
  let property;try{const source=await read(body.pipeline_page_id,env);property=mapCanonical(source.page,source.rows);}catch{return reply({error:'Canonical source unavailable or financial reconciliation required'},422);}
  const raw=JSON.stringify(property);
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))),x=>x.toString(16).padStart(2,'0')).join('');
  const db=env.AUTOMATION_DB,code=property.property_code;
  // Claim before dispatch; uncertain delivery never retries automatically.
  try{const claim=await db.prepare("INSERT INTO hmo_step5_jobs(property_code,digest,state) VALUES (?,?,'sending') ON CONFLICT(property_code) DO NOTHING").bind(code,digest).run();
   if(claim.meta.changes!==1){const prior=await db.prepare('SELECT digest,state FROM hmo_step5_jobs WHERE property_code=?').bind(code).first();
    return prior?.digest===digest&&prior.state==='accepted'?reply({accepted:true,replay:true,property_code:code},202):reply({error:'Existing job requires reconciliation'},409);}
  }catch{return reply({error:'Durable ledger unavailable'},503);}
  let accepted=false;
  try{const response=await dispatch('https://api.github.com/repos/inspiredhunter-hq/propertykickstart-investor-analyse/dispatches',{
   method:'POST',redirect:'error',signal:AbortSignal.timeout(15000),headers:{authorization:'Bearer '+env.GITHUB_HMO_TOKEN,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28','user-agent':'pk-cloudflare-hmo-step5','content-type':'application/json'},
   body:JSON.stringify({event_type:'pk_hmo_analyser_step5',client_payload:{property_json:raw,job_digest:digest}})});accepted=response.status===204;
  }catch{/* Unknown delivery is held. */}
  try{await db.prepare("UPDATE hmo_step5_jobs SET state=?,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE property_code=? AND digest=? AND state='sending'").bind(accepted?'accepted':'needs-review',code,digest).run();}
  catch{return reply({error:'Delivery acknowledgement requires reconciliation'},503);}
  return accepted?reply({accepted:true,property_code:code,stage:'draft generation requested'},202):reply({error:'Dispatch requires reconciliation'},502);
 }};
}
export default createHmoWorker();
