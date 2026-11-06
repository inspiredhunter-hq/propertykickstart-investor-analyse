// Dedicated 2027 survey Worker. Deploy separately from ACT-48.
// Required encrypted secret: NOTION_API_TOKEN
// Optional variable: ALLOWED_ORIGIN (default TEST origin)
const DB="d7505061004d448fb254d2614b3fae3d";
const notion="https://api.notion.com/v1";
const yes=["Actively expanding","Looking to expand when the right opportunity arises","Maintaining my existing portfolio","Consolidating or reducing my portfolio","Undecided"];
const no=["Actively looking to acquire my first investment property","Planning to invest when the right opportunity arises","Exploring property investment","Not currently planning to invest"];
const sets=[
["Yes","No"],null,
["Increase dependable monthly income","Build long-term wealth","Reduce day-to-day management responsibilities","Diversify my investments","Improve the performance of my existing portfolio","Consolidate or reduce my existing portfolio","Other"],
["Finding suitable properties","Understanding financial returns","Assessing risks","Finding reliable professionals","Finding sufficient time","Financing acquisitions","Managing properties after purchase","Verifying property information without travelling to view it","Other"],
["Dependable net income","Long-term capital growth","Minimal management involvement","Purchase price relative to value","Potential to improve property performance","Clear and manageable risks","Other"],
["I haven't found properties that meet my requirements","The financial returns haven't been attractive enough","I haven't had sufficient time","I don't currently have the capital or financing","I'm concerned about economic or regulatory uncertainty","I haven't been able to verify property information sufficiently","I'm already acquiring properties","I'm not currently planning to acquire another property","I'm not currently planning to acquire a property","Other"],
["Finding properties that meet my requirements","Assessing financial performance and returns","Verifying property information and conducting due diligence","Coordinating the purchase process","Finding reliable local professionals","Arranging ongoing property management","Nothing, I prefer handling everything myself","Other"],null,null,
["A fully managed service, with most of the process handled for me.","Personal support with specific parts of the process.","Access to suitable properties, with me managing the acquisition.","Tools and resources to help me manage the process independently.","I wouldn't need additional support.","Other"],
["Yes, I'm actively looking","Possibly, for the right opportunity","Not at the moment"]
];
const PROFESSIONALS=["Mortgage brokers","Solicitors and conveyancers","Accountants and tax specialists","Surveyors and valuers","Insurers","Builders and project managers","Letting agents and property managers","Bookkeepers","Financial advisers (where relevant)","Specialist trust or estate professionals (where relevant)","Other"];
function professionalData(p){
 if(!p.answers?.[3]?.includes("Finding reliable professionals"))return undefined;
 const f=p.professional_followup;
 return f?.wantsToTell===true?{wantsToTell:true,selected:f.selected,other:f.selected.includes("Other")?f.other:""}:undefined;
}
function validate(p){
 const a=p.answers,o=p.other||{};
 if(!a||typeof a!=="object"||Array.isArray(a)||!o||typeof o!=="object"||Array.isArray(o))return false;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.submission_id||""))return false;
 for(let i=0;i<11;i++){
  const v=a[i],options=i===1?(a[0]==="Yes"?yes:no):sets[i];
  if(i===7||i===8){if(v!==undefined&&(typeof v!=="string"||v.length>2000))return false;continue}
  if([2,3,4,6].includes(i)){
   if(!Array.isArray(v)||new Set(v).size!==v.length||v.some(x=>!options.includes(x)))return false;
   if(i===3?(v.length<1||v.length>3):(v.length!==2&&!(i===6&&v.length===1&&v[0]==="Nothing, I prefer handling everything myself")))return false;
   if(i===2&&a[0]==="No"&&v.some(x=>["Reduce day-to-day management responsibilities","Improve the performance of my existing portfolio","Consolidate or reduce my existing portfolio"].includes(x)))return false;
  }else if(!options.includes(v))return false;
  if((v==="Other"||Array.isArray(v)&&v.includes("Other"))&&!(typeof o[i]==="string"&&o[i].trim()))return false;
 }
 if(a[0]==="No"&&a[5]==="I'm already acquiring properties")return false;
 if(Object.values(o).some(v=>typeof v!=="string"||v.length>500))return false;
 const f=p.professional_followup;
 if(f!==undefined){
  if(!f||typeof f!=="object"||Array.isArray(f)||typeof f.wantsToTell!=="boolean"||!Array.isArray(f.selected)||f.selected.length>PROFESSIONALS.length||new Set(f.selected).size!==f.selected.length||f.selected.some(x=>!PROFESSIONALS.includes(x))||typeof f.other!=="string"||f.other.length>500)return false;
 }
 const c=p.contact||{};
 if(typeof c!=="object"||Array.isArray(c))return false;
 if(["name","email","mobile"].some(k=>typeof(c[k]||"")!=="string"||(c[k]||"").length>200))return false;
 if(c.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email))return false;
 if(c.mobile&&!/^\+?[0-9 ()-]{7,25}$/.test(c.mobile))return false;
 if(typeof c.emailMarketing!=="boolean"||typeof c.whatsappInvite!=="boolean")return false;
 if(c.emailMarketing&&!c.email)return false;
 return true;
}
function rich(s){
 const chunks=[];let chunk="";
 for(const point of s){if(chunk.length+point.length>1900){chunks.push({text:{content:chunk}});chunk=""}chunk+=point}
 chunks.push({text:{content:chunk}});return chunks;
}

