#!/usr/bin/env node
// ACT-882 pre-release static checks. Run: node scripts/check-analyser-parity.mjs
import fs from 'node:fs';
import assert from 'node:assert/strict';
const pages = [
  ['Maidstone SMART home', 'index.html'],
  ['Maidstone HA', 'HA-SE-3FTDU/index.html'],
  ['Preston HA', 'HA-NW-9JSFK/index.html'],
  ['South Shields BTL', 'BTL-NE-WLETS/index.html'],
  ['St Helens HMO', 'HMO-NW-2S98D/index.html'],
];
const read = path => fs.readFileSync(path, 'utf8');
for (const [name,path] of pages) {
  const html = read(path);
  assert.match(html, /<!doctype html>/i, `${name}: HTML document required`);
  assert.match(html, /Property Kickstart Investor Analyser/i, `${name}: investor analyser title required`);
  assert.match(html, /investment risk|investments can go down/i, `${name}: risk disclosure required`);
  assert.doesNotMatch(html, /private\.deals\.propertykickstart\.co\.uk/i,
    `${name}: never expose owner-only URL in public HTML`);
  assert.doesNotMatch(html, /Show my analysis tools|Hide my analysis tools/i,
    `${name}: never expose an owner-only control to public visitors`);
  console.log(`PASS: ${name} retained`);
}
for (const [name,path] of pages.filter(([,path])=>/^(BTL|HMO)-/.test(path))) {
  const html = read(path);
  assert.match(html, /id="managementRate"/, `${name}: editable management percentage missing`);
  assert.match(html, /id="pkfee"[^>]*readonly/, `${name}: PK fee must be read-only`);
  assert.match(html, /5\. Income Target Comparison/, `${name}: separate target section missing`);
  assert.match(html, /<textarea id="notes"/, `${name}: notes must be multiline`);
  for (const id of ['pkfee','managementRate','targetOut','differenceOut']) {
    assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,
      `${name}: expected exactly one #${id}`);
  }
  console.log(`PASS: ${name} staged layout checks`);
}
for (const [name,path] of pages.filter(([,p])=>p === 'index.html' || p.startsWith('HA-'))) {
  const html = read(path);
  for (const phrase of [
    '2. Acquisition and finance illustration',
    '4. Illustrative Investment returns',
    '5. Income Target Comparison',
    '6. Stress tests and financing scenarios',
    '7. VALUE',
  ]) assert.ok(html.includes(phrase), `${name}: section missing ${phrase}`);
  assert.equal((html.match(/id="incomeComparison"/g)||[]).length,1,
    `${name}: target output should have one target location`);
  console.log(`PASS: ${name} HA-compatible section checks`);
}
console.log('Static source checks passed. NOT a live deploy, financial, visual, owner-login or unauthorised-access test.');
