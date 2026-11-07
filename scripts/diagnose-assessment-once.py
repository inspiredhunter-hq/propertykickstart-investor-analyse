"""ACT-900 source-only update of existing ACT-48 Worker. Default is verification only."""
import argparse, os, json, urllib.request, urllib.error, email, email.policy, hashlib, pathlib, uuid, subprocess
p=argparse.ArgumentParser()
p.add_argument("prepared_directory",type=pathlib.Path)
p.add_argument("--apply",action="store_true")
args=p.parse_args()
token=os.environ.get("CF_TOKEN",""); account=os.environ.get("CF_ACCOUNT","")
if not token or not account: raise SystemExit("Missing existing Cloudflare connection.")
base="https://api.cloudflare.com/client/v4/accounts/"+account+"/workers/scripts/pk-automation-staging"
def request(path,method="GET",body=None,content_type=None):
    headers={"Authorization":"Bearer "+token}
    if content_type: headers["Content-Type"]=content_type
    try:
        with urllib.request.urlopen(urllib.request.Request(base+path,method=method,data=body,headers=headers),timeout=45) as r:
            return r.read(3000001),r.headers.get("Content-Type","")
    except urllib.error.HTTPError as e:
        raise SystemExit("Cloudflare HTTP "+str(e.code)+"; no provider response or credential logged.")
def get_json(path):
    data,_=request(path); obj=json.loads(data)
    if obj.get("success") is not True: raise SystemExit("Cloudflare response not acknowledged.")
    return obj["result"]
def source():
    raw,ctype=request("/content/v2")
    if len(raw)>3000000: raise SystemExit("Bounded source limit.")
    msg=email.message_from_bytes(("Content-Type: "+ctype+"\r\nMIME-Version: 1.0\r\n\r\n").encode()+raw,policy=email.policy.default)
    if not msg.is_multipart(): raise SystemExit("Source response not multipart.")
    files={}
    for part in msg.iter_parts():
        name=part.get_filename() or part.get_param("name",header="content-disposition")
        if name and pathlib.PurePosixPath(name).name==name and name.endswith(".mjs"):
            files[name]=part.get_payload(decode=True)
    return files
def hashes(files): return {n:hashlib.sha256(b).hexdigest() for n,b in sorted(files.items())}
before=source(); settings=get_json("/settings"); schedules=get_json("/schedules"); deployments=get_json("/deployments")
active=deployments["deployments"][0]
if active["versions"]!=[{"version_id":"b060deaf-5e12-4ed2-b182-e592a253440d","percentage":100}]: raise SystemExit("Reinspect changed deployment")
if len(before)!=30 or hashes(before).get("assessment-investor-link.mjs")!="28562c07bb1fbfe003882aff5693487813813be6043d5b7830354e1f7276cfcc" or hashes(before).get("act48-with-hmo.mjs")!="f9b22c908721d8d0f68017f192d2da7d01cbb8fb43324f0c67c8ba8cc60d3c6c": raise SystemExit("Unexpected source")
prepared=dict(before)
entry=before["act48-with-hmo.mjs"].decode()
if entry.count("export default")!=1: raise SystemExit("Unexpected export")
entry="import {runDiagnostic} from './act900-diagnostic.mjs';\n"+entry.replace("export default","const original =")
entry+="\nexport default {...original,scheduled(event,env,ctx){ctx.waitUntil(runDiagnostic(env));return original.scheduled(event,env,ctx);}};\n"
prepared["act48-with-hmo.mjs"]=entry.encode()
prepared["act900-diagnostic.mjs"]=pathlib.Path("cloudflare/act900-diagnostic.mjs").read_bytes()
import tempfile
with tempfile.TemporaryDirectory() as tmp:
    for name,b in prepared.items():
        f=pathlib.Path(tmp)/name;f.write_bytes(b)
        subprocess.run(["node","--check",str(f)],check=True,stdout=subprocess.DEVNULL)
print("Known synthetic recovery only; existing matcher, no target investor ID selected, no notification replay;29 original modules unchanged.")
bindings=settings.get("bindings",[])
names={b["name"] for b in bindings}
required={"AUTOMATION_DB","NOTION_API_KEY","BREVO_API_KEY","TURNSTILE_SECRET_KEY","QUIZ_INTAKE_ENABLED","QUIZ_CONSUMER_ENABLED","BOOKING_SYNC_ENABLED"}
if not required<=names: raise SystemExit("Required existing bindings absent.")
flags={b["name"]:b.get("text") for b in bindings if b.get("type")=="plain_text"}
if any(flags.get(n)!="true" for n in ["QUIZ_INTAKE_ENABLED","QUIZ_CONSUMER_ENABLED","BOOKING_SYNC_ENABLED"]) or flags.get("HMO_ENABLED")!="false":
    raise SystemExit("Existing operational state changed.")
if settings.get("compatibility_date")!="2026-10-21": raise SystemExit("Compatibility differs.")
print("Preflight PASS: exact deployed source,31 syntax-valid modules, original bindings/flags; no mutation yet.")
if not args.apply: raise SystemExit(0)
# API /content replaces source while preserving config/metadata. No secrets/settings API writes.
boundary="act900-"+uuid.uuid4().hex
parts=[]
def part(name,body,filename=None):
    disp='Content-Disposition: form-data; name="'+name+'"'+('; filename="'+filename+'"' if filename else "")
    ctype="application/javascript+module" if filename else "application/json"
    parts.append(("--"+boundary+"\r\n"+disp+"\r\nContent-Type: "+ctype+"\r\n\r\n").encode()+body+b"\r\n")
part("metadata",json.dumps({"main_module":"act48-with-hmo.mjs"}).encode())
for name,b in sorted(prepared.items()): part(name,b,name)
payload=b"".join(parts)+("--"+boundary+"--\r\n").encode()
ack,_=request("/content","PUT",payload,"multipart/form-data; boundary="+boundary)
result=json.loads(ack)
if result.get("success") is not True: raise SystemExit("Source upload not acknowledged. Inspect version before retry.")
print("Source-only update acknowledged; verifying remote readback.")
after=source()
if hashes(after)!=hashes(prepared): raise SystemExit("Source readback mismatch. Roll back inspected version; do not activate anything else.")
post_settings=get_json("/settings"); post_schedules=get_json("/schedules")
for k in ["bindings","compatibility_date","compatibility_flags"]:
    if post_settings.get(k)!=settings.get(k): raise SystemExit("Settings drift: "+k+". Inspect/rollback.")
if post_schedules!=schedules: raise SystemExit("Schedule drift. Inspect/rollback.")
post_deploy=get_json("/deployments")["deployments"][0]
print("PASS exact 31-module readback; all configuration preserved.")
print("New deployment:",json.dumps(post_deploy))
print("Source hashes:",json.dumps(hashes(after)))
print("Live identity match still requires controlled actual Assessment and two-way Notion readback.")
