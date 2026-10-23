#!/usr/bin/env python3
"""Non-deployment checks for approved HMO generator."""
import json, subprocess, sys, tempfile, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
GEN=ROOT/"scripts"/"new_hmo_analyser.py"
CODE="HMO-NE-TESTA"
FIELDS={"price":200000,"rent":30000,"ltv":75,"rate":6,"stamp":11500,"legal":2500,
 "broker":2200,"arrangement":1999,"survey":500,"managementRate":12,
 "cost-0":3600,"cost-1":2400,"cost-2":2400,"cost-3":500,"cost-4":230,
 "cost-5":4800,"cost-6":2100,"cost-7":3000,"cost-8":366}
BASE={"property_code":CODE,"town":"Testville","region":"North East",
 "room_description":"Six lettable rooms","headline":"Illustrative test heading",
 "financials":FIELDS}
class GeneratorTests(unittest.TestCase):
 def invoke(self,config):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/"input.json"
   p.write_text(json.dumps(config),encoding="utf-8")
   return subprocess.run([sys.executable,str(GEN),str(p)],cwd=ROOT,capture_output=True,text=True)
 def tearDown(self):
  p=ROOT/CODE/"index.html"
  if p.exists(): p.unlink()
  folder=ROOT/CODE
  if folder.exists(): folder.rmdir()
 def test_generates_unique_property_draft_without_master_data(self):
  p=ROOT/CODE
  self.assertFalse(p.exists(),"Test route already exists")
  result=self.invoke(BASE)
  self.assertEqual(result.returncode,0,result.stderr+result.stdout)
  html=(p/"index.html").read_text()
  self.assertIn("Testville",html)
  self.assertIn(CODE,html)
  self.assertIn('id="price" min="1" type="number" value="200000"',html)
  self.assertIn('id="rent" min="0" type="number" value="30000"',html)
  self.assertNotIn("HMO-NW-2S98D",html)
  self.assertNotIn("St Helens",html)
  self.assertIn("DRAFT ONLY",result.stdout)
  self.assertNotIn("£220,000",html)
 def test_rejects_missing_financial_assumptions(self):
  d=dict(BASE,financials={k:v for k,v in FIELDS.items() if k!="cost-7"})
  self.assertNotEqual(self.invoke(d).returncode,0)
 def test_rejects_bad_management_arithmetic(self):
  d=dict(BASE,financials=dict(FIELDS,**{"cost-0":100}))
  self.assertNotEqual(self.invoke(d).returncode,0)
 def test_rejects_existing_property_path(self):
  (ROOT/CODE).mkdir(exist_ok=False)
  (ROOT/CODE/"index.html").write_text("existing")
  r=self.invoke(BASE)
  self.assertNotEqual(r.returncode,0)
  self.assertEqual((ROOT/CODE/"index.html").read_text(),"existing")
if __name__=="__main__": unittest.main()
