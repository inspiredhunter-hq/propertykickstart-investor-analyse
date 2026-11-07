# ACT-900 Assessment identity link correction

Status: tested component, NOT DEPLOYED; public survey release remains held.
Canonical defect: https://app.notion.com/p/4102aad7d30e81e58820cc04ba326b9b
Read-only deployed-source evidence: https://github.com/inspiredhunter-hq/propertykickstart-investor-analyse/actions/runs/42282234778/job/128113907063
Inspection commit: 5db8c24f0b8f33c0799153c51e88ec54dc30f8a9. Source read succeeded; deploy job skipped. No credential/permission change, database write or customer message.

## Established root cause

Current quiz-live-runtime.mjs constructs notionClient with PK Leads data source32b2aad7-d30e-8056-b178-000b8143dc48. quiz-pipeline.mjs calls findContactIds and writeLead. notion-client.mjs queries only that Leads data source by email; lead-mapping.mjs has no Investor Profile property or Investors query. Thus Assessment can create/update Leads but cannot establish the Investor relation. Readiness15 is not a matching threshold: there is no Investor identity matching step at all.

Fresh source SHA256:
- quiz-consumer.mjs: 9f7d6eb91e9ce2253c389bf2ed163afbf33061082091413105117606de49308a
- quiz-pipeline.mjs: 9e6c09fd2e50c36cb62bc4d3cda7cb2755888f36b7c5f92bc94cefb791d2db6c
- quiz-live-runtime.mjs: dd516a0949998dbc9d41f38a46a04dbab085cda303838baa4e54c5dc3a34f900
- notion-client.mjs: 037a27a66b396708deed20b1ce5bbfc4c0419db70a83cba8ba93ab9775ba46a4
- lead-mapping.mjs: cb4493a6b9441592d3702b6ae51e3ba1fb089e8729c524d1e0449f49e7a13ce5

## Narrow candidate

assessment-investor-link.mjs decorates the existing lead writer. It normalises email; queries Investors data source0c8ed56c-8c78-40ba-9f44-b8e8c97d0aec; adds Investor Profile relation in the same existing lead write for exactly one match. Notion's existing reciprocal Quiz Lead relation should reflect that write. It does not write Investors, create profiles, promote/qualify a lead, change consent, or send messages. Duplicate/conflicting identities save lead answers with Contact Match Review true without guessing/overwriting a relation. Read/permission failures save the original Assessment once with Contact Match Review true and no guessed link. This enrichment fallback preserves intake and existing notification delivery. The Assessment integration's own Investors access must still pass actual post-deploy identity QA. The survey integration's successful access is not proof for this separate token.

Validation: node --test tests/assessment-investor-link.mjs:9/9 PASS. Mocked provider evidence only. Includes score15 identity match, no-match save, duplicates, preserved conflicting/existing relations, same-profile retry, pagination, upstream404 and malformed/incomplete query (these now preserve the Assessment with review flagged). This does not establish live access or complete integration.

## Remaining controlled integration and release

1. Retrieve complete fresh29-module source/settings and deployment/version identity again; retain safe rollback and hashes. Do not use old/incomplete PR26 source as the deployed base.
2. Apply prepare-assessment-link-patch.py to that fresh source, which verifies exact observed runtime SHA before changing it. Preserve28 other original modules byte-for-byte and add only assessment-investor-link.mjs. Keep entrypointact48-with-hmo.mjs, bindings, secrets, cron, booking/intake flags and HMO disabled state.
3. Integrate with the existing settings unchanged. ASSESSMENT_INVESTOR_LINK_ENABLED defaults enabled for this correction and may explicitly disable it with false; no new flag is required on deployment. Validate the existing Assessment Notion integration can read Investors and write the relation through actual post-deploy QA. No credential value in source/logs/chat. Finish actual release note/controlled deploy and rollback gates before changing shared live service.
4. Existing duplicate lead and notification idempotency behavior remains owned by existing pipeline. Run regression of actual current pipeline with decorator and ensure no second summary or team alert on retried accepted submission. Do not replay existing customer notifications to test.
5. Actual same-email synthetic Assessment must link automatically; independently read Leads Investor Profile and Investors Quiz Lead. Preserve Synthetic QA / Do Not Contact investor classification and consent. Mark QA Leads clearly; do not manually link as proof.
6. This corrects matching to an existing investor. It does not implement investor creation/promotion or a later investor-first association for historical Assessment Leads. Any wider lifecycle change needs its existing governance reconciled separately.
7. Only after full journey acceptance: reconcile ACT900/bug/HTML Registry/release evidence and notify Hanna ready. Public survey deployment requires her final go-ahead.

