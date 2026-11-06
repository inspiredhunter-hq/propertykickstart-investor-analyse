// Restricted diagnostic output: never print raw tail events, headers or data.
const {spawn}=require('node:child_process');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const child=spawn('npx',['--yes','wrangler@4.45.0','tail','pk-investor-survey','--format=json'],{stdio:['ignore','pipe','pipe']});
 let output='';child.stdout.on('data',b=>{output=(output+b).slice(-1000000)});child.stderr.on('data',()=>{});
 try{
  await delay(12000);
  const source=fs.readFileSync('tests/investor-survey-regression.mjs','utf8');
  const p=vm.runInNewContext('('+source.match(/const valid=(.*);\nconst validate/)[1]+')');
  p.submission_id=crypto.randomUUID();
  p.contact={name:'ACT-900 diagnostic QA',email:'act577-general-20261022@example.com',mobile:'',emailMarketing:false,whatsappInvite:false};
  const r=await fetch('https://pk-investor-survey.propertykickstartuk.workers.dev',{method:'POST',headers:{Origin:'https://survey.propertykickstart.co.uk','Content-Type':'application/json'},body:JSON.stringify(p)});
  const result=await r.json();console.log('Controlled QA submission HTTP',r.status,'saved',result.saved===true,'reference',p.submission_id);
  for(let n=0;n<20;n++){const found=output.match(/survey_investor_lookup_status[\s\S]{0,160}?Lookup unavailable \((\d{3})\)/);if(found){console.log('Investor database lookup upstream HTTP',found[1]);return;}await delay(1000);}
  console.log('No lookup status captured; inspect stored relation. No raw logs exposed.');
 }finally{child.kill('SIGTERM');setTimeout(()=>child.kill('SIGKILL'),1000).unref();}
})().catch(()=>{console.error('Diagnostic unavailable; no raw logs exposed.');process.exit(1)});
