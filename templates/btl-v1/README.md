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
