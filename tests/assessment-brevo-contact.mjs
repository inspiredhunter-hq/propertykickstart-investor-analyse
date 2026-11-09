import test from 'node:test';
import assert from 'node:assert/strict';
import {withBrevoContactSync, buildBrevoContact} from '../cloudflare/assessment-brevo-contact.mjs';
const V = 'quiz-v1.5-2026-10-07', PAGE = '4102aad7-d30e-8170-95df-df6993b6fe17';
const plan = (answers = {consentGiven: true, consentTextVersion: V}, email = 'qa@example.invalid', mobile = '+447700900123') => ({state: 'ready', operation: 'create', properties: {
  Email: {email}, 'First Name': {rich_text: [{text: {content: 'Ann'}}]}, 'Last Name': {rich_text: [{text: {content: 'Tester'}}]}, Mobile: {phone_number: mobile}},
  evidence: {contractVersion: 'investor-v1.5-migration-draft', receivedAt: '2026-11-09T15:00:00.000Z', answers}});
function harness(statuses = [201], base) {
  const calls = [], writes = [];
  const client = withBrevoContactSync({apiKey: 'fixture-only', listId: 34,
    notion: base ?? {findContactIds: () => {}, writeLead: async p => {writes.push(p); return {pageId: PAGE};}},
    fetchImpl: async (url, o) => {calls.push({url, body: JSON.parse(o.body), headers: o.headers}); const s = statuses.shift() ?? 201; if (s instanceof Error) throw s; return new Response(null, {status: s});}});
  return {client, calls, writes};
}
test('consented lead: upsert with slim fields, list 34, links back to the Notion page', async () => {
  const h = harness(); const r = await h.client.writeLead(plan());
  assert.deepEqual(r, {pageId: PAGE}); assert.equal(h.writes.length, 1); assert.equal(h.calls.length, 1);
  const b = h.calls[0].body; assert.equal(b.email, 'qa@example.invalid'); assert.equal(b.updateEnabled, true); assert.deepEqual(b.listIds, [34]);
  assert.deepEqual(b.attributes, {LIFECYCLE_STATE: 'Assessment Completed', LEAD_SOURCE: 'Assessment', FIRSTNAME: 'Ann', LASTNAME: 'Tester', SMS: '+447700900123',
    ASSESSMENT_RESPONSE_ID: PAGE, ASSESSMENT_VERSION: 'investor-v1.5-migration-draft', ASSESSMENT_DATE: '2026-11-09', EMAIL_CONSENT: true, MARKETING_CONSENT_VERSION: V, MARKETING_CONSENT_DATE: '2026-11-09'});
  assert.equal(h.calls[0].headers['api-key'], 'fixture-only');
});
test('no consent evidence: contact saved, never enrolled, no consent attributes', () => {
  for (const answers of [{}, {consentGiven: false, consentTextVersion: V}, {consentGiven: true}, {consentGiven: true, consentTextVersion: 'old'}]) {
    const built = buildBrevoContact({plan: plan(answers), pageId: PAGE, listId: 34});
    assert.equal(built.body.listIds, undefined); assert.equal(built.body.attributes.EMAIL_CONSENT, undefined); assert.equal(built.body.attributes.MARKETING_CONSENT_VERSION, undefined);
  }
});
test('test email is flagged TEST_RECORD, real email is not', () => {
  assert.equal(buildBrevoContact({plan: plan(undefined, 'PropertyKickstartUK+BrevoAssessment_test1@gmail.com'), pageId: PAGE, listId: 34}).body.attributes.TEST_RECORD, true);
  assert.equal(buildBrevoContact({plan: plan(), pageId: PAGE, listId: 34}).body.attributes.TEST_RECORD, undefined);
});
test('no routing, answer or investor-profile data is sent to Brevo', () => {
  const keys = Object.keys(buildBrevoContact({plan: plan(), pageId: PAGE, listId: 34}).body.attributes);
  for (const banned of ['ROUTE', 'PRIMARY_NEED', 'DESIRED_OUTCOME', 'BARRIER', 'SUPPORT_PREF', 'HUMAN_REVIEW', 'ROUTING_VERSION']) assert.ok(!keys.includes(banned));
});
test('invalid mobile is omitted; Brevo 400 retries once without SMS', async () => {
  assert.equal(buildBrevoContact({plan: plan(undefined, 'a@b.invalid', '07700 900123'), pageId: PAGE, listId: 34}).body.attributes.SMS, undefined);
  const h = harness([400, 204]); await h.client.writeLead(plan());
  assert.equal(h.calls.length, 2); assert.ok(h.calls[0].body.attributes.SMS); assert.equal(h.calls[1].body.attributes.SMS, undefined);
});
test('Brevo outage or error never fails the assessment or repeats the Notion write', async () => {
  for (const statuses of [[500], [new Error('net')], [401]]) { const h = harness(statuses); const r = await h.client.writeLead(plan()); assert.deepEqual(r, {pageId: PAGE}); assert.equal(h.writes.length, 1); }
});
test('Notion failure propagates and Brevo is never called', async () => {
  const h = harness([201], {writeLead: async () => {throw Error('notion_outcome_uncertain');}});
  await assert.rejects(h.client.writeLead(plan()), /notion_outcome_uncertain/); assert.equal(h.calls.length, 0);
});
test('missing page id still upserts without the link attribute; bad config rejected', async () => {
  const h = harness([201], {writeLead: async () => ({})}); await h.client.writeLead(plan());
  assert.equal(h.calls[0].body.attributes.ASSESSMENT_RESPONSE_ID, undefined);
  assert.throws(() => withBrevoContactSync({notion: {writeLead() {}}, apiKey: '', listId: 34}), /brevo_contact_configuration/);
});
