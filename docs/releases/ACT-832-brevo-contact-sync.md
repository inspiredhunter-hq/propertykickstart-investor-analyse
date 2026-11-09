# ACT-832 Brevo contact sync (prepared, NOT deployed)

Status: prepared and tested. Not applied to production. Needs explicit approval from Hanna before any apply.

## What it does
After the Notion lead write succeeds, upserts one Brevo contact (slim fields only) and enrols it in list 34 "PK | Assessment Leads" only when consent evidence is current. Notion stays the full record; ASSESSMENT_RESPONSE_ID = the Notion PK Leads page id.

## Evidence found in the live Worker (09 Nov 2026)
- quiz-http-intake rejects any submission unless consentTextVersion = quiz-v1.5-2026-10-07; quiz-contract rejects unless consentGiven = true. So stored evidence always carries both.
- The form wording covers results and relevant property opportunities. The front end sends no UTM or referrer fields, so those Brevo attributes are not populated.

## Fields written to Brevo
FIRSTNAME, LASTNAME, SMS (only if valid E.164), LEAD_SOURCE=Assessment, LIFECYCLE_STATE=Assessment Completed, ASSESSMENT_RESPONSE_ID, ASSESSMENT_VERSION, ASSESSMENT_DATE, TEST_RECORD (test addresses only), and with consent: EMAIL_CONSENT, MARKETING_CONSENT_VERSION, MARKETING_CONSENT_DATE, list 34.
Not written: routing fields (ROUTE, PRIMARY_NEED, DESIRED_OUTCOME, BARRIER, SUPPORT_PREF, HUMAN_REVIEW, ROUTING_VERSION) until a routing engine exists. No answers, archetype or investor data.

## Safety
- Brevo failure never fails or repeats the Assessment (warns only). Notion failure means Brevo is never called. Never blacklists or unsubscribes. Sends no message.
- Kill switch: ASSESSMENT_BREVO_SYNC_ENABLED=false.

## Tests
tests/assessment-brevo-contact.mjs (8) plus tests/assessment-investor-link.mjs (10): 18 pass.

## Before apply (still to do)
1. Refresh deploy-assessment-link.py guards: live version bd0525b4-606c-4fb0-bc83-871dfc723c3b (rollback), 30 modules, runtime sha256 24bc3bac1a3087e3eae918d8a37d112bee1d40007245f226d0467029929245f5.
2. Run scripts/prepare-assessment-brevo-patch.py --expected-runtime-sha256 <above> on the fresh download (checked against the live runtime text: anchors match).
3. Hanna approves; apply; test with PropertyKickstartUK+BrevoAssessment_test1@gmail.com; confirm contact, list 34, no duplicate send.
