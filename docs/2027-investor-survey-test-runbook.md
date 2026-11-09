# Property Kickstart | 2027 Investor Survey | Repeatable TEST Runbook
Version 1.0 | 9 November 2026 | Applies to the 12-question V2 survey

## Purpose and release rule
Verify that the survey works and exports a complete, accurate response file **without depending on Notion**. The downloadable JSON is the acceptance evidence for question logic and data capture. It does **not** prove Notion storage, email delivery or CRM automation. Do not merge the review branch or change production until the user approves the tested version.

## Environments and sources
- TEST frontend: https://test.propertykickstart.co.uk/survey/
- TEST Worker: `pk-investor-survey-v2-test` (Cloudflare; separate from live Worker).
- GitHub review branch: `feature/2027-survey-v2-review`; draft PR #95.
- Production survey: https://survey.propertykickstart.co.uk/2027/ — leave untouched during testing.
- Approved 12-question specification: https://docs.google.com/document/d/1Cus0uOIo1s9_taNY9jT26FuJdJZzhVoEiV1GE1krQdQ/edit

## A. Before each test
1. Record date, tester, device/browser, GitHub commit SHA and TEST URL in a test log.
2. Confirm the intended review commit is actually deployed on TEST. A GitHub commit alone is **not** proof of deployment.
3. Confirm TEST branding and the intro says **Twelve questions**.
4. Do not use real personal information unnecessarily; use clearly labelled TEST contact details.
5. Keep the Notion integration issue separate. If saving fails, use the response download fallback; do not change production credentials.

## B. Core test scenarios
Run and record **Pass / Fail / Not tested**, with screenshot or explanation for failures.

| ID | Scenario | Expected result |
|---|---|---|
| T01 | Q1 Yes (existing landlord) | Correct landlord-specific Q2 choices |
| T02 | Q1 No (not yet landlord) | Correct first-time-investor Q2 choices |
| T03 | Q3 timing | Exactly one approved timing choice retained |
| T04 | Q4 objectives | One or two ordered priorities; rank changes and removal work |
| T05 | Q5 challenges | Up to three choices; fourth blocked; selections retained |
| T06 | Q5 professionals follow-up | Only appears when relevant; optional unticked path continues |
| T07 | Q5 professionals opted in | At least one professional required; 'Other' requires detail; specific helpful validation |
| T08 | Q6 decision factors | One or two ordered priorities; export order correct |
| T09 | Q7 recent purchase reasons | One valid response; correct option wording |
| T10 | Q8 desired support | One or two ranked priorities; 'Nothing' cannot be combined with another |
| T11 | Q8 professionals follow-up | Appears only when relevant; no duplicate; choices persist when navigating |
| T12 | Q9 and Q10 | Both optional; empty and filled responses accepted |
| T13 | Q11 preferred support | Single selection; 'Other' detail captured when selected |
| T14 | Q12 investor interest | Yes / Possibly / Not at the moment stored correctly |
| T15 | Back/forward navigation | Answers, rank order and conditional answers preserved; changing parent answer clears irrelevant follow-up |
| T16 | Contact step | Anonymous submission allowed; optional name, email, mobile and separate email/WhatsApp preferences work |
| T17 | Privacy and external links | Privacy notice and WhatsApp link open correctly without losing the survey |
| T18 | Mobile layout | No clipped controls or horizontal overflow; buttons and text remain usable |
| T19 | Failed Notion save | Clear TEST-only error and **Download TEST responses** option; answers remain available |
| T20 | Download | Valid JSON file generated, identifiable as TEST, containing the complete submitted response |
| T21 | Retry | Retry saving to Notion does not erase or change answers |
| T22 | Completion | Only claim a saved response if server confirms it; otherwise explain downloaded-only state |

## C. Download and verify the JSON
1. Complete a TEST survey with a **known answer sheet** written down in advance (including rankings, 'Other' details and optional contact preferences).
2. Press **Submit survey**. If Notion saving fails, choose **Download TEST responses**.
3. Save the downloaded JSON in a secure local TEST evidence folder. **Do not upload personal contact details to a public GitHub issue or PR.**
4. Open the file in a text editor or JSON viewer. Confirm it parses as JSON and includes all 12 answers in the correct Q1–Q12 order.
5. Compare every value with the known answer sheet, including first/second ranking order, Q5/Q8 professional selections, Other details, Q9/Q10 blanks, Q12 and contact opt-ins.
6. Verify it is clearly marked TEST and does not falsely claim Notion saved it.
7. Record the file name, test result and discrepancies in the test log. Retain the evidence securely according to the project's privacy/retention policy.

## D. Mandatory regression runs after a change
- **Copy-only change:** intro, question affected, mobile rendering, submission/download.
- **Options, ranking or conditional logic change:** T01–T15 plus T19–T20.
- **Contact, privacy or export change:** T16–T22 plus T01–T03.
- **Worker/API change:** all T01–T22, including an intentional failed-save test.
- **Before any production release:** all T01–T22 on the final TEST deployment.

## E. Defect and sign-off log template
```text
Run ID:
Date / tester / device / browser:
TEST URL:
GitHub commit SHA:
Scenario IDs run:
Known answer sheet reference:
JSON evidence file (private):
PASS:
FAIL (scenario, expected, actual, screenshot):
NOT TESTED:
Fix commit and retest result:
User acceptance: APPROVED / NOT APPROVED
Production release authorised: YES / NO
```

## F. Release and rollback
1. Fix failures **on the review branch**, deploy to TEST, rerun affected tests and the full pre-release suite.
2. Ask for explicit user approval against a recorded commit SHA and test log.
3. Only then prepare/merge the approved release and deploy production using the established release process.
4. Immediately smoke-test production for intro, basic flow and successful submission **without assuming Notion is working**.
5. If production fails, roll back to the last known-good production deployment; document the incident and retest in TEST.

## G. Separate Notion integration test (not a survey acceptance blocker)
When automatic Notion storage is required, independently verify the TEST Worker secret, integration access to the correct database, response property mappings and a confirmed created Notion record. A 401 indicates an authentication/access problem. A downloaded JSON file proves local capture, **not** database persistence. Track this as a separate integration workstream.

## H. Maintenance
Update this runbook and the known-answer sheet whenever the approved questionnaire, export schema, URLs or release workflow changes. Keep changes in the same PR as the survey change. Never assume a TEST deployment has updated merely because GitHub shows a new commit.
