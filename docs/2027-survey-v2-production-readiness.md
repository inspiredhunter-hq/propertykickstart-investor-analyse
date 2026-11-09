# Property Kickstart 2027 Survey V2 — Production Readiness
Date: 9 November 2026 | Status: HOLD — approval not requested yet

## Evidence and decision
- Functional survey testing accepted through user screenshots, two JSON exports and user confirmations. See `2027-investor-survey-evidence-review-2026-11-09.md`.
- Existing live endpoint: https://survey.propertykickstart.co.uk/2027/
- TEST endpoint: https://test.propertykickstart.co.uk/survey/
- TEST frontend GitHub path: `test/survey/index.html`; V2 Worker: `cloudflare/investor-survey-worker.mjs` on feature branch.
- TEST fallback export is not proof of database persistence.

## GitHub comparison performed
- V2 branch is 22 commits ahead and 6 behind main as checked on 9 Nov; do not merge blindly.
- Current main Worker and V2 Worker differ in question counts, Q3 timeframe and Q4–Q12 mappings.
- V2 branch includes TEST-only Wrangler config, manual TEST deploy workflow and hard-coded TEST Worker URL.
- Both reviewed Worker files use a Notion database ID and test response flag; do not deploy the TEST worker configuration or test flag to production.

## Critical production release gates
1. Identify and inspect the **actual production frontend source and deployment configuration**. It was not located at `survey/index.html` in this repository. Do not assume `test/survey/index.html` is the production path.
2. Identify the **actual production Cloudflare Worker** and its current deployed code, bindings, routes, rollback/version history, and credentials. GitHub main Worker is marked as a dedicated survey Worker with TEST defaults and `Test response: true`; it must not be treated as a verified live deployment.
3. Compare production and V2 response schemas: 12 answers, Q3 timeframe, Q4–Q11 shifted mappings, Q12 interest, ranking, optional free text, professional follow-up, consent and contact fields.
4. Verify the production Notion integration/database accepts the new property names and types, and that production records are correctly created. A TEST 401 cannot establish this.
5. Create a **production-specific frontend** pointing to the production Worker, without TEST branding or test-only download fallback, and with accurate completion/error states.
6. Create a **production-specific Worker/config** with appropriate CORS origin, `Test response: false`, correct DB and Notion schema mapping. Do not modify existing production Worker until release approval.
7. Prepare a deploy plan including the exact old deployment versions, backup/rollback instructions and one controlled live smoke test. Protect any real contact details.
8. Run static contract tests and review the exact production release diff.
9. Request explicit user approval of the release commit, Worker target and public URL **before deploying**.

## Recommended safe release sequence after approval
- Capture rollback references for both current production frontend and Worker.
- Deploy compatible production Worker and frontend in a coordinated, reversible change, avoiding mixed V1/V2 schema submissions.
- Make one controlled submission with non-sensitive TEST-labelled data and verify an actual Notion record, all 12 mapped answers and consent fields.
- Confirm public form and links, then monitor errors. Roll back both components if the submission path fails.

## Current status
- Survey functional acceptance: PASS.
- Production deployment source: NOT YET VERIFIED.
- Production Worker and Notion integration: NOT YET VERIFIED.
- Release artifact: NOT YET BUILT.
- Production deployment: NOT AUTHORISED.
