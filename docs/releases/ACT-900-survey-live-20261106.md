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

## Staging readiness evidence, 6 November 2026

- Isolated Netlify preview: https://pk-investor-survey-preview.netlify.app/2027/ ; project pk-investor-survey-preview. Initial deploy6aede111837f43046b770227 at b9bb21e. Only staging site created; no custom public domain/DNS attached.
- Root HTTP302 /2027/, compatibility /survey/ HTTP302 /, privacy HTTP200, unknown path HTTP404; X-Frame-Options DENY confirmed. Friendly404 and privacy viewed in browser.
- Full actual preview landlord submission saved response4102aad7d30e81cd9fd7e13c9dd080c3 with TESTtrue, year2027, Solicitors/Bookkeepers/Othertrue, Mortgagefalse, optional Other blank, marketingfalse, WhatsApp invitationtrue. Confirmation clean, Assessment CTA one box and targetblank. No messages sent.
- Responsive QA and both Node suites passed in run42234037941 at a809aa1; screenshots retained as survey-responsive-evidence artifact. Widths320/375/768/1366: matching stacked contact fields, no horizontal overflow, wrapped single Assessment CTA, optional WhatsApp new-tab note and uninterested CTA omission.
- Actual dedicated survey TEST backend deployed branch5b2d75d in run42232818393, then redacted diagnostic revision343381a in run42235613725. Public survey hostname remains unlaunched.
- Controlled public-origin synthetic QA request saved but failed Investor relation. Redacted same-token upstream lookup returned HTTP404 in run42235613725. Database ID exists and Email type=email verified via connected Notion. Missing integration access is likely, not yet confirmed through connection settings.
- Canonical blocker: https://app.notion.com/p/4102aad7d30e81b3afa1e19d2abbae60 . Keep launch held. Notion web settings need authentication; Microsoft sign-in route was declined and stopped. Existing connector cannot inspect/grant service connection access.
- Controlled diagnostic responses4102aad7d30e81038143fe8f6956fe99 and4102aad7d30e814e9766df481279939b relabelled TESTtrue after capturing origin classification evidence; no investor relation or consent changed.
- Diagnostic tail captured404 then its process did not exit; cancelled diagnostic run after evidence. Process-group cleanup fixed in candidate1843970; no production promotion. A cancelled run is not full release success.
- Manifest additions since initial draft: .github/workflows/deploy-investor-survey-worker.yml (QA-only default and explicit diagnostic option), tests/investor-survey-browser.cjs, tests/survey-lookup-diagnostic.cjs. Public frontend remains byte-for-byte b9bb21e.
- Supersedes earlier local-browser blocker: browser QA now passed through GitHub Actions. Investor read permission and real survey/assessment linkage remain OPEN, as do final release/registry reconciliation and approval. Do not mark READY.
