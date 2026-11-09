"""ACT-832: prepare the Brevo contact-sync patch against a freshly downloaded live source. No network, no deploy."""
import argparse, hashlib, pathlib, shutil, json
p=argparse.ArgumentParser(); p.add_argument("source_directory",type=pathlib.Path); p.add_argument("--expected-runtime-sha256",required=True)
args=p.parse_args(); root=args.source_directory.resolve(); runtime=root/"quiz-live-runtime.mjs"; raw=runtime.read_bytes()
if hashlib.sha256(raw).hexdigest()!=args.expected_runtime_sha256: raise SystemExit("Current runtime differs from inspected source. Reinspect before changing it.")
if not (root/"assessment-investor-link.mjs").is_file() or not (root/"act48-with-hmo.mjs").is_file(): raise SystemExit("Complete inspected source with the investor-link module required.")
original={x.name:hashlib.sha256(x.read_bytes()).hexdigest() for x in root.glob("*.mjs")}
old=" const notion=env.ASSESSMENT_INVESTOR_LINK_ENABLED!=='false'?withInvestorProfileLink({notion:baseNotion,token:env.NOTION_API_KEY,investorDataSourceId:'0c8ed56c-8c78-40ba-9f44-b8e8c97d0aec'}):baseNotion;"
new=old.replace(" const notion="," const linkedNotion=")+"\n const notion=env.ASSESSMENT_BREVO_SYNC_ENABLED!=='false'?withBrevoContactSync({notion:linkedNotion,apiKey:env.BREVO_API_KEY,listId:34}):linkedNotion;"
text=raw.decode("utf-8")
if text.count(old)!=1: raise SystemExit("Exact runtime anchor missing or ambiguous.")
imp="import {withInvestorProfileLink} from './assessment-investor-link.mjs';"
if text.count(imp)!=1: raise SystemExit("Exact import anchor missing or ambiguous.")
module=pathlib.Path(__file__).resolve().parents[1]/"cloudflare"/"assessment-brevo-contact.mjs"
if not module.is_file() or (root/module.name).exists(): raise SystemExit("Missing candidate module or destination already exists.")
runtime.write_text(text.replace(old,new).replace(imp,imp+"\nimport {withBrevoContactSync} from './assessment-brevo-contact.mjs';"))
shutil.copyfile(module,root/module.name)
for name,digest in original.items():
    if name!=runtime.name and hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest: raise SystemExit("Unexpected change to original module.")
print(json.dumps({"state":"prepared-not-deployed","modified_original_module":runtime.name,"added_module":module.name,"activation_flag":"ASSESSMENT_BREVO_SYNC_ENABLED","default":"enabled; list enrolment only with current consent evidence"}))
