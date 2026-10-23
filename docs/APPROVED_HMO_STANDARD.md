# Approved HMO Standard: future property generator

**Governing decision:** ACT-882, 23 October 2026. St Helens `HMO-NW-2S98D/index.html` is the approved HMO investor analyser presentation master. Do not copy its financial values into other properties.

## Create a new HMO draft

1. Obtain a unique HMO property code and approved, property-specific figures from the Property Deals Pipeline and canonical Deal Register. Do not progress to enrichment.
2. Prepare a JSON file using the full fields below (numbers are examples of **format only**, not approved figures for another property).
3. Run `python3 scripts/new_hmo_analyser.py path/to/property.json`.
4. This creates `PROPERTY-CODE/index.html` **as an unapproved draft**, refuses to overwrite an existing route and uses the current approved St Helens HTML as the UI source.
5. Validate property identity, spelling, strategy, per-field values and cost provenance. Reconcile all calculations independently against governed PK model. Any changes to source master require re-validation.
6. Follow existing governed release packaging and production acceptance, including responsive tests, mobile accessibility, HTML script errors, two-page A4 PDF, all site routes and SMART homepage preservation. Do not publish merely because a draft was generated.

```json
{
  "property_code": "HMO-NE-EXAMPLE",
  "town": "Example Town",
  "region": "North East",
  "room_description": "Six lettable rooms",
  "headline": "Example investment: what could an investor keep?",
  "financials": {
    "price": 200000, "rent": 30000, "ltv": 75, "rate": 6,
    "stamp": 11500, "legal": 2500, "broker": 2200,
    "arrangement": 1999, "survey": 500, "managementRate": 12,
    "cost-0": 3600, "cost-1": 2400, "cost-2": 2400,
    "cost-3": 500, "cost-4": 230, "cost-5": 4800,
    "cost-6": 2100, "cost-7": 3000, "cost-8": 366
  }
}
```

The example is **not an investment illustration** and must never be deployed. All numerical values are placeholders. The generator does not check source evidence, stamp duty policy, financing suitability or current offers: financial reconciliation and release QA remain mandatory. Never give public access to owner-only stress testing through static GitHub Pages.
