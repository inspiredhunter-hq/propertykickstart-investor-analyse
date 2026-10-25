#!/usr/bin/env node
// Build reproducibility test: canonical South Shields is the v1.0 baseline.
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root=resolve(new URL('../..',import.meta.url).pathname);
const dir=mkdtempSync(join(tmpdir(),'pk-btl-v1-'));
try{
 const output=join(dir,'index.html');
 const run=spawnSync(process.execPath,[resolve(root,'templates/btl-v1/build.mjs'),resolve(root,'templates/btl-v1/reference.south-shields.json'),output],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
 assert.equal(readFileSync(output,'utf8'),readFileSync(resolve(root,'BTL-NE-WLETS/index.html'),'utf8'),'BTL v1 template must reproduce the approved South Shields analyser exactly');
 const html=readFileSync(output,'utf8');
 assert.ok(html.includes('Sensitivity analysis'));
 assert.ok(html.includes('Equivalent properties required'));
 assert.ok(html.includes('Submit a question'));
 assert.ok(!html.includes('{{'),'Unreplaced field marker');
 console.log('PASS BTL v1.0 template golden-source parity');
}finally{rmSync(dir,{recursive:true,force:true})}
