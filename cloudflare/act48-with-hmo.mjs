// Assemble with the CURRENT verified ACT-48 modules, never upload alone.
import existing from './booking-scheduled-worker.mjs';
import hmo from './hmo-step5-worker.mjs';
import {readRegister} from './hmo-canonical-reader.mjs';
export async function pollHmo(env){
 if(env.HMO_ENABLED!=='true')return {state:'disabled'};
 const rows=await readRegister(env);
 // One candidate per cron invocation; skip all previously claimed codes.
 for(const row of rows){
  if(row.Strategy!=='HMO'||row['Ranking Eligible']!==true)continue;
  const prior=await env.AUTOMATION_DB.prepare('SELECT state FROM hmo_step5_jobs WHERE property_code=?').bind(row['Property Code']).first();
  if(prior)continue;
  const m=String(row['Notion Record URL']).match(/\/p\/([a-f0-9-]{32,36})(?:[/?#]|$)/i);
  if(!m)continue;
  const response=await hmo.fetch(new Request('https://internal.invalid/internal/hmo-draft',{method:'POST',headers:{authorization:'Bearer '+env.HMO_INTAKE_TOKEN,'content-type':'application/json'},body:JSON.stringify({pipeline_page_id:m[1]})}),env);
  return {state:response.status===202?'draft-requested':'needs-review'};
 }
 return {state:'no-candidate'};
}
export default {
 fetch(request,env,ctx){return new URL(request.url).pathname==='/internal/hmo-draft'?hmo.fetch(request,env,ctx):existing.fetch(request,env,ctx);},
 scheduled(controller,env,ctx){
  existing.scheduled(controller,env,ctx);
  ctx.waitUntil(pollHmo(env).catch(()=>({state:'needs-review'})).then(result=>console.log(JSON.stringify({service:'hmo-step5',...result}))));
 }
};
