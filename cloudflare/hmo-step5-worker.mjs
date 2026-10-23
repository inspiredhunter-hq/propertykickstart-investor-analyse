// Cloudflare Worker module: receive a Step 5 HMO job, read approved data,
// and dispatch a private draft build to GitHub. No publication or enrichment.
const route = "/internal/hmo-draft";
const fields = ["price","rent","ltv","rate","stamp","legal","broker","arrangement","survey","managementRate",
  "cost-0","cost-1","cost-2","cost-3","cost-4","cost-5","cost-6","cost-7","cost-8"];
function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: {"content-type":"application/json","cache-control":"no-store"} });
}
function constantTimeEq(a,b) {
  if(typeof a!=="string" || typeof b!=="string") return false;
  let diff=a.length^b.length;
  for(let i=0;i<Math.max(a.length,b.length);i++) diff |= (a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);
  return diff===0;
}
function validate(p) {
  if(!p || typeof p!=="object" || Array.isArray(p)) throw Error("Invalid property body");
  if(!/^HMO-[A-Z]{2}-[A-Z0-9]{5,}$/.test(p.property_code||"") || p.property_code==="HMO-NW-2S98D") throw Error("Invalid new HMO code");
  for(const key of ["town","region","room_description","headline"]) if(typeof p[key]!=="string"||!p[key].trim()||p[key].length>160) throw Error("Invalid "+key);
  if(!p.financials || Object.keys(p.financials).sort().join("|")!==[...fields].sort().join("|")) throw Error("Incomplete finance input");
  for(const key of fields) if(typeof p.financials[key]!=="number" || !Number.isFinite(p.financials[key])||p.financials[key]<0 || p.financials[key]>1e8) throw Error("Invalid "+key);
  const f=p.financials;
  if(f.price<=0||f.rent<=0||f.ltv>75||f.rate>20||f.managementRate>100||Math.abs(f["cost-0"]-f.rent*f.managementRate/100)>0.02) throw Error("Finance policy validation failed");
  return {property_code:p.property_code,town:p.town,region:p.region,room_description:p.room_description,headline:p.headline,financials:p.financials};
}
export default {
 async fetch(request, env) {
  const u=new URL(request.url);
  if(u.pathname!==route) return reply({error:"Not found"},404);
  if(request.method!=="POST") return reply({error:"Method not allowed"},405);
  if(!env.HMO_INTAKE_TOKEN || !env.GITHUB_HMO_TOKEN) return reply({error:"Service not configured"},503);
  const auth=request.headers.get("authorization")||"";
  if(!constantTimeEq(auth,"Bearer "+env.HMO_INTAKE_TOKEN)) return reply({error:"Unauthorised"},401);
  if(Number(request.headers.get("content-length")||"0")>20000) return reply({error:"Payload too large"},413);
  let data; try {data=await request.json();} catch {return reply({error:"Invalid JSON"},400);}
  if(!data || data.approved_step!==5 || data.finance_qa!=="approved") return reply({error:"Step 5 approval required"},422);
  let property; try {property=validate(data.property);} catch(e){return reply({error:e.message},422);}
  const response=await fetch("https://api.github.com/repos/inspiredhunter-hq/propertykickstart-investor-analyse/dispatches",{
   method:"POST",
   headers:{"authorization":"Bearer "+env.GITHUB_HMO_TOKEN,"accept":"application/vnd.github+json",
    "x-github-api-version":"2022-11-28","user-agent":"pk-cloudflare-hmo-step5","content-type":"application/json"},
   body:JSON.stringify({event_type:"pk_hmo_analyser_step5",client_payload:{property_json:JSON.stringify(property)}})
  });
  if(response.status!==204) return reply({error:"GitHub dispatch unsuccessful",status:response.status},502);
  return reply({accepted:true,property_code:property.property_code,stage:"draft generation requested"},202);
 }
};
