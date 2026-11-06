# ACT-900: 2027 survey production candidate

Status: DRAFT, NOT READY TO DEPLOY. No production deployment authorised by this note. Hanna requested notification when ready, holding live deployment for approval.

## Identity and source

Governing ACT: https://app.notion.com/p/4102aad7d30e81b2b6bffd2cc16e7d6a
Repository: inspiredhunter-hq/propertykickstart-investor-analyse
Candidate branch: release/survey-live-20261106
Base SHA: 6ad1461ee0eb4753f1de2236df5a755627cf7da6
Candidate commit and PR: link from ACT after candidate save; reconcile exact reviewed SHA before approval.
Authority: annual URL and survey launch scope approved in ACT. Current instruction holds actual deployment.

## Ready sweep

6 November 2026: query of HTML Registry Ready to Deploy returned four items. All DEFERRED, none belongs to the survey deployment unit: PKH Home (separate Hub site/footer); Hub 404 (explicitly deferred historical issue); Mortgage & Stress Test Calculator (separate site and QA); LHA Household Scenario Analyser (separate Hub tool). Four results, four dispositions. Repeat immediately before final release packaging.

## Manifest

- production/2027/index.html: single annual survey with production success and privacy link.
- production/privacy/index.html: survey-specific notice consistent with PK-OPS-POL-003 v1.5.
- production/404.html: new survey site's recovery page; no change to Hub 404.
- production/_redirects: root 302 to /2027/ and compatibility /survey routes.
- production/_headers: response security/cache headers.
- netlify.toml: retain default TEST publish; production publish only for dedicated release branch.
- cloudflare/investor-survey-worker.mjs: year/env scoped storage, CRM relation and scheduled pending reconciliation; generic public result.
- cloudflare/investor-survey.wrangler.toml: origin configuration and 15-minute reconciliation.
- tests/investor-survey-production.mjs: production contract tests.
- docs/survey-annual-rollover.md: reusable rollover procedure.
- This release note.

## Deployment units and prerequisites

Existing dedicated Worker: pk-investor-survey; deploy manually through .github/workflows/deploy-investor-survey-worker.yml selecting tested candidate ref. Do not touch ACT-48 Worker.
New production Netlify project: UNCREATED/UNVERIFIED. Connect exact candidate branch; verify effective publish directory production. Do not connect it to TEST project or overwrite root repository CNAME. Public domain survey.propertykickstart.co.uk. Verify Netlify target and any ownership TXT before recording DNS instructions. Preview hostname must be separately added to allowed origins as TEST if needed.
Secret names only: NOTION_API_TOKEN, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID. Vars LIVE_ORIGIN, ALLOWED_ORIGIN. No secret values stored here.

## Pre-deploy evidence and remaining gates

PASS local existing regression: landlord/non-landlord, contact/consent, optional professionals, typed fields/checkboxes, Unicode storage.
PASS production unit/contract tests: annual source/routing, syntax, unique/ambiguous/pending/anonymous matching, TEST exclusion, year/env retry partition, generic public errors, request limits, scheduled linking and unchanged investor consent.
BLOCKED browser preview: no installed local Chromium executable. Existing TEST mobile Chrome evidence does not prove changed production candidate.
OPEN actual Worker token access to Investors DB and relation writes, live staging integration and survey-first/assessment-later flow. Existing assessment schema relation is verified; actual assessment identity creation is not proven.
OPEN Netlify authenticated setup, effective production context, verified assigned domain, DNS/TLS and deployed staging preview.
OPEN full candidate browser/mobile/keyboard verification, release registry/PR reconciliation and final approval.
These blocks prevent a Passed readiness claim. Do not convert mock tests into live evidence.

## Ordered execution after gates pass

1. Reconcile candidate, ready sweep and release note; obtain required final approval.
2. Deploy tested Worker and verify TEST flow plus database permissions; cron must exclude TEST and never change marketing consent.
3. Publish isolated production Netlify site from exact reviewed SHA; verify directory/routing and stage before custom-domain exposure.
4. Configure verified survey hostname DNS and HTTPS. Root 302 must reach /2027/. /privacy/ and unknown-path recovery must work.
5. Verify controlled production submission saved as year2027/Testfalse, every dedicated field, anonymous path, unique/duplicate/pending linking, safe retry and consent independence. Mark controlled QA records appropriately afterwards.
6. Verify assessment completion links on same investor with one unique supplied email; do not assert this from relation schema alone.
7. Update DNS DB, HTML Registry, Public URL Register and Deployment record, including actual commit/deploy IDs and QA evidence. Close ACT only after required gates pass.

## Rollback and final summary

Worker rollback: redeploy 6ad1461ee0eb4753f1de2236df5a755627cf7da6 (TEST behavior only). First-launch frontend rollback: unpublish production project; keep TEST site and stored data. Preserve new additive properties. Annual rollback later: restore previous root302 and edition configuration.
Final release summary: pending; nothing deployed by this candidate preparation.
