// Dedicated 2027 survey Worker. Deploy separately from ACT-48.
// Required encrypted secret: NOTION_API_TOKEN
// Optional variable: ALLOWED_ORIGIN (default TEST origin)
const DB="d7505061004d448fb254d2614b3fae3d";
const notion="https://api.notion.com/v1";
const yes=["Expand my property portfolio","Improve the performance of my existing properties","Change the types of properties in my portfolio","Maintain my existing portfolio","Consolidate or reduce my portfolio","I'm undecided about my next move"];
const no=["Buy my first investment property","Identify which investment approach suits my objectives","Explore whether property investment is right for me","I'm not currently planning to invest"];
const sets=[
["Yes","No"],null,
["Within the next 3 months","Within 3–6 months","Within 6–12 months","More than 12 months from now","I haven't decided yet","I'm not currently planning to make a move"],
["Generate dependable monthly income","Build long-term wealth","Reduce the time and effort involved in managing properties","Diversify my investments","Other"],
["Finding suitable properties","Understanding financial returns","Assessing risks","Finding reliable professionals","Finding sufficient time","Financing acquisitions","Managing properties after purchase","Verifying property information without travelling to view it","Other"],
["Dependable net income","Long-term capital growth","Minimal management involvement","Purchase price relative to value","Potential to improve property performance","Clear and manageable risks","Other"],
["I haven't found properties that meet my requirements","The financial returns haven't been attractive enough","I haven't had sufficient time","I don't currently have the capital or financing","I'm concerned about economic or regulatory uncertainty","I haven't been able to verify property information sufficiently","I'm already acquiring properties","I'm not currently planning to purchase an investment property","Other"],
["Finding properties that meet my requirements","Assessing financial performance and returns","Verifying property information and conducting due diligence","Coordinating the purchase process","Finding reliable local professionals","Arranging ongoing property management","Nothing, I prefer handling everything myself","Other"],
null,null,
["A fully managed service, with most of the process handled for me","Personal support with specific parts of the process","Access to suitable properties, with me managing the acquisition","Tools and resources to help me manage the process independently","I wouldn't need additional support","Other"],
["Yes, I'm actively looking","Possibly, for the right opportunity","Not at the moment"]
];
const PROFESSIONALS=["Mortgage brokers","Solicitors and conveyancers","Accountants and tax specialists","Surveyors and valuers","Insurers","Builders and project managers","Letting agents and property managers","Bookkeepers","Financial advisers (where relevant)","Specialist trust or estate professionals (where relevant)","Other"];
function professionalData(p){
 if(!(p.answers?.[4]?.includes("Finding reliable professionals")||p.answers?.[7]?.includes("Finding reliable local professionals")))return undefined;
 const f=p.professional_followup;
 return f?.wantsToTell===true?{wantsToTell:true,selected:f.selected,other:f.selected.includes("Other")?f.other:""}:undefined;
}
function validate(p){
 const a=p.answers,o=p.other||{};
 if(!a||typeof a!=="object"||Array.isArray(a)||!o||typeof o!=="object"||Array.isArray(o))return false;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(p.submission_id||""))return false;
 for(let i=0;i<12;i++){
 const v=a[i],options=i===1?(a[0]==="Yes"?yes:no):sets[i];
 if(i===8||i===9){if(v!==undefined&&(typeof v!=="string"||v.length>2000))return false;continue}
 if([3,4,5,7].includes(i)){
  if(!Array.isArray(v)||new Set(v).size!==v.length||v.some(x=>!options.includes(x)))return false;
  if(i===4?(v.length<1||v.length>3):(v.length<1||v.length>2||(i===7&&v.includes("Nothing, I prefer handling everything myself")&&v.length!==1)))return false;
 }else if(!options.includes(v))return false;
 if((v==="Other"||Array.isArray(v)&&v.includes("Other"))&&!(typeof o[i]==="string"&&o[i].trim()))return false;
 }
 if(Object.values(o).some(v=>typeof v!=="string"||v.length>500))return false;
 const f=p.professional_followup;
 if(f!==undefined){
  if(!f||typeof f!=="object"||Array.isArray(f)||typeof f.wantsToTell!=="boolean"||!Array.isArray(f.selected)||f.selected.length>PROFESSIONALS.length||new Set(f.selected).size!==f.selected.length||f.selected.some(x=>!PROFESSIONALS.includes(x))||typeof f.other!=="string"||f.other.length>500||!f.wantsToTell||f.selected.length===0||(f.selected.includes("Other")&&!f.other.trim()))return false;
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
 const option=v=>v?{select:{name:v.replaceAll(",","").replace(/\\.$/,"")}}:{select:null};
 const text=v=>({rich_text:rich(v||"")});
 const props={
 "Q2 | Property plans":option(a[1]),
 "Q3 | Next investment move timeframe":option(a[2]),
 "Q4 | Investment objectives - first priority":option(a[3]?.[0]),
 "Q4 | Investment objectives - second priority":option(a[3]?.[1]),
 "Q5 | Biggest challenges":{multi_select:(a[4]||[]).map(name=>({name}))},
 "Q5 | Professional follow-up":option(f?"Yes":null),
 "Q5 | Professionals":{multi_select:(f?.selected||[]).map(name=>({name}))},
 "Q5 | Other professionals":text(f?.other),
 "Q6 | Property decision - first priority":option(a[5]?.[0]),
 "Q6 | Property decision - second priority":option(a[5]?.[1]),
 "Q7 | Reason for not acquiring":option(a[6]),
 "Q8 | Support valued - first priority":option(a[7]?.[0]),
 "Q8 | Support valued - second priority":option(a[7]?.[1]),
 "Q9 | What has not worked":text(a[8]),
 "Q10 | What would make it easier":text(a[9]),
 "Q11 | Preferred support":option(a[10])
 };
 for(const i of [3,4,5,6,7,10])props["Q"+(i+1)+" | Other detail"]=text((a[i]==="Other"||Array.isArray(a[i])&&a[i].includes("Other"))?o[i]:"");
 for(const name of PROFESSIONALS)props[name==="Other"?"Other professional selected":name]={checkbox:!!f?.selected.includes(name)};
 return props;
}

