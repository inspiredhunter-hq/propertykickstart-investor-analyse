# PK-OPS-TPL-002 — Survey V2 production release note
Release: 2026-11-09 — survey.propertykickstart.co.uk — 2027 Investor Survey V2
Status: PREPARING — NOT DEPLOYED
Owner approval: Explicit user instruction to complete fixes and deploy, 9 November 2026.
Governing survey specification: https://docs.google.com/document/d/1Cus0uOIo1s9_taNY9jT26FuJdJZzhVoEiV1GE1krQdQ/edit
Functional acceptance: https://github.com/inspiredhunter-hq/propertykickstart-investor-analyse/blob/feature/2027-survey-v2-review/docs/2027-investor-survey-evidence-review-2026-11-09.md

## Authoritative production destination
Notion PKH-43 https://app.notion.com/p/4112aad7d30e815e909dc55191511a45
Netlify project: pk-investor-survey
Previously deployed branch: release/survey-live-20261106
Previously deployed file: production/2027/index.html
Previously deployed Worker URL: https://pk-investor-survey.propertykickstartuk.workers.dev
Prior known deploy: https://app.netlify.com/projects/pk-investor-survey/deploys/6aef1cac340448a5ff9c8708
Production root / redirects to /2027/ via production/_redirects.
Registry notes custom hostname/DNS not yet verified; never assume public hostname works.

## Candidate manifest
- production/2027/index.html: 12-question V2 form based on user-tested TEST HTML, production canonical URL and Worker endpoint, no TEST download fallback, no TEST labels, is_test:false.
- cloudflare/investor-survey-worker-v2-production.mjs: 12-answer V2 validation and Notion mapping, Test response:false.
- production/_redirects: unchanged, remains on baseline branch.
- This release note.
- Deployment configuration / credentials: production Cloudflare Worker configuration still requires identification and validation.

## Nothing-left-behind sweep
PK HTML Pages Registry Ready-to-Deploy records inspected via Notion registry on 9 November 2026. Four records found; all DEFERRED from this survey-specific release:
- PKH-1 Home, hub.propertykickstart.co.uk, index.html: footer Tools link correction; defer to next justified Hub batch with PKH-2.
- PKH-2 404 - Page Not Found, hub.propertykickstart.co.uk, 404.html: defer to next justified Hub batch with PKH-1.
- Mortgage & Stress Test Calculator, mortgage.propertykickstart.co.uk, mortgage/index.html: defer to mortgage deployment, email delivery and QA pending.
- LHA Household Scenario Analyser, hub.propertykickstart.co.uk, deal-analyser/lha-scenario-analyser/index.html: defer to ACT-699/ACT-698 authenticated LHA release.
No survey record was flagged Ready to Deploy in the registry. Survey release remains separately owner-authorised; update its PKH record when ready.

## Outstanding gates — do not deploy until completed
1. Verify Netlify pk-investor-survey Git branch/build publish directory, confirm whether it is safe to promote candidate branch. The existing live release branch is not modified.
2. Verify production Cloudflare Worker deployment access, existing secret NOTION_API_TOKEN, CORS ALLOWED_ORIGIN, and exact database/schema.
3. Validate all 12-question mappings against production Notion properties, including Q3 timeframe and Q12 interest; TEST Worker received 401 on Notion lookup.
4. Execute static and integration tests on the exact candidate.
5. Complete Registry Ready-to-Deploy sweep and file manifest reconciliation.
6. Capture known-good frontend and Worker rollback versions and perform controlled coordinated deployment.
7. Verify live HTTP, mobile, all questions, CTA, consent and one real Notion record. Update DPL, PKH and ACT.

## Rollback
Revert Netlify to prior deploy 6aef1cac340448a5ff9c8708 or its corresponding known-good release branch/commit, and restore prior production Cloudflare Worker version. Confirm both services, not just frontend, after rollback.

## Production status
NOT DEPLOYED. No claim of live readiness or submission persistence.
