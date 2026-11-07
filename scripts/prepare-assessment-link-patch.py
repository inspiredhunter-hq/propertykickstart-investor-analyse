"""Prepare a narrow patch against a freshly downloaded complete ACT-48 source. No network/deploy."""
import argparse, hashlib, pathlib, shutil, json
p=argparse.ArgumentParser()
p.add_argument("source_directory",type=pathlib.Path)
args=p.parse_args()
root=args.source_directory.resolve()
runtime=root/"quiz-live-runtime.mjs"
expected="dd516a0949998dbc9d41f38a46a04dbab085cda303838baa4e54c5dc3a34f900"
raw=runtime.read_bytes()
if hashlib.sha256(raw).hexdigest()!=expected:
    raise SystemExit("Current runtime differs from inspected source. Reinspect before changing it.")
original={x.name:hashlib.sha256(x.read_bytes()).hexdigest() for x in root.glob("*.mjs")}
if len(original)!=29 or not (root/"act48-with-hmo.mjs").is_file():
    raise SystemExit("Complete inspected 29-module source and original entrypoint required.")
old="const notion=notionClient({token:env.NOTION_API_KEY,dataSourceId:'32b2aad7-d30e-8056-b178-000b8143dc48'});"
new="const baseNotion=notionClient({token:env.NOTION_API_KEY,dataSourceId:'32b2aad7-d30e-8056-b178-000b8143dc48'});\n const notion=env.ASSESSMENT_INVESTOR_LINK_ENABLED!=='false'?withInvestorProfileLink({notion:baseNotion,token:env.NOTION_API_KEY,investorDataSourceId:'0c8ed56c-8c78-40ba-9f44-b8e8c97d0aec'}):baseNotion;"
text=raw.decode("utf-8")
if text.count(old)!=1: raise SystemExit("Exact runtime anchor missing or ambiguous.")
candidate="import {withInvestorProfileLink} from './assessment-investor-link.mjs';\n"+text.replace(old,new)
module=pathlib.Path(__file__).resolve().parents[1]/"cloudflare"/"assessment-investor-link.mjs"
if not module.is_file() or (root/module.name).exists(): raise SystemExit("Missing candidate module or destination already exists.")
runtime.write_text(candidate)
shutil.copyfile(module,root/module.name)
for name,digest in original.items():
    if name!=runtime.name and hashlib.sha256((root/name).read_bytes()).hexdigest()!=digest:
        raise SystemExit("Unexpected change to original module.")
print(json.dumps({"state":"prepared-not-deployed","unchanged_original_modules":28,"modified_original_module":runtime.name,"added_module":module.name,"entrypoint":"act48-with-hmo.mjs","activation_flag":"ASSESSMENT_INVESTOR_LINK_ENABLED","default":"enabled-with-safe-review-fallback"}))
