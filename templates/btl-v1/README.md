# Property Kickstart BTL Investor Analyser Standard v1.0

**Approved reference:** South Shields `BTL-NE-WLETS`. Only BTL uses this template; do not treat it as an HMO/HA model.

## Files
- `index.template.html`: approved seven-section source with named `{{FIELD}}` tokens.
- `reference.south-shields.json`: populated golden reference configuration (not generic defaults for other deals).
- `build.mjs`: validates required fields, basic number ranges, cash-flow assumption consistency, and generates the property-specific HTML.
- `test.mjs`: verifies generation matches South Shields production HTML byte-for-byte.

## Usage
```sh
node templates/btl-v1/test.mjs
node templates/btl-v1/build.mjs path/to/your-property.json BTL-EXAMPLE/index.html
```

Begin by copying the reference JSON to a **new property-specific configuration**, then replace every field with verified property data or an explicitly recorded modelling assumption. South Shields values must NEVER be presumed correct for the new property. See the **BTL field dictionary** tab of the controlled Investor Analyser Google Sheet.

**Mandatory release checks:** unique property code; location/asking price/rent factual verification; deposits, PK fee, stamp and acquisition capital, operating costs, annual/monthly cashflow and ROI reconciled; interest/stress scenarios; SCORE/VALUE, notes, form CTA and privacy; working desktop/mobile interactions; exact two complete A4 PDF pages including investor decision and notes; no changes to unrelated property URLs or homepage.

Template edits and departures require explicit approval and a recorded version change. A passing golden-parity test proves only reference reproducibility, not correctness of a new property's data or calculations. The future Elite-only sensitivity gate requires genuine authorization and is NOT implemented by the template.

## Evidence-aware Pipeline mapping (pre-release)
`from-pipeline.mjs` takes a **retrieved Notion Property Deals Pipeline record JSON** and a **property-specific, approved assumptions JSON** and writes the 36-value configuration consumed by `build.mjs`.

```sh
node templates/btl-v1/from-pipeline.mjs private/pipeline-btl.json private/approved-btl-assumptions.json private/btl-config.json
node templates/btl-v1/build.mjs private/btl-config.json BTL-PROPERTY-CODE/index.html
node templates/btl-v1/test-pipeline.mjs
```

The approved assumptions file must contain `propertyCode`, `values` and `evidence`. Each absent financial input needs a value plus a meaningful, property-specific provenance note. `DISPLAY_ADDRESS` and `PROPERTY_DESCRIPTION` are deliberately approved explicitly to prevent publishing confidential or unverified property data. **Never place confidential Pipeline snapshots, personal data, or provisional assumptions in the public repository.** Runtime generation must consume validated private inputs in a trusted environment.

Property facts come from the authoritative Notion Pipeline: `Property Code`, `Town`, `UK Region`, `Asking Price`, and annual/monthly rent. Known optional financial property fields are used where actually populated. The South Shields Pipeline currently has the five basic facts but many cost/finance fields blank: those **cannot** be silently replaced by the golden reference property defaults. All missing inputs require governed PK assumptions and documented evidence. See the original Google Sheet, BTL field dictionary, for exact source-field mapping and evidence state.

This is **the validated transformation layer**, not yet an authenticated Notion API fetch: a secured Pipeline export/extraction step must supply the input JSON. GitHub CI validates golden sample and error handling; a complete end-to-end live Notion retrieval, per-property source audit and exact two-page iPhone PDF acceptance are separate release gates. No HMO work or public deployment occurs from this adapter.
