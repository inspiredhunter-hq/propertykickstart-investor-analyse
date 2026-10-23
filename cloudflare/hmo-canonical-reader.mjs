import {pipelineId,workbookId,id,sheetRows} from './hmo-canonical-mapping.mjs';
async function json(url,init){
 const r=await fetch(url,{...init,redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw Error('Canonical provider unavailable');
 return r.json();
}
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const encoded=o=>b64(new TextEncoder().encode(JSON.stringify(o)));
export async function sheetsToken(env){
 // Dedicated service account, workbook shared read-only; no domain delegation.
 const key=JSON.parse(env.HMO_GOOGLE_SERVICE_ACCOUNT);
 if(key.type!=='service_account'||typeof key.client_email!=='string'||!key.private_key)throw Error('Sheets reader unavailable');
 const pem=key.private_key.replace(/-----[^-]+-----/g,'').replace(/\s/g,'');
 const cryptoKey=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
 const now=Math.floor(Date.now()/1000);
 const jwt=encoded({alg:'RS256',typ:'JWT'})+'.'+encoded({iss:key.client_email,scope:'https://www.googleapis.com/auth/spreadsheets.readonly',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+300});
 const signature=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',cryptoKey,new TextEncoder().encode(jwt));
 const token=await json('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt+'.'+b64(new Uint8Array(signature))})});
 if(!token.access_token)throw Error('Sheets reader unavailable');
 return token.access_token;
}
export async function readRegister(env){
 const token=await sheetsToken(env);
 const headers={authorization:'Bearer '+token};
 const meta=await json(`https://sheets.googleapis.com/v4/spreadsheets/${workbookId}?fields=sheets.properties`,{headers});
 const grid=meta.sheets?.find(s=>s.properties.title==='Deal Register')?.properties.gridProperties;
 if(!grid||grid.rowCount>2000||grid.columnCount>128)throw Error('Deal Register bounds require review');
 let col='',n=grid.columnCount;while(n){n--;col=String.fromCharCode(65+n%26)+col;n=Math.floor(n/26);}
 const range=encodeURIComponent(`'Deal Register'!A1:${col}${grid.rowCount}`);
 const sheet=await json(`https://sheets.googleapis.com/v4/spreadsheets/${workbookId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`,{headers});
 return sheetRows(sheet.values);
}
export async function readCanonical(pageId,env){
 const page=await json('https://api.notion.com/v1/pages/'+pageId,{headers:{authorization:'Bearer '+env.HMO_NOTION_READ_TOKEN,'Notion-Version':'2025-09-03'}});
 if(page.archived||page.in_trash||id(page.parent?.data_source_id)!==pipelineId)throw Error('Wrong Pipeline');
 const properties={};
 for(const [name,p] of Object.entries(page.properties)){
  if(p.type==='number')properties[name]=p.number;
  else if(p.type==='formula')properties[name]=p.formula?.[p.formula.type];
  else if(p.type==='select')properties[name]=p.select?.name;
  else if(p.type==='multi_select')properties[name]=p.multi_select.map(x=>x.name);
  else if(p.type==='rich_text')properties[name]=p.rich_text.map(x=>x.plain_text).join('');
 }
 return {page:{id:page.id,parent_id:page.parent.data_source_id,properties},rows:await readRegister(env)};
}
