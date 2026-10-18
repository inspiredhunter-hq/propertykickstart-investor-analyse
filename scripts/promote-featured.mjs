import fs from 'node:fs';
import path from 'node:path';

const manifest=JSON.parse(fs.readFileSync('config/featured-deal.json','utf8'));
const now=new Date();
const ukDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
const isTrue=p=>p?.checkbox===true;
const plain=p=>(p?.title||p?.rich_text||[]).map(v=>v.plain_text||'').join('');
const propertyDate=p=>p?.date?.start?.slice(0,10)||'';
function fail(message){throw new Error('Deployment check: '+message)}
// Scheduled runs obey the UK publishing window, including daylight-saving changes.
const ukDay=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short'}).format(now);
const ukHour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',hourCycle:'h23'}).format(now));
if(process.env.GITHUB_EVENT_NAME==='schedule' && (ukHour<8||ukHour>21||!['Thu','Fri','Sat','Sun'].includes(ukDay))){
 console.log('Outside UK publication watch window; no changes made.');process.exit(0);
}
const notionToken=process.env.NOTION_TOKEN;
if(!notionToken)fail('PK_NOTION_READ_TOKEN missing: configure the GitHub Actions repository secret.')
const databaseId=process.env.NOTION_DATABASE_ID||'d915e3ac-8612-4454-ad05-a55f5534277a';
async function notionQuery(){
 const pages=[];let cursor;
 do{
 const res=await fetch('https://api.notion.com/v1/databases/'+databaseId+'/query',{method:'POST',headers:{Authorization:'Bearer '+notionToken,'Notion-Version':'2022-06-28','Content-Type':'application/json'},body:JSON.stringify({page_size:100,...(cursor?{start_cursor:cursor}:{})})});
 if(!res.ok)fail('Notion HTTP '+res.status+' '+(await res.text()).slice(0,400));
 const data=await res.json();pages.push(...data.results);cursor=data.has_more?data.next_cursor:null;
 }while(cursor);
 return pages;
}
const all=await notionQuery();
const eligible=[];
for(const [code,p] of Object.entries(manifest.properties)){
 if(!p.contentPageId){console.log(code+': not registered for automatic promotion');continue}
 const rec=all.find(x=>x.id.replaceAll('-','')===p.contentPageId.replaceAll('-',''));
 if(!rec){console.log(code+': linked CL record not found');continue}
 const x=rec.properties;
 const status=x['Publishing Status']?.select?.name;
 const approved=isTrue(x['Approved?']);
 const date=propertyDate(x['Published Date'])||propertyDate(x['Publication Date']);
 const article=x['Article URL']?.url||x['Newsletter URL']?.url;
 const source=x['Source Deal']?.relation||[];
 if(status!=='2. Published'||!approved||!date||date>ukDate||!article||!/^https:\/\/www\.linkedin\.com\//.test(article)||source.length!==1){
 console.log(code+': publication gate incomplete: '+JSON.stringify({status,approved,date,article:!!article,sourceCount:source.length}));continue}
 if(p.availability!=='verified_available'||p.releaseApproved!==true){console.log(code+': release/availability gate incomplete');continue}
 if(!fs.existsSync(p.path))fail(code+' missing prebuilt HTML');
 const html=fs.readFileSync(p.path,'utf8');
 if(!html.includes(code)||!html.includes('printAssessment')||!html.includes('fullDisclaimer'))fail(code+' content validation failed');
 eligible.push({code,date,path:p.path});
}
eligible.sort((a,b)=>b.date.localeCompare(a.date)||a.code.localeCompare(b.code));
if(!eligible.length){console.log('No candidate passed all publication and property-release checks; keeping current homepage.');process.exit(0)}
const selected=eligible[0];
const current=fs.readFileSync('index.html','utf8');
const replacement=fs.readFileSync(selected.path,'utf8');
if(current===replacement){console.log('Homepage already shows '+selected.code);process.exit(0)}
fs.writeFileSync('index.html',replacement);
manifest.featuredProperty=selected.code;
fs.writeFileSync('config/featured-deal.json',JSON.stringify(manifest,null,2)+'\n');
console.log('Ready for commit: '+selected.code+' published '+selected.date);
