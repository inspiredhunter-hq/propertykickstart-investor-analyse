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

## Registration extension and renewal correction, 1 November 2026

Hanna requested blank registration amounts in both acquisition and operating costs. Add `acq.landlord_registration` (initial property-registration payment, when due) and `op.landlord_registration` (future annual renewal). No £60/£65 default and no automatic copying between the two inputs. Each is independently editable and appears in its matching printable breakdown. Initial cash requirement and a normal future operating year are distinct: do not describe the same prepaid registration period as a second year-one payment. A dated multi-year cashflow schedule is not introduced by these fields.

Current official England guidance, published 29 October 2026, confirms £65 per property annually, no VAT; landlord registration itself is free. Regional rollout starts 15 December 2026, with pro-rated initial charges disregarding days before 15 November 2027. Source: https://www.gov.uk/guidance/register-your-rental-property-service-guidance-for-landlords . Fields remain blank per Hanna's instruction; do not treat them as fees already payable at 1 November 2026 or automatically apply them to exempt supported accommodation.

Hanna also accepted that the Coventry licence term must not be assumed five years. Replace the property-specific (£937 ÷ 5) operating label with HMO licence renewal and use £937 as the normal annual renewal provision for the selected standard one-year application scenario. This is a correction of the existing renewal field, not an extra provision. Initial £1,571 application remains once in capital. Initial year payment and subsequent renewal are different periods; the annual operating illustration is not a dated first-year cash ledger. Longer-term eligibility remains to be checked, and later scenario changes must update the actual fee/term together. Source: https://www.coventry.gov.uk/licensing-regulation/hmo-licensing/7 .

Validation extension: both registration inputs start blank; initial registration changes capital/ROI and not annual costs; annual registration changes annual costs/cashflow/ROI and not capital; both are preserved in print; no inferred defaults. Preserve all permanent production routes until preview approval. Pipeline and workbook mapping remain a subsequent stage.
