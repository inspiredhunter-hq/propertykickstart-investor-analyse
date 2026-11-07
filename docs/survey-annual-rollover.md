# Investor survey launch and annual rollover

Follow PK-SKL-003, PK-SKL-002 and the current PK-OPS-TPL-002 in Notion. ACT-900 records the original architecture and approvals. This procedure supplies survey-specific details and never replaces release governance.

## Inputs

Record target year, governing ACT, approved questions/options, close/open dates, previous edition, exact repository candidate SHA, production Netlify project and branch, Worker origin/year configuration and response data source. Check current sources rather than treating the 2027 deployment as permanent infrastructure evidence.

## Stable architecture

- Share https://survey.propertykickstart.co.uk/ permanently.
- Store one actual survey at production/YEAR/index.html; redirect root temporarily (302) to /YEAR/ using production/_redirects.
- Keep earlier annual URLs and their question snapshots. Never replace an earlier edition's questions or reassign old response years.
- When closing an edition, preserve its URL with a closed message and current-survey link, and reject submissions for that closed edition server-side. Retain a versioned copy of the original question set in GitHub.
- Do not globally change SURVEY_YEAR while older editions still accept submissions. Introduce a server-approved edition map or separate versioned endpoint first. Scope retry identity by submission ID, environment and year.
- Preserve typed Notion question fields, raw answer evidence, created time, submitted time, survey year and TEST flag. If questions change, version their mappings explicitly; never relabel historic answers as new questions.

## Repeatable execution

1. Fetch current ACT, architecture/build/release governance and registry/DNS data. For a new ACT obtain the conversation URL before creation. Reuse an existing matching task where appropriate.
2. Create an isolated candidate branch; copy the prior annual source into the NEW year path only. Apply approved question/content changes. Keep root free of duplicate survey HTML. Preserve TEST hosting and existing unrelated repository domains.
3. Update the server-approved year/edition contract, field mappings and annual privacy wording. Derive TEST/live status from configured environment, not the submitted client flag. TEST submissions must not link to live CRM.
4. Preserve independent email consent, optional contact and optional professional follow-up. Match trimmed case-normalised emails only to one unique existing investor. Anonymous stays unlinked; no match stays pending; duplicates are flagged. Reconcile pending live responses when investor records later exist. Never send marketing or create investor identities merely because someone answered a survey.
5. Run both tests/investor-survey-regression.mjs and tests/investor-survey-production.mjs. Update edition-specific assertions for the new year. Verify real browser/mobile journeys, blank/filled optional data, professional selections, safe retries, errors, external links and unknown URLs. Verify live service permissions using controlled TEST data before launch.
6. Run the current Ready to Deploy registry sweep. Account for every item as included/deferred. Build a complete release manifest and release note with exact candidate SHA, hosting target, deployment order, acceptance tests, credentials by NAME only and rollback. Do not infer readiness from passing mocks alone.
7. Obtain package approval as required by the current user instruction and governance. Deploy backend before exposing the new frontend. Use an isolated Netlify project/verified production publish directory; keep the existing TEST site unchanged. Verify the assigned hostname before DNS changes. Reuse existing working survey DNS on later annual rollovers; do not create a duplicate DNS record each year.
8. At the agreed cutover, update root 302 to the new edition. Confirm HTTPS, redirects, actual submission persistence, year/environment flags, optional fields, investor linkage and assessment relation. Test that closed editions reject new submissions. Check mobile layout and CTA wrapping.
9. Update HTML Pages Registry, Public URL Register, DNS DB only where changed/verified, release note, deployment record and ACT. Mark Done only after the required evidence passes. Keep rollback references and earlier editions.

## 2027 reference points (verify before use)

- Repository: inspiredhunter-hq/propertykickstart-investor-analyse
- Candidate branch: release/survey-live-20261106
- TEST project: pk-investor-survey-test; URL https://test.propertykickstart.co.uk/survey/
- Production project: not yet created/verified; do not guess its Netlify hostname.
- Worker: pk-investor-survey.propertykickstartuk.workers.dev
- Responses DB: d7505061004d448fb254d2614b3fae3d
- Investors DB: ffd4d0428cc64de2b6602e60dafa8a2f
- Worker secret name: NOTION_API_TOKEN; GitHub secret names: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID.
- Preserve repository root CNAME for deals.propertykickstart.co.uk.

## Rollback

Restore the previous root redirect and tested Worker revision. If the first launch fails, unpublish only the new production site; leave TEST and stored data intact. Do not delete response rows or additive schema fields as a code rollback. Record any production failure through the existing bug-first process.
