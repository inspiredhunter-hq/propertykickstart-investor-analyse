import fs from 'node:fs';
const now=new Date();
const ukWeekday=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',weekday:'short'}).format(now);
const ukHour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',hour:'2-digit',hourCycle:'h23'}).format(now));
if(process.env.GITHUB_EVENT_NAME==='schedule'&&!(ukHour===9&&['Mon','Tue','Wed','Fri'].includes(ukWeekday)||ukHour===15&&ukWeekday==='Wed')){
 console.log('Outside scheduled UK readiness window; no data changes.');process.exit(0);
}
const token=process.env.NOTION_TOKEN;
if(!token) throw Error('PK_NOTION_READ_TOKEN is not configured');
const db=process.env.NOTION_DATABASE_ID||'d915e3ac-8612-4454-ad05-a55f5534277a';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const manifest=JSON.parse(fs.readFileSync('config/featured-deal.json','utf8'));
const text=p=>(p?.rich_text||p?.title||[]).map(x=>x.plain_text).join('');
const rel=p=>p?.relation||[];
async function query(){const out=[];let cursor;do{const resp=await fetch('https://api.notion.com/v1/databases/'+db+'/query',{method:'POST',headers:{Authorization:'Bearer '+token,'Notion-Version':'2022-06-28','Content-Type':'application/json'},body:JSON.stringify({page_size:100,...(cursor?{start_cursor:cursor}:{})})});if(!resp.ok)throw Error('Notion API status '+resp.status);const data=await resp.json();out.push(...data.results);cursor=data.has_more?data.next_cursor:null;}while(cursor);return out;}
const records=await query();
const series='3fb2aad7d30e8155b7e2e96b45176013';
const candidates=records.filter(r=>rel(r.properties['Series Registry']).some(x=>x.id.replaceAll('-','')===series)&&r.properties['Publishing Status']?.select?.name!=='2. Published');
const planned=process.env.TARGET_CL_PAGE_ID?.replaceAll('-','');
const matches=planned?candidates.filter(r=>r.id.replaceAll('-','')===planned):candidates;
const checks=[];
for(const item of matches){const p=item.properties;const name=text(p['Content Title'])||text(p.Name)||item.id;
const issues=[];
const check=(ok,label)=>{if(!ok)issues.push(label)};
check(rel(p['Source Deal']).length===1,'Source Deal must link to one Pipeline record');
check(p['Approved?']?.checkbox===true,'Final editorial Approved? not confirmed');
check(p['Content Approval']?.select?.name==='3. Content approved','Content Approval is not approved');
check(!!(p['Article URL']?.url||p['Newsletter URL']?.url),'Generated LinkedIn article URL not recorded');
check(!!p['Scheduled Date']?.date?.start,'Scheduled publication date not recorded');
check(!!p['Scheduled Date']?.date?.start?.includes('T'),'Scheduled publication UK time not recorded: use the existing Scheduled Date field with a time and Europe/London timezone');
check(p['Assets Complete']?.checkbox===true,'Assets Complete not verified');
check(p['CL Complete']?.checkbox===true,'Content Library complete not verified');
const reg=Object.values(manifest.properties).find(x=>x.contentPageId?.replaceAll('-','')===item.id.replaceAll('-',''));
check(!!reg,'Permanent property analyser not registered in release manifest');
if(reg){check(fs.existsSync(reg.path),'Property HTML missing');check(reg.releaseApproved===true,'Property financial/release approval outstanding');check(reg.availability==='verified_available','Current availability verification outstanding');}
checks.push({title:name,id:item.id,url:item.url,issues});}
const report=['# SMART Deal readiness check','Run date (UK): '+today,'Candidate records: '+checks.length,'',...checks.flatMap(x=>['## '+x.title,x.url,x.issues.length?'Not ready:':'Ready for manual live-publication verification',...x.issues.map(s=>'- [ ] '+s),''])].join('\n');
fs.mkdirSync('reports',{recursive:true});fs.writeFileSync('reports/latest-readiness.md',report);
console.log(report);
if(!checks.length)console.log('No unpublished SMART Deal candidate identified; review series relation and next issue.');
// Report is advisory: no changes to public HTML or Content Library.