## Controlled backend release, 7 November 2026

Scope: source-only correction of pk-automation-staging. Public survey Netlify/domain/DNS release excluded and held. Existing reader/patch-preparation integration passed against current deployed pipeline in run42347403644 at4c049a652530b10b680a34137be2f55b61cdd9f9; 28 original modules unchanged, one runtime edited, one module added. Current rollback version778fb4ee-82d5-4e7c-856a-dc2cc6262a53 and deploymenteceeb991-d425-489d-a284-b212f6b85a0a independently read from Cloudflare. Compatibility2026-10-21, original bindings/secrets, enabled quiz intake/consumer and booking flags, HMO disabled preserved.

Safety refinement: lookup failures do not stop Assessment save or cause duplicate lead writes. Save once with Contact Match Review true, preserve existing relation, log only stable redacted code. Uncertain base lead writes propagate to existing ambiguity hold; never retried by decorator.10 component tests passed locally; exact candidate CI must run again before apply. Actual deployed delivery engine is exercised with two synthetic notification plans and a mocked ledger; accepted retry must not repeat either notification. No real messages sent by CI.

Manifest: cloudflare/assessment-investor-link.mjs, scripts/prepare-assessment-link-patch.py, scripts/deploy-assessment-link.py, tests/assessment-investor-link.mjs, .github/workflows/deploy-investor-survey-worker.yml, this release note. Candidate PR94, branchrelease/survey-live-20261106. Existing GitHub source is sole code home; no Drive package.

Nothing-left-behind sweep7November:4 ready records,4 DEFERRED: Home(separate Hub unit); Hub404(user deferred); Mortgage calculator(separate site); LHA scenario analyser(separate Hub tool). No HTML changes included in this backend unit. DNS not required, existing Worker hostname retained; no Netlify deployment. HTML/URL/DNS registries must not falsely record public survey launch.

Ordered apply: use exact tested branch with inspect_assessment=true, apply_assessment=false first. Fresh download and expected deployment/source hash guards required; prepare patch; all30 modules syntax-check; actual pipeline/notification idempotency; deployment script dry-run checks bindings/flags/schedules and exact reproducibility. After those pass and release record is Ready, dispatch same tested candidate with apply_assessment=true. It reruns all checks, then PUT source-only /content preserving configuration. Immediately compare all30 remote source hashes, original bindings/compatibility and schedules; record resulting deployment/version. No settings or secret mutation.

Rollback: existing immutable version778fb4ee-82d5-4e7c-856a-dc2cc6262a53 remains available; redeploy that version100% through Cloudflare deployment API or normal dashboard rollback, then verify health/source/settings. Original source/settings/schedule identity captured in CI. No data schema migration or deletion. Do not replay prior customer notifications.

Live QA: health200 and original quiz/booking flags; normal invalid Assessment still rejected; same-email synthetic actual Assessment links automatically; independently read both Notion relations; no consent/promotion changes; synthetic lead excluded genuine prospect metrics. If identity lookup cannot read Investors, save with review flag and hold survey launch while correcting integration access. Update canonical bug, ACT900 and ACT48, plus release record. Final release summary/deployment evidence pending; NOT a live or ready claim for public survey.