function questionProperties(p){
 const a=p.answers||{},o=p.other||{},f=professionalData(p);
 const option=v=>v?{select:{name:v.replaceAll(",","")}}:{select:null};
 const text=v=>({rich_text:rich(v||"")});
 const props={
  "Q2 | Property plans":option(a[1]),
  "Q3 | Investment objectives - first priority":option(a[2]?.[0]),
  "Q3 | Investment objectives - second priority":option(a[2]?.[1]),
  "Q4 | Biggest challenges":{multi_select:(a[3]||[]).map(name=>({name}))},
  "Q4 | Professional follow-up":option(f?"Yes":null),
  "Q4 | Professionals":{multi_select:(f?.selected||[]).map(name=>({name}))},
  "Q4 | Other professionals":text(f?.other),
  "Q5 | Property decision - first priority":option(a[4]?.[0]),
  "Q5 | Property decision - second priority":option(a[4]?.[1]),
  "Q6 | Reason for not acquiring":option(a[5]),
  "Q7 | Support valued - first priority":option(a[6]?.[0]),
  "Q7 | Support valued - second priority":option(a[6]?.[1]),
  "Q8 | What has not worked":text(a[7]),
  "Q9 | What would make it easier":text(a[8]),
  "Q10 | Preferred support":option(a[9])
 };
 for(const i of [2,3,4,5,6,9])props["Q"+(i+1)+" | Other detail"]=text((a[i]==="Other"||Array.isArray(a[i])&&a[i].includes("Other"))?o[i]:"");
 for(const name of PROFESSIONALS)props[name==="Other"?"Other professional selected":name]={checkbox:!!f?.selected.includes(name)};
 return props;
}

const SURVEY_YEAR=2027;
const INVESTORS_DB="ffd4d0428cc64de2b6602e60dafa8a2f";
const normalEmail=v=>String(v||"").trim().toLowerCase();
function matchInvestor(email,rows){
 if(!normalEmail(email))return {status:"Anonymous",relation:[]};
 const matches=rows.filter(r=>normalEmail(r.properties?.Email?.email)===normalEmail(email));
 return matches.length===1?{status:"Linked",relation:[{id:matches[0].id}]}:{status:matches.length?"Ambiguous email":"Pending email match",relation:[]};
}
async function queryPages(db,headers,filter){
 const rows=[];let cursor;
 for(let n=0;n<100;n++){
  const r=await fetch(notion+"/databases/"+db+"/query",{method:"POST",headers,body:JSON.stringify({page_size:100,...(filter?{filter}:{}),...(cursor?{start_cursor:cursor}:{})})});
  if(!r.ok)throw Error("Lookup unavailable");
  const data=await r.json();rows.push(...data.results);if(!data.has_more)return rows;cursor=data.next_cursor;
 }
 throw Error("Lookup limit exceeded");
}
function linkProperties(match){return {"Investor":{relation:match.relation},"Investor link status":{select:{name:match.status}}};}
async function investorProperties(p,isTest,headers){
 let match={status:"TEST - not linked",relation:[]};
 if(!isTest){
  match={status:normalEmail(p.contact.email)?"Pending email match":"Anonymous",relation:[]};
  if(normalEmail(p.contact.email))try{match=matchInvestor(p.contact.email,await queryPages(INVESTORS_DB,headers));}catch{}
 }
 return {"Survey year":{number:SURVEY_YEAR},...linkProperties(match)};
}
async function reconcileInvestors(env){
 if(!env.NOTION_API_TOKEN)return;
 const headers={Authorization:"Bearer "+env.NOTION_API_TOKEN,"Notion-Version":"2022-06-28","Content-Type":"application/json"};
 try{
  const rows=await queryPages(DB,headers,{and:[{property:"Test response",checkbox:{equals:false}},{property:"Investor",relation:{is_empty:true}},{property:"Contact email",email:{is_not_empty:true}}]});
  if(!rows.length)return;
  const investors=await queryPages(INVESTORS_DB,headers);
  for(const row of rows){
   const match=matchInvestor(row.properties?.["Contact email"]?.email,investors);
   const r=await fetch(notion+"/pages/"+row.id,{method:"PATCH",headers,body:JSON.stringify({properties:linkProperties(match)})});
   if(!r.ok)throw Error("Reconciliation unavailable");
  }
 }catch{console.error("Survey investor reconciliation incomplete; retry scheduled");}
}