export default {async fetch(request,env){
 const origin=request.headers.get("Origin")||"";
 const allowedOrigins=(env.ALLOWED_ORIGIN||"https://deals.propertykickstart.co.uk").split(",").map(x=>x.trim());
 const allowed=allowedOrigins.includes(origin)?origin:allowedOrigins[0];
 const headers={"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json"};
 const reply=(data,status)=>new Response(JSON.stringify(data),{status,headers});
 if(!allowedOrigins.includes(origin))return reply({error:"Forbidden"},403);
 if(request.method==="OPTIONS")return reply({},200);
 if(request.method!=="POST")return reply({error:"Method not allowed"},405);
 if(Number(request.headers.get("content-length")||0)>14000)return reply({error:"Too large"},413);
 let p;try{p=await request.json()}catch{return reply({error:"Invalid JSON"},400)}
 if(p.website||!validate(p))return reply({error:"Invalid submission",stage:"validation"},400);
 if(!env.NOTION_API_TOKEN)return reply({error:"Not configured",stage:"configuration"},503);
 const nh={"Authorization":"Bearer "+env.NOTION_API_TOKEN,"Notion-Version":"2022-06-28","Content-Type":"application/json"};
 // Idempotency: check Submission ID before creating. Notion has no unique constraint;
 // parallel retries still require an external durable lock for strict exactly-once semantics.
 const q=await fetch(notion+"/databases/"+DB+"/query",{method:"POST",headers:nh,body:JSON.stringify({filter:{property:"Submission ID",rich_text:{equals:p.submission_id}},page_size:1})});
 if(!q.ok)return reply({error:"Storage unavailable",stage:"notion_lookup",upstream_status:q.status},503);
 const existing=await q.json();
 if(existing.results?.length)return reply({saved:true,id:existing.results[0].id},200);
 const a=p.answers;
 const body={parent:{database_id:DB},properties:{
  ...questionProperties(p),
  "Response":{title:rich(((p.contact.name||"").trim()||"Anonymous")+" | 2027 Survey "+p.submission_id.slice(0,8))},
  "Submitted at":{date:{start:new Date().toISOString()}},
  "Landlord":{select:{name:a[0]}},
  "Investor interest":{rich_text:rich(a[11])},
  "Submission ID":{rich_text:rich(p.submission_id)},
  "Answers JSON":{rich_text:rich(JSON.stringify({answers:a,other:p.other||{},professional_followup:professionalData(p)}))},
  "Test response":{checkbox:true},
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