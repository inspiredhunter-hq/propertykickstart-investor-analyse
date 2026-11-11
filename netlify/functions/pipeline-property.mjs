// ACT-914 · READ-ONLY BTL property lookup. Private Notion token and preview key are server-side only.
// Deploy ONLY to the separate TEST Netlify site. Never copy private Pipeline addresses into public data.
const DB = "710fe865009045849686b7c6a64cae81";
const permitted = {
  propertyCode: "Property Code", strategy: "Strategy", town: "Town", region: "UK Region",
  askingPrice: "Asking Price", purchasePrice: "Purchase Price",
  monthlyRent: ["Monthly Rent (PDF)", "Rent pm (Model)", "Estimated Market Rent Monthly"],
  stampDuty: "Stamp Duty", legalFees: "Legal Fees", brokerage: "Brokerage",
  survey: "Survey / Valuation Cost (£)", arrangementFee: "Mortgage Arrangement Fee (£)",
  annualInsurance: "Annual Insurance", maintenance: "Annual Maintenance Allowance",
  annualVoid: "Annual Void Allowance", annualOther: "Other Annual Costs",
  annualGroundRent: "Ground Rent pa", annualCompliance: "Annual Compliance and Licensing Costs",
  annualRegistration: "Property registration renewal pa",
  initialRegistration: "Property registration fee", refurb: "Refurb Estimate",
  furnishing: "Furniture and Setup Costs", otherAcquisition: "Other one-off acquisition or setup costs",
  managementRate: "Management %", interestRate: "Interest Rate % Assumption",
  pkSourcingFee: "PK Sourcing Fee", ltv: "LTV %", unitBreakdown: "Unit Rental Breakdown"
};
function get(p) {
  if (!p) return null;
  if (p.type === "number") return p.number ?? null;
  if (p.type === "rich_text" || p.type === "title") return (p[p.type] || []).map(x=>x.plain_text || x.text?.content || "").join("");
  if (p.type === "select") return p.select?.name || null;
  if (p.type === "formula") return p.formula?.number ?? p.formula?.string ?? null;
  if (p.type === "checkbox") return p.checkbox;
  if (p.type === "url") return p.url || null;
  return null;
}
function response(code, payload) {
  return { statusCode: code, headers: {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}, body: JSON.stringify(payload) };
}
export async function handler(event) {
  if(event.httpMethod !== "POST") return response(405,{error:"POST required"});
  const secret=process.env.PK_CALCULATOR_TEST_KEY;
  const token=process.env.PK_NOTION_READ_TOKEN;
  if(!secret || !token) return response(503,{error:"TEST Pipeline integration not configured"});
  if(event.headers?.["x-pk-preview-key"] !== secret) return response(401,{error:"Invalid TEST access key"});
  let input; try {input=JSON.parse(event.body || "{}");} catch {return response(400,{error:"Invalid JSON"});}
  const code=String(input?.propertyCode || "").toUpperCase().trim();
  if(!/^[A-Z0-9][A-Z0-9-]{2,39}$/.test(code)) return response(400,{error:"Enter a valid PK Property Code"});
  let upstream;
  try {
    upstream=await fetch("https://api.notion.com/v1/databases/"+DB+"/query", {
      method:"POST", headers: {"Authorization":"Bearer "+token,"Notion-Version":"2022-06-28","Content-Type":"application/json"},
      body:JSON.stringify({filter:{property:"Property Code",rich_text:{equals:code}},page_size:3})
    });
  } catch { return response(502,{error:"Pipeline connection unavailable"}); }
  if(!upstream.ok) return response(502,{error:"Pipeline returned an error. Check TEST integration sharing and credentials."});
  const data=await upstream.json();
  if(!Array.isArray(data.results)||data.results.length!==1) return response(404,{error:"No unique matching Pipeline record found"});
  const record=data.results[0],p=record.properties||{};
  const strategy=String(get(p.Strategy)||"");
  if(!/buy to let|buy-to-let|\bbtl\b/i.test(strategy)) return response(422,{error:"Selected property is not classified as BTL in the Pipeline"});
  const values={},sources={};
  for(const [key,field] of Object.entries(permitted)) {
    const fields=Array.isArray(field)?field:[field];
    const matched=fields.find(f=>get(p[f])!==null && get(p[f])!=="");
    values[key]= matched?get(p[matched]):null;
    sources[key]= matched?matched:null;
  }
  // Verification: exact returned code must match requested code, not a fuzzy title match.
  if(String(values.propertyCode||"").toUpperCase().trim()!==code) return response(409,{error:"Property Code mismatch"});
  return response(200,{property:values,sourceFields:sources,source:"Notion Deals Pipeline",lastEdited:record.last_edited_time||null,recordUrl:record.url||null,missing:Object.keys(values).filter(k=>values[k]===null)});
}