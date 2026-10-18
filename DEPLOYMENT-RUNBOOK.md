# SMART Deal of the Week · Deployment runbook

## Live pages
- Current featured property: https://deals.propertykickstart.co.uk/
- Permanent Maidstone page: https://deals.propertykickstart.co.uk/HA-SE-3FTDU/
- GitHub Pages publishes from `main` at `/`; custom DNS/HTTPS is already configured.

## Weekly release process
1. Prepare and approve the next property in PK Content Library and its corresponding Deals Pipeline record. Confirm asking price, rent, financial assumptions, availability, and permission to publish.
2. Create `PROPERTY-CODE/index.html` using the approved investor analyser template and property-specific financial defaults. Complete mobile and print QA. Do not copy Maidstone figures into a new deal without validation.
3. Add property entry to `config/featured-deal.json`: `contentPageId` (exact PK Content Library page UUID), `path`, `publicUrl`, `availability: "verified_available"` and `releaseApproved: true` **only once there is actual dated availability evidence and editorial/financial sign-off**.
4. Publish the LinkedIn newsletter. In Notion, set `Publishing Status` to `2. Published`, record the actual `Published Date`, a live `Article URL` (or `Newsletter URL`) and maintain exactly one `Source Deal` relation. Tick `Approved?` following genuine approval, never as a shortcut.
5. GitHub Actions `Publish featured SMART Deal` checks hourly Thu/Fri and at intervals on Sat/Sun, within 08:00–21:00 UK. It promotes only the newest property that passes every release gate and whose prebuilt HTML has valid key sections. On any missing field, it leaves the existing homepage intact.
6. Check the GitHub Actions run, homepage and permanent property URL. Log the release in PK Release Notes and link HTML Pages Registry records. Preserve historic URLs.

## One-time activation
- Create a **read-only Notion internal integration** with access to the PK Content Library database. Configure the GitHub Actions **repository secret** `PK_NOTION_READ_TOKEN` for this repository using GitHub Settings → Secrets and variables → Actions. **Never** commit or send this token in a chat, Notion, or HTML.
- Verify organisation Actions policy permits the workflow and `GITHUB_TOKEN` has repository contents write permission.
- Confirm Notion API database query version `2022-06-28` returns the expected database properties and run a test with an approved staging property. The first release must be reviewed before permitting automatic promotion.
- The workflow is fail-closed. Without the secret, or without complete approval/availability data, it does not change the live homepage.

## Withdrawn or sold property
- Do not delete historical property URLs. Following verified Pipeline/seller status change, replace the affected property-specific HTML with a clear no-longer-available notice linking to the homepage. Review current feature weekly and older currently-offered properties monthly.
- Availability scans and automatic notices are **not yet implemented**. Do not represent them as active.

## Audit trail
- Governing actions: ACT-838 (analyser), ACT-861 (weekly publication).
- Notion databases: PK Content Library, PK HTML Pages Registry, PK Release Notes.
- Production HTML archive attachment is on the Maidstone registry record. Raw Google Drive backup remains pending.
