# ACT-882 — public/owner parity and private add-on architecture

## Approved outcome (21 October 2026)
Deal Clinic attendees and all public viewers get the exact same public investor analyser for each property. Hanna gets those *same* public sections, inputs, outputs and visual layout, plus authenticated owner-only functionality (beginning with Stress Tests).

## Deployment boundary
- Public: `https://deals.propertykickstart.co.uk/{PROPERTY-CODE}/` and the separately governed SMART Deal homepage. Never replace the root or disturb historical property routes.
- Private: distinct owner-only protected origin, with the same canonical template and shared finance calculations, plus additional private modules.
- Public source, assets, bundles, print pages, metadata and client scripts must **never contain** owner-only features or private inputs, even hidden.
- Public GitHub Pages cannot serve the protected private origin or private source merely via a reverse-proxy login, as direct github.io or raw.githubusercontent.com links can bypass a superficial access layer.
- Separate secure private build, access-controlled host, authenticated requests and approved identity allowlist required. Enforce policy at the origin too, not only through DNS masking.
- Cloudflare Access is a proposed provider, not configured or verified. Confirm actual DNS provider, Cloudflare account, hosting and identity methods before deployment.

## Required shared experience
1. Same property code resolves same canonical property input object and formulas in both builds, with strategy-specific HA (Model 1/2), BTL, HMO and Dev policies.
2. Same risk acknowledgement and public SCORE, acquisition, operating cost, investment returns, income target and VALUE sections with consistent presentation.
3. Private build appends a clearly labelled owner-only Stress Tests section and future private diagnostic tools.
4. Sensitive scenarios are not stored in a public repository, page HTML, public JS bundles or public data APIs.
5. Authentication is tied to Hanna's verified account, not possession of an unguessable link. Public visitors receive no private URLs.
6. Public and owner reports printed or downloaded must differ only by appended owner-only modules.

## Release checks
- Verify domain, DNS, provider login and owner identity, use account-managed secret storage and no tokens in repo.
- Verify direct origin access fails unauthenticated; test access from a second browser/account, including static bundles and API endpoints.
- Verify Hanna login succeeds and owner stress tests compute governed outputs correctly.
- Verify public page checks pass for existing property URLs, root SMART featured page, and print/mobile/keyboard.
- Verify public/owner common finance outputs match; reconcile PK model and ACT-838 before go-live.
- Update Notion Pipeline, HTML Pages Registry, deployment evidence, recovery and ACT-882 upon successful verification.

## Current execution state
Architecture decision approved and recorded in ACT-882. This document is implementation design only. No private service deployed; no authentication configured; no owner-only protection verified. Do not merge/release unfinished PR #2 solely because this file exists.
