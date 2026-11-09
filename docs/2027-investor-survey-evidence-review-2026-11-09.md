# 2027 Investor Survey V2 — Evidence review
Date: 9 November 2026. Status: PARTIAL PASS — existing evidence reviewed; no blanket retest requested.

## Evidence sources
- User's earlier TEST screenshots (Q4/Q6 ranking, Q5 professional follow-up and validation, Q8 choices, contact form).
- Screenshot 9 November showing failed Notion save (401), retry control and TEST response download control.
- Downloaded `TEST-2027-investor-survey-unsaved.json`, created 2026-11-09T00:31:52.407Z; **contains personal contact data; do not commit the file or contact details to GitHub**.
- TEST review branch and runbook `docs/2027-investor-survey-test-runbook.md`.

## Verified from downloaded file
- Twelve answers present, keyed 0–11 (Q1–Q12).
- Q1 existing-landlord Yes; Q2 portfolio expansion; Q3 within three months.
- Q4, Q5, Q6 and Q8 ordered arrays present (rank order preserved in JSON).
- Q7, Q9, Q10, Q11 and Q12 values present.
- Professional follow-up selected and one profession recorded.
- Contact name, email, mobile, email-marketing and WhatsApp preferences all represented.
- TEST marker present; `saved_to_notion: false` correctly distinguishes export from storage.
- Download fallback and retry controls visibly deployed on TEST.

## Prior screenshot evidence / limitations
- Q4 and Q6 ranking interactions were demonstrated earlier; **complete option permutations not proven**.
- Q5 optional professional follow-up was exercised. Defect confirmed: selecting opt-in without a profession triggers a generic required-selection message despite UI saying the profession selection is optional.
- Q8 and conditional question screens were shown, but full negative/positive branches and persistence are not exhaustively evidenced.
- Earlier first-time-investor journey evidence was from the 11-question version; **do not mark V2 12-question first-time-investor branch as passed on that basis**.
- No evidence sufficient to claim all 22 scenarios passed. Mobile layout appears usable in the supplied screenshot, but no full cross-device coverage.

## Defect PK-SURVEY-V2-01
**Severity:** Medium (confusing validation, potential abandonment).
**Steps:** Q5, choose 'Finding reliable professionals'; tick 'Yes, I’d like to tell you'; leave profession choices blank; continue.
**Actual:** Generic 'Please complete the required selection. Include details if you selected Other.'
**Expected:** Either allow a blank profession list consistently, or make it conditionally required with precise instructions. Recommended: if opted in, select at least one profession; if not, untick and continue. Update 'Which professionals? (Optional)' wording accordingly. Also verify Q8 behaviour if the same control appears.
**Status:** Identified, not yet regression-verified.

## Remaining targeted checks (not full retest)
1. V2 first-time-investor branch (Q1 No → Q2).
2. Q5/Q8 opt-in with no professional selected and 'Other' without details, after copy/validation correction.
3. Q8 special mutually exclusive options and changed-parent-answer reset.
4. Back/forward retention, empty Q9/Q10, Q12 No branch, invalid contact formats, and end-of-survey confirmation where not already supported by screenshots.
5. Final TEST deployment commit verification before sign-off.

## Decision
**PASS:** TEST JSON export and observed data capture; fallback UI.
**OPEN:** Conditional-validation defect and limited branch/regression checks.
**OUT OF SCOPE for survey acceptance:** Notion authentication 401 / database persistence, tracked separately.
**Production:** No release approval recorded.

## Update — 9 November 2026: Q5 verified
- User screenshot confirms corrected conditional wording is deployed, compact mobile checklist is displayed, and professional selection is retained.
- User explicitly confirmed pressing Continue succeeds with selected professionals.
- Q5 conditional selection, navigation and wording: **PASS** for the tested path.
- Do not repeat Q5 testing; untested 'Other' and untick paths remain separate targeted checks.
- Next priority: Q8 conditional follow-up and its own branch, plus remaining targeted tests as described above.
