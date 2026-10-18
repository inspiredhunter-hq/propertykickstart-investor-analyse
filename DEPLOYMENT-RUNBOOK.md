# SMART Deal Investor Analyser — technical repository reference

**Governing publication rules and approvals:** [Notion MDI-245 · Property Kickstart Standing Instructions — SMART Deal of the Week](https://app.notion.com/p/3fd2aad7d30e81dbb10fff03a498f190).

**Cross-property content SOP:** [Notion PK-MKT-SOP-005](https://app.notion.com/p/3b32aad7d30e813dac4ce1b35248a248).

**Implementation tracker:** [ACT-861](https://app.notion.com/p/3f52aad7d30e8147a5eef330d6ea062e) and [ACT-838](https://app.notion.com/p/3e12aad7d30e811ea65be6a0e3ec63cd).

## Repository components

- `index.html` — featured property homepage at https://deals.propertykickstart.co.uk/
- `HA-SE-3FTDU/index.html` — permanent Maidstone analyser.
- `config/featured-deal.json` — prebuilt property pages and explicit release/availability gates.
- `scripts/promote-featured.mjs` — Notion-sourced, fail-closed homepage promotion.
- `.github/workflows/publish-featured.yml` — periodic publication check and promotion.
- `scripts/check-readiness.mjs` — read-only newsletter readiness report.
- `.github/workflows/check-readiness.yml` — recurring readiness checks and GitHub issue update/alert.
- `staging/HMO-NW-2S98D/property-inputs.json` — North Road facts for HMO analysis, NOT a released analyser.

## Connection requirements

GitHub Actions secret: `PK_NOTION_READ_TOKEN`. The read-only integration must have access to the PK Content Library and Deals Pipeline. The secret must never be committed, logged or shared.

## Technical release evidence

- [GitHub Actions](https://github.com/inspiredhunter-hq/propertykickstart-investor-analyse/actions)
- [Readiness issue](https://github.com/inspiredhunter-hq/propertykickstart-investor-analyse/issues/1)
- [PK HTML Pages Registry](https://app.notion.com/p/4422426b15bc4dc1a0282924d16cd961)
- [Production asset archive](https://drive.google.com/drive/folders/1zMVcbqM-iabXsum-ZWpHjvpxzAp1cF86)

This file is a technical map only. Do not maintain editorial rules, publication schedules, approval procedures, or property withdrawal policies here. Follow the linked Notion control documents.
