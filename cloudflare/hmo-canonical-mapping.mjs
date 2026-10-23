// Header names read from the canonical Deal Register on 23 October 2026.
export const workbookId = '1lhOpKbAkwB_jBS5W8FMCYpr_s82Yz6XCX9uT8AYj6k0';
export const pipelineId = 'fefec54907c446a6b932cd05a38e0e92';
export const complete = ['Complete — Evidenced','Complete — Modelled','Complete — Mixed'];
const fail = message => {throw new Error(message);};
export const id = value => String(value).replaceAll('-','').toLowerCase();
export function number(row, key) {
 const n=row[key];
 if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>=1e8)fail('Missing or invalid canonical number: '+key);
 return n;
}
function near(a,b,label){if(Math.abs(a-b)>0.02)fail('Canonical reconciliation failed: '+label);}
const text=(r,k)=>typeof r[k]==='string'&&r[k].trim()?r[k].trim():fail('Missing canonical label: '+k);
export function mapCanonical(page, rows) {
 const p=page.properties;
 if(id(page.parent_id)!==pipelineId)fail('Wrong Pipeline');
 const code=text(p,'Property Code');
 if(!/^HMO-[A-Z]{2}-[A-Z0-9]{5,}$/.test(code)||code==='HMO-NW-2S98D')fail('Require a new HMO route');
 const matches=rows.filter(r=>r['Property Code']===code);
 if(matches.length!==1)fail('Missing or duplicate Deal Register row');
 const r=matches[0];
 const match=String(r['Notion Record URL']).match(/\/p\/([a-f0-9-]{32,36})(?:[/?#]|$)/i);
 if(!match||id(match[1])!==id(page.id))fail('Pipeline/Deal Register identity mismatch');
 if(p.Strategy!=='HMO'||r.Strategy!=='HMO'||p.Availability!=='Available'||r['Availability (Notion)']!=='Available')fail('HMO not available');
 if((!r['Analysis Readiness']||/review|incomplete|error|pending/i.test(r['Analysis Readiness']))||r['Ranking Eligible']!==true)fail('Financial QA not ready');
 for(const key of ['Operating Cost Reconciliation','Capital Cost Reconciliation'])if(!complete.includes(r[key]))fail('Unreconciled Deal Register costs');
 for(const key of ['HMO Operating Costs Reconciliation Status','Capital Costs Reconciliation Status'])if(!complete.includes(p[key]))fail('Unreconciled Pipeline costs');
 if(!['Tenant Pays All','Landlord Pays All','Mixed'].includes(p['HMO Bills Model'])||p['HMO Bills Model']!==r['HMO Bills Model'])fail('Unresolved bills model');
 const n=k=>number(r,k), sum=keys=>keys.reduce((s,k)=>s+n(k),0);
 // Existing master uses one price for loan, fee and yields: reject differing purchase price.
 near(number(p,'Asking Price'),n('Asking Price'),'asking price');
 near(number(p,'Purchase Price'),n('Asking Price'),'purchase price unsupported by current master');
 near(number(p,'Rent pm (Model)')*12,n('Gross Rent pa'),'rent');
 near(n('Gross Rent pm')*12,n('Gross Rent pa'),'monthly rent');
 near(number(p,'Deposit % Assumption'),n('Deposit %'),'deposit fraction');
 near(number(p,'Management %'),n('Management %'),'management fraction');
 const town=text(r,'Town'), region=text(r,'Region');
 if(!Array.isArray(p.Town)||p.Town.length!==1||p.Town[0]!==town||p['UK Region']!==region)fail('Location mismatch');
 const rooms=n('Lettable Rooms');
 if(!Number.isInteger(rooms)||rooms<1||rooms!==number(p,'Bedrooms'))fail('Room count mismatch');
 // Group each cost once. Workbook Utilities/Council/Compliance are summary checks,
 // never added again on top of their dedicated HMO components.
 const utilities=sum(['HMO Gas pa','HMO Electricity pa','HMO Water pa','HMO Broadband pa']);
 near(utilities,n('Utilities pa'),'utilities subtotal');
 const other=sum(['Compliance pa','Service Charge pa','Ground Rent pa','Accounting / Admin pa','Other Operating Costs pa',
  'HMO TV Licence pa','HMO Cleaner pa','HMO Communal Supplies pa','HMO Laundry / Cleaning Supplies pa',
  'HMO Window Cleaning pa','HMO Pest Control pa','HMO Gardening pa','HMO Gas Safety / Servicing pa',
  'HMO EICR / PAT pa','HMO Fire Alarm Servicing pa','HMO Emergency Lighting pa']);
 const financials={price:n('Asking Price'),rent:n('Gross Rent pa'),ltv:(1-n('Deposit %'))*100,rate:6,
  stamp:n('Stamp Duty'),legal:n('Legal Fees'),broker:n('Mortgage Broker Fee'),arrangement:n('Mortgage Arrangement Fee'),survey:n('Survey / Valuation'),
  otherAcquisition:sum(['Refurbishment','Furniture / Setup','Other Acquisition / Setup']),managementRate:n('Management %')*100,
  'cost-0':n('Management Cost pa'),'cost-1':n('Maintenance pa'),'cost-2':n('Void pa'),'cost-3':n('Insurance pa'),
  'cost-4':n('Licensing pa'),'cost-5':utilities,'cost-6':n('Council Tax pa'),'cost-7':other,'cost-8':n('Boiler Repairs & Replacement pa (PK allowance)')};
 const f=financials;
 if(f.ltv<0||f.ltv>75||f.managementRate>100)fail('Unsupported finance percentage');
 near(f['cost-0'],f.rent*f.managementRate/100,'management');
 near(n('Loan Amount'),f.price*f.ltv/100,'loan');
 near(n('Deposit Required'),f.price-n('Loan Amount'),'deposit');
 near(f.broker,f.ltv?f.price*.01:0,'governed brokerage');
 if(!f.ltv&&f.arrangement!==0)fail('Cash purchase arrangement fee');
 const fee=Math.max(f.price*.02,3000)*1.2;
 near(n('PK Sourcing Fee'),fee,'PK fee');
 const capital=n('Deposit Required')+f.stamp+f.legal+f.broker+f.arrangement+f.survey+f.otherAcquisition+fee;
 const operating=Array.from({length:9},(_,i)=>f['cost-'+i]).reduce((a,b)=>a+b,0);
 near(n('Total Capital Required'),capital,'capital');
 near(n('Operating Costs pa'),operating,'operating costs');
 near(n('Net Before Finance pa'),f.rent-operating,'pre-finance surplus');
 near(n('6% Net Profit'),f.rent-operating-n('Loan Amount')*.06,'base profit');
 near(number(p,'Total Capital Required (Calc)'),capital,'Pipeline capital');
 near(number(p,'True Net Annual Cashflow (Post-Finance) (Calc)'),n('6% Net Profit'),'Pipeline profit');
 // Generate plain public wording; never forward address, source notes or arbitrary HTML.
 if(!/^[\p{L} .’'-]{1,80}$/u.test(town)||!/^[\p{L} .&'-]{1,80}$/u.test(region))fail('Unsupported public location');
 return {property_code:code,town,region,room_description:`${rooms} lettable rooms`,headline:'Explore this HMO investment illustration',financials};
}
export function sheetRows(values) {
 if(!Array.isArray(values)||values.length<2)fail('Missing Deal Register');
 const [headers,...rows]=values;
 const names=headers.filter(Boolean);
 if(new Set(names).size!==names.length)fail('Duplicate workbook headers');
 return rows.map(row=>Object.fromEntries(headers.filter(Boolean).map(k=>[k,row[headers.indexOf(k)]])));
}
