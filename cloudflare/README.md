# ACT-882: Cloudflare HMO Step 5 sender

This isolated Worker module is **not deployed**. It is intended for integration into the ACT-48 Cloudflare Workers + D1 environment, without modifying existing booking/assessment routes. The central property-processing system must map approved canonical Notion/Deal Register property figures to the approved HMO JSON format. The sender does not read Notion on its own.

## Integration
- Integrate `cloudflare/hmo-step5-worker.mjs` into a separately routed Cloudflare Worker, or mount its `fetch` handler at `POST /internal/hmo-draft` behind the existing ACT-48 service. Keep other Worker handlers unchanged.
- Set two Worker **secrets**: `HMO_INTAKE_TOKEN` (a randomly generated internal bearer credential known only to the trusted Step 5 orchestrator) and `GITHUB_HMO_TOKEN` (a least-privilege GitHub token allowed to trigger repository dispatch). Never commit secrets, log them, or expose this route directly to browsers.
- Trusted orchestrator submits JSON `{ "approved_step": 5, "finance_qa": "approved", "property": <fully verified HMO generator schema> }`. The approval flags are asserted by the authorised upstream process and are not independently proven by this Worker.
- The Worker validates payload shape and management arithmetic, then sends GitHub `repository_dispatch` event `pk_hmo_analyser_step5`. Success returns HTTP 202. GitHub generates a draft artifact only. No public route is deployed.
- **Before production:** server-side identity and approved-data binding, idempotency/D1 run ledger, replay protection, handling duplicate existing property codes, independent cost reconciliation, external end-to-end dispatch test, and deployment/cutover acceptance are required. Do not enable public triggers on untrusted approval booleans. Publishing remains a separate QA-controlled step.
- St Helens is the canonical design and a regression reference, **not** a new property code to generate.

Test locally with `node --test tests/hmo-cloudflare-worker.test.mjs`. GitHub Actions checks the same contract on pull requests.

Governance: [ACT-882](https://app.notion.com/p/4002aad7d30e81b58cdcef77f80c3558) and Cloudflare migration [ACT-48](https://app.notion.com/p/32f2aad7d30e81e489a7deeee800eb95). No Pipedream work.
