// ACT-832: slim Brevo contact sync for the Assessment. Notion stays the full record.
// Runs only AFTER the Notion lead write succeeds. Enrichment: a Brevo failure never loses an Assessment,
// is never retried against Notion, and never sends a message. List enrolment needs current consent evidence.
const CONSENT_VERSION = 'quiz-v1.5-2026-10-07';
const e164 = /^\+[1-9]\d{7,14}$/;
const day = value => { const t = Date.parse(value); return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null; };

export function buildBrevoContact({plan, pageId, listId}) {
  const evidence = plan.evidence?.answers ?? {};
  const email = typeof plan.properties?.Email?.email === 'string' ? plan.properties.Email.email.trim().toLowerCase() : '';
  if (!email) return null;
  const consent = evidence.consentGiven === true && evidence.consentTextVersion === CONSENT_VERSION;
  const attributes = {LIFECYCLE_STATE: 'Assessment Completed', LEAD_SOURCE: 'Assessment'};
  const first = plan.properties?.['First Name']?.rich_text?.[0]?.text?.content;
  const last = plan.properties?.['Last Name']?.rich_text?.[0]?.text?.content;
  if (first) attributes.FIRSTNAME = first;
  if (last) attributes.LASTNAME = last;
  const sms = plan.properties?.Mobile?.phone_number;
  if (typeof sms === 'string' && e164.test(sms.replace(/[\s()-]/g, ''))) attributes.SMS = sms.replace(/[\s()-]/g, '');
  if (typeof pageId === 'string' && pageId) attributes.ASSESSMENT_RESPONSE_ID = pageId;
  if (plan.evidence?.contractVersion) attributes.ASSESSMENT_VERSION = plan.evidence.contractVersion;
  const date = day(plan.evidence?.receivedAt);
  if (date) attributes.ASSESSMENT_DATE = date;
  if (/\+brevoassessment_test/i.test(email)) attributes.TEST_RECORD = true;
  const body = {email, attributes, updateEnabled: true};
  if (consent) {
    attributes.EMAIL_CONSENT = true;
    attributes.MARKETING_CONSENT_VERSION = CONSENT_VERSION;
    if (date) attributes.MARKETING_CONSENT_DATE = date;
    body.listIds = [listId];
  }
  return {body, consent};
}

export function withBrevoContactSync({notion, apiKey, listId, fetchImpl = fetch}) {
  if (!notion?.writeLead || !apiKey || !Number.isInteger(listId)) throw Error('brevo_contact_configuration');
  async function send(body) {
    return fetchImpl('https://api.brevo.com/v3/contacts', {
      method: 'POST', redirect: 'manual',
      headers: {'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json'},
      body: JSON.stringify(body), signal: AbortSignal.timeout(10000)
    });
  }
  return {...notion, async writeLead(plan) {
    const result = await notion.writeLead(plan); // Notion failure propagates unchanged; Brevo is never attempted first.
    try {
      const built = buildBrevoContact({plan, pageId: result?.pageId, listId});
      if (!built) return result;
      let response = await send(built.body);
      if (response.status === 400 && built.body.attributes.SMS) { // an invalid or duplicate mobile must not block the contact
        const {SMS, ...attributes} = built.body.attributes;
        response = await send({...built.body, attributes});
      }
      if (![200, 201, 204].includes(response.status)) console.warn('assessment_brevo_contact_review', 'brevo_http_' + response.status);
    } catch { console.warn('assessment_brevo_contact_review', 'brevo_unavailable'); }
    return result;
  }};
}
