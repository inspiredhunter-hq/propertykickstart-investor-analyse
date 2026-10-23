#!/usr/bin/env python3
"""Generate a property-specific HMO draft from the approved St Helens master.
Never deploy automatically. All property figures must be supplied and QA verified.
Usage: python3 scripts/new_hmo_analyser.py property.json
"""
import json, re, sys, html
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MASTER = ROOT / "HMO-NW-2S98D" / "index.html"
FIELDS = ["price","rent","ltv","rate","stamp","legal","broker","arrangement","survey",
          "managementRate","cost-0","cost-1","cost-2","cost-3","cost-4","cost-5","cost-6","cost-7","cost-8"]
REQUIRED = ["property_code","town","region","room_description","headline","financials"]
def main():
    if len(sys.argv)!=2:
        raise SystemExit("Usage: new_hmo_analyser.py property.json")
    d=json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    missing=[k for k in REQUIRED if k not in d]
    if missing: raise SystemExit("Missing required fields: "+", ".join(missing))
    code=d["property_code"]
    if not re.fullmatch(r"HMO-[A-Z]{2}-[A-Z0-9]{5,}",code) or code=="HMO-NW-2S98D":
        raise SystemExit("Require a new canonical HMO property code")
    if any(not isinstance(d[k],str) or not d[k].strip() for k in REQUIRED[:-1]):
        raise SystemExit("Property labels must be non-empty")
    f=dict(d["financials"])
    other_acquisition=f.pop("otherAcquisition",0)
    if isinstance(other_acquisition,bool) or not isinstance(other_acquisition,(int,float)) or not 0<=other_acquisition<100000000:
        raise SystemExit("Invalid other acquisition costs")
    if set(f)!=set(FIELDS): raise SystemExit("Financial fields must exactly match: "+", ".join(FIELDS))
    for key,v in f.items():
        if isinstance(v,bool) or not isinstance(v,(int,float)) or not 0<=v<100000000:
            raise SystemExit("Invalid financial field: "+key)
    if f["price"]<=0 or f["ltv"]>75 or f["rate"]>20 or f["managementRate"]>100:
        raise SystemExit("Price / mortgage / management values outside current HMO policy controls")
    if abs(f["cost-0"]-f["rent"]*f["managementRate"]/100)>0.02:
        raise SystemExit("Management cost must match annual rent times management rate")
    if f["rent"]<=0: raise SystemExit("Annual rent must be positive")
    dest=ROOT/code/"index.html"
    if dest.exists(): raise SystemExit("Refusing to overwrite existing analyser: "+str(dest))
    s=MASTER.read_text(encoding="utf-8")
    original={
       "St Helens":html.escape(d["town"]),
       "North West":html.escape(d["region"]),
       "Seven lettable rooms":html.escape(d["room_description"]),
       "HMO-NW-2S98D":code,
       "£2,868 a month in rent. What could an investor keep?":html.escape(d["headline"]),
       "£220,000":f"£{f['price']:,.0f}",
       "£2,868":f"£{f['rent']/12:,.0f}"
    }
    for old,new in original.items():
        if old not in s: raise SystemExit("Approved template changed: cannot locate "+old)
        s=s.replace(old,new)
    for key,value in f.items():
        rx=r'(<input\b[^>]*\bid="'+re.escape(key)+r'"[^>]*\bvalue=")([^"]*)(")'
        s,count=re.subn(rx,lambda m:m.group(1)+str(value)+m.group(3),s)
        if count!=1: raise SystemExit("Missing / duplicated input id: "+key)
    s,count=re.subn(r'(<input\b[^>]*\bid="otherAcquisition"[^>]*\bvalue=")([^"]*)(")',
        lambda m:m.group(1)+str(other_acquisition)+m.group(3),s)
    if count!=1: raise SystemExit("Missing other acquisition input")
    if "HMO-NW-2S98D" in s or "St Helens" in s:
        raise SystemExit("Unreplaced master identity detected")
    dest.parent.mkdir(parents=True,exist_ok=False)
    dest.write_text(s,encoding="utf-8")
    print("DRAFT ONLY:",dest)
    print("Mandatory before release: verify canonical Pipeline/Deal Register figures, asking price,")
    print("PK fee, SDLT, contingency, every operating cost, 12% HMO management policy,")
    print("independent model assertions, responsive/browser/accessibility, exactly two PDF pages,")
    print("release package, approved production deployment and all existing site URLs.")
if __name__=="__main__": main()

