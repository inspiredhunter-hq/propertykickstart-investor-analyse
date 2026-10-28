# Investor Analyser — Mandatory Test and Deployment Plan

## Rule (ACT-882, approved 28 October 2026)
1. All analyser changes MUST first be deployed to a browser-accessible test URL before presenting the change for investor acceptance. Never offer a GitHub PR as the user-facing test deliverable.
2. Canonical URL: https://deals.propertykickstart.co.uk/test/{strategy-lowercase}/{last-five-characters-of-property-code}/ . Examples: /test/hmo/2S98D/, /test/btl/2CUEP/, /test/ha/3FTDU/ . Preserve case of property-code suffix. Test pages must remain distinct from permanent production property URLs.
3. Publish the test files to the actual hosting branch, not only a development branch. Verify the URL returns the intended property and updated design; verify shared CSS/JS relative paths from nested test folders. Do not claim deployment merely because files were committed.
4. Check functionality: SCORE controls and validations; headline price, rent, yield and management costs; cash/mortgage method; acquisition calculations; scenario updates; mobile layout; print/PDF; page identity and disclaimers. Compare against approved mapping spreadsheet and strategy standard.
5. Give Hanna a numbered single list of clickable test URLs with status and specific changes to check. No GitHub links in acceptance handoff unless expressly requested.
6. Leave production pages unchanged until documented release conditions and acceptance are met. Promote tested version to canonical /{PROPERTY-CODE}/, run post-deploy read-back and verify live production URLs.
7. Record test URL, production URL, source version, tests, outcome, release date, issues and acceptance in ACT-882 / deployment register. An incomplete deployment must be labelled IN PROGRESS, never COMPLETE.
8. This plan is a mandatory release gate for all BTL, HMO and HA investor analyser changes; no individual assistant discretion to skip test deployment.

## Current work
ACT-882 priority: shared HA-style headline and compact BTL SCORE. The working development branch is feature/act-882-shared-headline-score-20261028. Stage six test URLs: /test/btl/WLETS/, /test/btl/UAXC7/, /test/btl/2CUEP/, /test/hmo/2S98D/, /test/ha/3FTDU/, /test/ha/9JSFK/. Verify each actually serves before reporting ready. The original production pages must not be overwritten during staging.