export default {scheduled(event,env,ctx){ctx.waitUntil(reconcileInvestors(env));},async fetch(request,env){
 const origin=request.headers.get("Origin")||"";
 const isTest=origin!==(env.LIVE_ORIGIN||"https://survey.propertykickstart.co.uk");
 const allowedOrigins=(env.ALLOWED_ORIGIN||"https://deals.propertykickstart.co.uk").split(",").map(x=>x.trim());
 const allowed=allowedOrigins.includes(origin)?origin:allowedOrigins[0];
 const headers={"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json","Cache-Control":"no-store"};
 const reply=(data,status)=>new Response(JSON.stringify(isTest?data:(data.saved?{saved:true}:data.error?{error:data.error}:data)),{status,headers});
 if(!allowedOrigins.includes(origin))return reply({error:"Forbidden"},403);
 if(request.method==="OPTIONS")return reply({},200);
 if(request.method!=="POST")return reply({error:"Method not allowed"},405);
 if(Number(request.headers.get("content-length")||0)>14000)return reply({error:"Too large"},413);
 let p;try{const raw=await request.text();if(raw.length>14000)return reply({error:"Too large"},413);p=JSON.parse(raw)}catch{return reply({error:"Invalid JSON"},400)}
 if(!p||typeof p!=="object")return reply({error:"Invalid submission"},400);
 if(p.website||!validate(p))return reply({error:"Invalid submission",stage:"validation"},400);
 if(!env.NOTION_API_TOKEN)return reply({error:"Not configured",stage:"configuration"},503);
 const nh={"Authorization":"Bearer "+env.NOTION_API_TOKEN,"Notion-Version":"2022-06-28","Content-Type":"application/json"};
 // Idempotency: check Submission ID before creating. Notion has no unique constraint;
 // parallel retries still require an external durable lock for strict exactly-once semantics.
 const q=await fetch(notion+"/databases/"+DB+"/query",{method:"POST",headers:nh,body:JSON.stringify({filter:{and:[{property:"Submission ID",rich_text:{equals:p.submission_id}},{property:"Test response",checkbox:{equals:isTest}},{property:"Survey year",number:{equals:SURVEY_YEAR}}]},page_size:1})});
 if(!q.ok)return reply({error:"Storage unavailable",stage:"notion_lookup",upstream_status:q.status},503);
 const existing=await q.json();
 if(existing.results?.length)return reply({saved:true,id:existing.results[0].id},200);
 const a=p.answers;
 const body={parent:{database_id:DB},properties:{
  ...questionProperties(p),
  ...await investorProperties(p,isTest,nh),
  "Response":{title:rich(((p.contact.name||"").trim()||"Anonymous")+" | 2027 Survey "+p.submission_id.slice(0,8))},
  "Submitted at":{date:{start:new Date().toISOString()}},
  "Landlord":{select:{name:a[0]}},
  "Investor interest":{rich_text:rich(a[10])},
  "Submission ID":{rich_text:rich(p.submission_id)},
  "Answers JSON":{rich_text:rich(JSON.stringify({answers:a,other:p.other||{},professional_followup:professionalData(p)}))},
  "Test response":{checkbox:isTest},
  "Contact name":{rich_text:rich((p.contact.name||"").trim())},
  "Contact email":{email:(p.contact.email||"").trim()||null},
  "Mobile number":{phone_number:(p.contact.mobile||"").trim()||null},
  "Email marketing consent":{checkbox:p.contact.emailMarketing},
  "Email consent at":{date:p.contact.emailMarketing?{start:new Date().toISOString()}:null},
  "WhatsApp invitation":{checkbox:p.contact.whatsappInvite}
 }};
 const result=await fetch(notion+"/pages",{method:"POST",headers:nh,body:JSON.stringify(body)});
 if(!result.ok)return reply({error:"Storage unavailable",stage:"notion_write",upstream_status:result.status},503);
 const data=await result.json();return reply({saved:true,id:data.id},200);
}};