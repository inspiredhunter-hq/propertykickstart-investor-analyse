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
 const c=p.contact||{};
 if(typeof c!=="object"||Array.isArray(c))return false;
 if(["name","email","mobile"].some(k=>typeof(c[k]||"")!=="string"||(c[k]||"").length>200))return false;
 if(c.email&&!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(c.email))return false;
 if(c.mobile&&!/^\\+?[0-9 ()-]{7,25}$/.test(c.mobile))return false;
 if(typeof c.emailMarketing!=="boolean"||typeof c.whatsappInvite!=="boolean")return false;
 if(c.emailMarketing&&!c.email)return false;
 return true;
}
function rich(s){return [{text:{content:s.slice(0,1900)}}]}
export default {async fetch(request,env){
 const origin=request.headers.get("Origin")||"";
 const allowed=env.ALLOWED_ORIGIN||"https://deals.propertykickstart.co.uk";
 const headers={"Access-Control-Allow-Origin":allowed,"Access-Control-Allow-Headers":"content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json"};
 const reply=(data,status)=>new Response(JSON.stringify(data),{status,headers});
 if(origin!==allowed)return reply({error:"Forbidden"},403);
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
  "Response":{title:rich("2027 Survey "+p.submission_id.slice(0,8))},
  "Submitted at":{date:{start:new Date().toISOString()}},
  "Landlord":{select:{name:a[0]}},
  "Investor interest":{rich_text:rich(a[10])},
  "Submission ID":{rich_text:rich(p.submission_id)},
  "Answers JSON":{rich_text:rich(JSON.stringify({answers:a,other:p.other||{}}))},
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