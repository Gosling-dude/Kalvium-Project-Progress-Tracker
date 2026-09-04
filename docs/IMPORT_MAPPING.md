# Import Mapping

This documents how the existing operational spreadsheets map onto the
normalized data model, and exactly what the current import tool does and
does not do. Verified against the actual source workbooks (exported as
PDF): "SPE 2024 Batch — Project Defence Database Ninja Interface" (3
sheets) and "SPE 2024 Batch — Project Defence Students Deliverables".

## What `POST /api/import/students/preview` + `/commit` actually does

`backend/src/domain/services/import.service.ts` accepts a CSV/XLSX upload,
maps its header row (case-insensitive) onto known fields, validates each
row, and — on commit — creates **Student identity records** with the
legacy operational fields preserved as a note. It deliberately does **not**
fabricate structured `ProjectReview`/`VideoAssignment`/`Interview` rows from
the workbook, because the workbook's columns (below) don't carry the
per-dimension scores or per-question evaluations those tables are designed
to hold — only a final score/rung/status. Reconstructing "as if" a full
rubric evaluation happened would mean inventing data the source doesn't
contain, which spec §32/47 explicitly warns against ("Do not blindly import
malformed data").

## Column mapping — main tracker sheet ("Ninja Interface")

Confirmed exact header row: `Student Email, Growth Coach, Campus, Chosen
Project, Remarks, Resume Screening, Track, Video Question Rung, 1st
Interview Rung Held, 2nd Interview Rung Held, Final Status, Feedback,
History`.

| Source column | Mapped to | Notes |
|---|---|---|
| Student Email | `Student.email` | Required; also used for duplicate detection against existing students and within the file. |
| (no explicit "Full Name" column in this sheet — a `Full Name`/`Name` alias is supported for other exports) | `Student.fullName` | Required for import to succeed. |
| Growth Coach | `Student.growthCoachId` | Linked only on an exact case-insensitive name match to an existing `GrowthCoach`; otherwise left unassigned with a warning (never auto-creates a coach from a bare name — no email is available to satisfy `GrowthCoach.email`'s uniqueness safely). |
| Campus | `Student.campusId` | Same exact-match-or-warn behavior as Growth Coach. |
| Chosen Project | `Student.chosenProject` | Direct copy. |
| Remarks, Resume Screening, Track, Video Question Rung, 1st/2nd Interview Rung Held, Final Status, Feedback, History | `Student.notes` | Concatenated into one `[Imported from workbook] field: value; ...` note per student — nothing is discarded, but none of it becomes a structured evaluation row (see above). |

Values observed in the real sheet worth knowing about if you extend this
later: `Track` values are written as `"Track A1"`/`"Track A2"`/`"Track B"`
(with the `Track ` prefix) rather than the bare `A1`/`A2`/`B` the app uses
internally — the importer stores them as-is in the note rather than
silently reinterpreting them as a live track assignment. `Resume Screening`
/ `Video Question Rung` hold strings like `"42/50"`; `1st`/`2nd Interview
Rung Held` hold plain integers (1–4); `Final Status` is
`"Graduated"`/`"Not Graduated"`.

## Detailed Project Review sheet (same workbook, separate tab)

Columns: `Student Email, Campus, Latest Student Resume Submission, Chosen
Project, Track, Scores, Reason, Ninja, feedback from ninja, Deliverable
1..10, check point 1, checkpoint 2, check point 3`.

The `Scores` cell is a multi-line block listing all 10 rubric dimensions by
their exact names plus `TOTAL: X/50` — this independently confirmed that
the rubric dimension names/order already hardcoded in
`backend/src/domain/constants/rubric.ts` are correct. **Not currently
imported** — a future enhancement could parse this block into a proper
`ProjectReview` + `ProjectReviewScore` set per historical student, but that
requires reliable parsing of a semi-structured free-text block and is out
of scope for this release.

## Student Video Submissions sheet (same workbook)

Columns: `Timestamp, Email address, Q1..Q10` (each holding a submission
link), plus a free-text notes column (e.g. flags like "Transcripts are Copy
Pasted from GPT", "GitHub repo link is not working" — exactly the kind of
concern the `Flag` entity exists for). **Not currently imported.**

## Deliverables workbook

Header: `Student Email, Growth Coach, Campus, Latest Student Resume
Submission, Chosen Project, Track, Deliverables Sent Status, Deliverables
Time Stamp, Deliverables Completion Timeline, Deliverable 1..10`.

Each `Deliverable N` cell is itself a labeled block:

```
<Title line — positional, not explicitly labeled>
Gap Being Addressed: ...
What the Student Must Do: ...
Expected Outcome: ...
Submission Type: ...
Submission Required: ...      <- free text, e.g. "1 commit/PR link
                                  showing the completed change, with a
                                  3-5 line caption"
Submission Details: ...
Verification Criteria: ...
Estimated Time: ...           <- mixed units in the same sheet
                                  ("2.5 hours", "45 minutes", "1.5 hours")
```

This maps almost exactly onto `DeliverableTemplate`'s fields. Two things
this confirmed and fixed during implementation:

- `submissionRequired` must be a free-text `String`, not a boolean — the
  schema was corrected before this had any real usage (see
  `docs/BUSINESS_RULES.md` "Corrections made during implementation").
- `estimatedTime` is correctly a free-text `String`, not a structured
  number+unit — the source itself mixes hours/minutes in the same column.

Not currently modeled or imported: `Deliverables Sent Status` (e.g.
`"Sent"`), `Deliverables Time Stamp`, `Deliverables Completion Timeline`
(e.g. `"7 days"`). A future enhancement could map these onto
`DeliverableAssignment.assignedAt`/a computed due window, but the deliverable
*template* import itself isn't built yet — only the student-identity
importer described above exists in this release.

## Extending the importer

To import deliverables/checkpoints/historical evaluations structurally in
a future phase: add a new `previewXImport`/`commitXImport` pair in
`import.service.ts` following the same pattern (normalize → validate →
report row-level errors/warnings → commit only validated rows), reusing
`assignDeliverable`/`createCheckpoint`/`createProjectReview` etc. from the
existing domain services rather than writing raw Prisma calls — this keeps
imported data subject to the exact same validation and history rules as
data entered through the UI.
