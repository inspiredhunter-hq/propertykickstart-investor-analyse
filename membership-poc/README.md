# ACT-884 | Coventry Membership Pilot — isolated development

Status: DEVELOPMENT BRANCH ONLY. No production or public test route changes authorised.

## Existing Coventry fixture

- Source file (unchanged): `test/hmo/5NG2E/index.html`
- Existing public review URL: https://deals.propertykickstart.co.uk/test/hmo/5NG2E/
- Production pages and the existing public review page must remain unchanged.
- GitHub Pages serves files from the public repository; its existing /test path is **not a security boundary**.
- The branch is a code-isolated development environment, **not yet a protected running staging site**.

## Proposed protected staging architecture

1. Public preview: static and non-confidential information only.
2. Authenticated session: Supabase Auth, verified email, session renewal/sign-out.
3. Server-side authorisation gateway: edge/server layer verifies the user before serving **any** private analyser HTML/assets/data. Proposed platform subject to verifying the domain/hosting account and access permissions.
4. Content storage: private storage or protected origin independent of public GitHub Pages. Do **not** publish the full protected payload in this public repository, its branch artefacts or a public static bundle.
5. Risk acknowledgement occurs **after** sign-in, separately from authentication; retain the existing text unless approved otherwise.
6. Owner calculations: server-enforced owner identity; no owner-only data or secrets in public JS.
7. Existing user-facing permalink and property-code context must be preserved at the eventual controlled cutover.
8. Member events and CRM identity mapping are later stages, not prerequisites to demonstrate access protection.

## Staging deployment blockers

- Confirm DNS registrar-zone target and whether Cloudflare proxy/Workers or an equivalent secure gateway is available.
- Confirm protected storage/hosting for Coventry's full analyser HTML.
- Configure Supabase auth settings and a non-production test user.
- Configure and verify transactional email redirect/SMTP settings.
- No live DNS, Pages, production routes, Supabase auth users or personal investor data should be modified before the approved release gates.

## Required acceptance tests before linking a pilot URL

- Anonymous user can see preview but cannot read authenticated HTML, linked JS/CSS assets, API responses or private PDF.
- Original GitHub Pages URLs, github.io origin, public repo blobs, caches and static asset paths cannot disclose protected content.
- Login/verification returns to Coventry, with property code and UTMs intact.
- After risk acknowledgement, authorised member sees intact calculator, responsive mobile and unchanged print/PDF calculations.
- Member A cannot access member B records; member cannot access owner data.
- Sign-out, expired session and disabled user deny access; failed permissions are logged without leaking personal data.
- Other production HA/BTL/HMO pages retain their current hashes and behaviour.
- Document rollback path and preserve existing public URLs until approval.

## Next action

Verify DNS and staging-host controls; choose and provision protected origin; then build the first executable authentication gateway against the Coventry fixture. Do not merge this branch into `main` or launch membership ahead of ACT-882 approval.
