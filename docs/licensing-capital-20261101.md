# Licensing capital fields: review candidate

Governing instruction: Hanna, 1 November 2026. Specification under ACT-838; analyser presentation programme ACT-882. This is a bounded modification of the existing HMO analyser, not a new architecture.

## Scope

Add three editable amounts to Section 2 acquisition costs: HMO licence application fee; Additional licensing fee; Selective licensing fee. Stable identifiers are `acq.hmo_licence_application`, `acq.additional_licensing`, `acq.selective_licensing`. Include applicable entered amounts once in pre-contingency capital, existing contingency calculation, suggested capital, cash ROI and stress ROI. Include all three named rows in the printable acquisition breakdown. Blank amounts remain blank and print as Not confirmed. No extra renewal provision, agent-continuity controls or explanatory section.

## Candidate and test deployment

- St Helens presentation master candidate: `HMO-NW-2S98D/index.html` on the feature branch only, pending preview acceptance.
- Isolated public review routes: `/test/hmo/2S98D/` and `/test/hmo/5NG2E/`.
- Coventry migration: the existing £1,571 amount moves from Other acquisition costs to HMO licence application fee. This is a reclassification, not an additional fee or newly verified council quote. Original totals must remain unchanged.
- Existing operating costs, renewal provisions and production routes remain unchanged by test deployment.
- Shared CSS/JS use root-relative paths in the nested test routes.

## Verification

`node scripts/check-licensing-capital.mjs` tests both review pages: each fee independently and combined, pence/comma input, contingency at 10% and 0%, cash purchase, unchanged cashflow and operating costs, revised ROI/stress ROI, Coventry migration, print labels, two-page PDF, 320/390/430/1280px, acknowledgement gate and reset. Results and PDFs/screenshots are CI artifacts. The current existing HMO regression suite remains relevant to the production master on its feature branch.

## Release boundary and rollback

Test-only publication is authorised by the existing mandatory preview plan. No permanent property route or root homepage may change until the exact candidate is reviewed and approved under PK-OPS-TPL-002. The test publication manifest comprises the two test HTML files, browser test script, dedicated CI workflow and this note; shared dependencies already exist. Revert that test-only commit to remove the previews. The master candidate remains separate until acceptance.

## Next: Deal Analyser and Pipeline

Read-only discovery found the Deal Register has one Other Acquisition / Setup column W, Total Capital Required X (`SUM(N:W)`), and a separate Licensing pa column AG. Pipeline has Other one-off acquisition or setup costs, HMO Licence Cost pa, and Annual Compliance and Licensing Costs. No equivalent three separate acquisition fee inputs were identified in the fetched schema. Plan three named acquisition input fields in each canonical source and extend capital/ROI/payback mappings, keeping annual licensing unchanged. Reclassify any existing provision out of Other costs to avoid counting it twice. Exact formula dependency and cross-strategy treatment remain to be reconciled before schema/workbook changes. No Pipeline or workbook values/formulas have been modified by this candidate.
