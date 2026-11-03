# HMO review template parity, 3 November 2026

Scope: eight owner-approved changes on `test/hmo/2S98D/` and `test/hmo/5NG2E/` only. The upgraded South Shields BTL page is a presentation reference. Production property pages and root are unchanged.

1. SDLT input `sdltStandardInput` is standard tax. `sdltHigherInput` now stores **only** the separate additional-dwelling surcharge, default asking price × 5%. `sdltSurchargeChoice` includes/excludes that surcharge. Stamp = standard + selected surcharge. Both inputs retain manual overrides; selected stamp enters capital once, before contingency. Existing default stamp/capital amounts are preserved.
2. Coventry now has five room rows and monthly/annual columns. The source PDF p3 confirms five bedrooms and aggregate £2,575 pcm / £30,900 pa, but supplies no room-level allocation. Null room rents display **TBA** in monthly and annual room cells, on screen and in the optional PDF breakdown, never zero or a fabricated equal split. This wording was requested by Hanna during test review on 3 November 2026. The aggregate financial rent is preserved. St Helens' existing seven evidenced room entries are unchanged.
3. `op.service_charge` and `op.ground_rent` are added to each page's semantic cost registry. Both default blank, contribute no assumed amount and print Not confirmed. A manually entered annual amount contributes once to costs, reduces annual profit by that amount and flows into ROI. These amounts are excluded from capital. St Helens is leasehold according to Pipeline; old raw zero inputs are not treated as independently verified nil. Coventry source says freehold; no leasehold charge is invented.
4. St Helens `op.hmo.gas_servicing` defaults to £120, already present in Deal Register column CB row 30. It is separate from £366 repair cover; conditional applicability and inclusive service duplication require confirmation. `op.accounting` uses the governed PK HMO £300 planning default. These increase the test page's annual costs by £420 to £21,756.72; they are editable model assumptions, not verified bills. No cost is hidden in Other costs. Coventry retains its existing gas servicing/accounting values and £20,055 total.
5. Only the specified extra Deal Clinic paragraph is removed from each SCORE reminder. The preceding SCORE explanation, VALUE controls and existing lower Submit a question CTA remain.
6. Coventry gains the optional room-rent PDF page 3. Default PDF is two pages; selected option produces three pages. Both screen and PDF explicitly retain unconfirmed room rents. Risk acknowledgement gates all financial and printable content and resets on refresh.

## Field and formula mapping

| Semantic ID/control | Canonical existing field | Formula effect |
| --- | --- | --- |
| op.service_charge | Pipeline Service Charge pa; Deal Register AH | Add annual amount once to operating-cost sum |
| op.ground_rent | Pipeline Ground Rent pa; Deal Register AI | Add annual amount once to operating-cost sum |
| op.accounting | Pipeline Annual Accounting / Admin Cost; Deal Register AJ | Add annual amount once to operating-cost sum |
| op.hmo.gas_servicing | Pipeline HMO Gas Safety / Boiler Servicing pa; Deal Register CB | Add annual amount once to operating-cost sum |
| sdltSurchargeChoice | Review-page scenario control | Stamp = standard + (include ? surcharge : 0) |
| includeUnitPage | Review-page print control | Optional third page; no effect on rent/capital/costs |

Operating costs remain `sum(Object.values(readOperatingCosts()))`. Annual profit = annual rent − annual costs − mortgage interest. ROI = annual profit / capital × 100. Stress reset reads the updated cost sum; stress controls remain independent editable scenarios. No new Pipeline fields or canonical workbook columns are required. This is a test-only interface update; it does not certify or close the separately recorded Pipeline/Deal Register financial reconciliation findings.

Acceptance covers default and edited SDLT, manual overrides, blank leasehold costs, individual annual costs/ROI, registration blanks, removal scope, room data, acknowledgement reset, widths 320/390/430/1280, two/three-page PDFs and clipping. Existing licensing-field regression must also pass. Exact candidate/commit, workflow, live HTTP and visual evidence are recorded in ACT-882 and the change request after validation.
