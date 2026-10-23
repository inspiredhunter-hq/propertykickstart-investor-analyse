# ACT-882 / ACT-48 HMO Step 5 integration

## Status, 23 October 2026

Implemented and locally tested; **NOT deployed or live end-to-end verified**. No public analyser HTML changes. No Pipedream or Step 6 work.

`act48-with-hmo.mjs` wraps the **current** ACT-48 `booking-scheduled-worker.mjs`: all existing HTTP routes and scheduled work delegate unchanged. The additional private POST route is `/internal/hmo-draft`. Default `HMO_ENABLED` is absent/off. With HMO enabled the existing cron can select at most one eligible unclaimed HMO per invocation. This does not add/change the booking schedule.

Request body is **only** `{"pipeline_page_id":"<canonical Notion page UUID>"}`. Caller-supplied figures, arbitrary copy and approval booleans are rejected. The route authenticates a server-only bearer secret. The scheduled handler calls the same boundary internally; do not put this secret in Notion buttons, public browser code or URLs.

## Canonical source contract

Notion source: Property Deals Pipeline `fefec549-07c4-46a6-b932-cd05a38e0e92`. Workbook: [PK Deal Analysis & Investor Comparison](https://docs.google.com/spreadsheets/d/1lhOpKbAkwB_jBS5W8FMCYpr_s82Yz6XCX9uT8AYj6k0/edit), `Deal Register` tab. Header-keyed unformatted numeric/boolean reads, duplicate header/code detection, exact Notion record identity, live metadata bounds (maximum 2,000 rows / 128 columns). Never read PDF evidence fields as model values.

Mapping is executable in `hmo-canonical-mapping.mjs`:

- Asking price -> price; annual gross rent -> rent; `(1 - Deposit %) * 100` -> LTV; governed base interest -> 6%; management fraction -> percentage.
- Stamp/legal/governed brokerage/arrangement/survey remain separate. Refurbishment + furniture/setup + other acquisition -> `otherAcquisition` (previous generator omitted them).
- Cost 0 management; 1 maintenance; 2 void; 3 insurance; 4 licensing; 5 dedicated HMO gas/electricity/water/broadband sum; 6 council tax; 7 shared compliance/service/ground/admin/other plus all remaining dedicated HMO detailed categories; 8 boiler provision. Utilities is checked as a subtotal, not added twice. Full mapped total must equal Operating Costs pa.
- Fee must match the approved master formula `max(price * 2%, £3,000) * 1.2`; brokerage is 1% for financed purchases, zero for cash. Source brokerage never silently overrides governed PK brokerage. Cash excludes arrangement fee.
- Deposit, loan, capital, pre-finance surplus and 6% net profit independently recomputed; Pipeline capital and post-finance cashflow must reconcile within £0.02. All numeric blanks/errors/strings fail closed, including zero liabilities until explicitly populated. No guessed defaults for missing costs.
- Available HMO only; both workbook reconciliation states and both Pipeline reconciliation states must be one of Complete — Evidenced/Modelled/Mixed. Ranking Eligible must be boolean true. Nonempty Analysis Readiness must not contain review/incomplete/error/pending. No new approval vocabulary or worksheet state is written.
- Current master has one price for mortgage, fee and yields: a different Purchase Price is held for a later generator extension. Existing St Helens code is protected. Generated labels contain town/broad region/room count only; no address, postcode, notes or credentials.

## D1 delivery semantics

Apply additive `hmo-step5-schema.sql` to the **existing staging D1** only after access verification and backup. `AUTOMATION_DB` stays unchanged. Atomic unique property-code claim precedes GitHub dispatch. Identical accepted replay returns 202 without sending again. Changed payload/concurrent pending job returns 409. Timeout, non-204 response or lost acknowledgement remains sending/needs-review and never automatically redispatches. This is at-most-once automatic dispatch, not exactly-once workflow completion. A 202 proves dispatch acknowledgement only; inspect Actions/artifact before marking a draft complete. Operator reconciliation must inspect Actions before any manual ledger reset.

## Credentials and least privileges — not yet provisioned

Keep all values as encrypted Worker secrets; never commit, log or paste them into chat:

1. `HMO_INTAKE_TOKEN`: random internal bearer; only trusted Step 5 process/Worker.
2. `GITHUB_HMO_TOKEN`: expiring fine-grained token restricted to `inspiredhunter-hq/propertykickstart-investor-analyse`, Contents write (minimum permission for repository_dispatch). Prefer a short-lived installation credential if an approved GitHub App already exists; this code does not mint installation tokens. No org/admin/workflow permission. [GitHub endpoint requirements](https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event).
3. `HMO_NOTION_READ_TOKEN`: separate read-content-only Notion connection shared **only** with Pipeline. Existing ACT-48 Notion connection is for Leads/Bookings; do not broaden it or reuse it.
4. `HMO_GOOGLE_SERVICE_ACCOUNT`: dedicated service-account JSON, no domain-wide delegation; grant viewer access only to the canonical workbook. Code signs a 5-minute JWT requesting Sheets read-only scope; fixed Google token/API origins, no caller URL. No project roles or paid services required by this implementation. Account creation/access grants and source acceptance remain pending.

Deployment credential: replace expired token with short-lived access to **pk-automation-staging only**, plus only the staging D1 access needed to apply/check this migration. Do not grant zones/DNS, account administration, unrelated Workers or production databases. Existing token verification returned Cloudflare code 1000 Invalid API Token. Browser automation was unavailable; no new access was granted.

## Safe staging release procedure — still outstanding

1. Restore Cloudflare dashboard/API access; verify current Worker source/settings/version, all bindings, triggers and latest booking/assessment health. Existing staging handles live traffic: do not overwrite it with an old local backup. Capture a rollback version without exposing secrets.
2. Obtain/verify the three provider credentials and internal bearer. Confirm least-privilege Notion read (Pipeline yes, unrelated page denied), Google workbook read and other-file denial, GitHub repo scope. Do not activate HMO yet.
3. Assemble this wrapper + HMO modules + **freshly downloaded current ACT-48 modules**. Change only entrypoint; preserve every binding, secret, flag, compatibility setting and cron. No automated upload script is supplied because current deployed source/settings cannot yet be authenticated and compared.
4. Apply additive D1 schema, deploy with `HMO_ENABLED=false`, verify health and existing assessment validation/booking scheduler plus unauthorised HMO denial. Record version ID and rollback test, without sending new booking/assessment messages.
5. Enable HMO only after source/provider acceptance. Test authorised ineligible real records -> held; inspect D1/no dispatch. A source-backed eligible *new* property is required for successful E2E; never relabel St Helens or Ilford as approved to obtain a green test. Verify GitHub job/artifact, replay, independent finance/browser/mobile/keyboard/two-page PDF QA. Publication is a separate controlled release; no public page changes here.
6. Verify all existing analyser routes/root and booking/assessment controls. Record exact expected/actual/evidence/status in ACT-882 and ACT-48. Disable only HMO flag for rollback; retain D1 ledger to prevent duplicate sends. Never disable bookings/assessment to install this change.

## Observed source holds

Deal Register row 30 / PKD-54 St Helens: Review required; cost and capital reconciliation Needs Review; Ranking Eligible false. Existing note records £688.32 annual operating-cost discrepancy; prior capital includes £5,400 fee versus master formula £5,280. Do not change source figures/approval to bypass this hold. Existing page remains untouched.

Row 39 / PKD-118 Ilford: Review required; operating Needs Review, capital incomplete; bills Not Confirmed; source room count conflict. Both fail the new draft gate. No eligible real HMO was evidenced for an end-to-end success test.

Observed live health: HTTP 200, databaseReady/intakeEnabled/bookingSyncEnabled/quizConsumerEnabled/schedulesEnabled all true. This establishes pre-change health, not post-deployment acceptance.

## Tests

Node 24: `node --test tests/hmo-cloudflare-worker.test.mjs`. Python: `python -m unittest discover -s tests -p test_hmo_generator.py -v`. Local SQLite exercises actual schema constraints and concurrent claims; mocked providers test uncertain-delivery holds. These do not substitute for remote D1/provider/browser acceptance.
