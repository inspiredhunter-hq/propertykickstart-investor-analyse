# ACT-882 — BTL and HA analyser parity: baseline audit (28 October 2026)

Status: **implementation started on non-production branch** `feature/act-882-btl-ha-parity-20261028`. Production pages must remain unchanged until financial and browser/PDF acceptance passes.

## Live route source inventory

| Live file | BTL/HA | Show pence | SDLT selection radio | Generic other operating costs ID | HMO-style annual EICR/EPC |
|---|---|---|---|---|---|
| `BTL-NE-WLETS/index.html` | BTL | Yes | No | No | N/A |
| `HA-SE-3FTDU/index.html` | HA | No | No | No | N/A |
| `HA-NW-9JSFK/index.html` | HA | No | No | No | N/A |
| `index.html` | HA homepage | No | No | No | N/A |

Snapshot assessed on GitHub `main` 28 October 2026; findings are source-level, not end-user browser verification. No automatic assumption that HMO-specific EPC/EICR items belong on BTL/HA.

## Approved cross-strategy implementation contract from St Helens HMO

1. Preserve existing routes, published values and financial model assumptions unless explicitly governed otherwise.
2. In all applicable sections use human-readable labels, right-aligned monetary fields, commas as thousands separators, no redundant currency suffixes within acquisition inputs, user-selectable pence display and 999,999 as the field-width benchmark. Preserve keyboard Select All/edit; mobile tapping should position cursor at right without overriding intentional selection.
3. SDLT default: higher rates for additional dwellings; calculated standard alternative selectable and both amounts manually editable. Only selected amount is included once in capital and PDF. Confirm mortgage/property strategy and acquisition model applicability before altering BTL/HA calculations.
4. Broker fee editable, default 1% of asking price until manually overridden; fee follows governed PK financial rules. Acquisition total at bottom of PDF list.
5. Generic editable **Other costs** annual operating expense default £0, unique stable `op.other_costs` field, included exactly once in OPEX / net cashflow / ROI / stress analysis and PDF.
6. PDF should show strategy-specific property header, selected SDLT only, contingency allowance and final capital-required row, and preserve portfolio/room details if applicable.
7. Maintain user acknowledgement, privacy and responsiveness on 320, 390, 430, 1280px; validate default and manually entered scenarios.

## Release execution sequence

- **BTL first**, since it already has the show-pence control: implement on this branch in coherent changes, add independent assertions, compare current-vs-new default figures (must reconcile), run browser/mobile/PDF tests, publish a test route for review.
- **HA next**: adapt relevant shared components to the two HA pages and homepage without transplanting HMO/BTL-specific numbers or assumptions, test each route and their interdependencies.
- Merge into main only with passing full public-analyser CI, bounded release record and user acceptance.

The St Helens HMO investor release is closed and is not part of this scope.
