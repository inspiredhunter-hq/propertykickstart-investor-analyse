# HMO input-triggered draft generation

When a fully reconciled new HMO property record is ready at Property Kickstart deal-processing **Step 5**, add a file named `hmo-inputs/<PROPERTY-CODE>.json` to the repository using the exact input schema in `docs/APPROVED_HMO_STANDARD.md`.

The `Generate approved HMO analyser drafts from validated inputs` GitHub Actions workflow runs when the JSON input is committed. It tests the generator, creates the property-specific draft using the approved St Helens template and publishes a private-to-workflow downloadable HTML artifact. The workflow **does not** commit a new public analyser route, publish a page, amend the SMART homepage, or begin Step 6 Enrichment. An authorised release process must validate the financial model and deploy the resulting page additively.

**Ownership:** The current property-processing orchestrator must export the Pipeline and Deal Register values and commit the input JSON after canonical financial review. This orchestrator-to-GitHub handoff is **not yet connected** to a Notion property update. Do not claim a new Pipeline row alone triggers the generator until an authenticated event integration is implemented and tested.

Do not place personal data, private source images, owner-only stress parameters, passwords or other secrets in the public repository input. The input must contain only approved public property-level identifiers and financial assumptions.

## Authenticated Step 5 event trigger

The workflow additionally accepts a GitHub `repository_dispatch` event with `event_type` `pk_hmo_analyser_step5` and `client_payload.property_json` containing the complete validated HMO JSON as a string; or a manually authorised `workflow_dispatch` input `property_json`. These operations build an ephemeral draft artefact only. The sender must use a properly scoped GitHub credential via a trusted server-side orchestration service; never include a token in property records, URLs, public frontend HTML or this repository. GitHub's own authentication applies to dispatch requests. The external Notion/Deal Register extraction and trusted credential provisioning are separate integration steps and are not yet live.
