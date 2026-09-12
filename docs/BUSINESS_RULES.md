# Business Rules

Source of truth: the program's `Project_Defense_Plan.pdf` (Project & Resume
Review Rubric, Track A Video Assessment Question Bank, the 5-Level Ladder /
"How the Process Drives Ladder Movement") plus the operational workbooks
("Database Ninja Interface" and "Students Deliverables"). All defaults below
were cross-checked against those source documents during implementation —
where the task's own paraphrase differed from the source (see "Corrections
made during implementation" at the end), the source document won.

Every rule below is enforced **server-side** (see
`backend/src/domain/services/*.ts`). The frontend renders the same
thresholds for UX only; it never computes the routing decision that gets
persisted.

## 1. Program flow

```
Onboarding → Project Review → Track A / Track B
Track A → Orientation → 10 Video Questions → Evaluation → A1 / A2
A1 → Day1 Gap Closure → Day2 Task → Day3 Mock → Day4 Feedback → Day5 Final → Graduation Decision
A2 → Feedback → Deliverables → Growth Coach → A1 (direct) or continue A2
Track B → Feedback+Plan → Deliverables → Growth Coach → Track A (via Video) or continue B
```

A2 and Track B are **not exits**. `RecordGrowthCoachEvaluation` can be
called any number of times for the same student/track and always creates a
new `TrackTransition` row, even when the decision is "continue the loop" —
see `developmentTrack.service.ts`.

## 2. Project / Resume Review (`projectReview.service.ts`)

10 dimensions, 5 marks each, 50 total (`RubricVersion` key `PR_RUBRIC_V1`,
see `backend/src/domain/constants/rubric.ts` for the exact source text):

| # | Dimension | Mandatory minimum |
|---|---|---|
| 1 | Resume Quality | — |
| 2 | Project Presence | 3 |
| 3 | Project Depth | 3 |
| 4 | Technical Stack | — |
| 5 | Project Ownership | 3 |
| 6 | Claims | 3 |
| 7 | GitHub / Evidence | 3 |
| 8 | Deployment | 2 |
| 9 | Role Readiness | — |
| 10 | Immediate Concerns | 3 |

**Routing:** Track A only if `total >= 25` **and** every mandatory
dimension clears its minimum. Otherwise Track B. A high score elsewhere
never compensates for a single mandatory-minimum failure — enforced in
`computeOutcome()`, not left to the reviewer.

**Enforcement details:**
- A review is `DRAFT` until explicitly completed; only `DRAFT` reviews can
  be edited. Completing requires an `outcomeReason` of at least 10
  characters and a non-empty reason on every dimension.
- A `COMPLETED` review is immutable — re-reviewing a student creates a new
  `ProjectReview` row (preserves history; see spec §63).
- Completing a review calls `recordTrackTransition` with
  `relatedEvaluationType: "PROJECT_REVIEW"`, moving the student to Track A
  (`VIDEO_ASSESSMENT` stage) or Track B (`B_DEVELOPMENT` stage).

## 3. Track A Video Assessment (`videoAssessment.service.ts`)

10 fixed questions (`VideoQuestionSet` key `TRACK_A_BASE`), 5 marks each, 50
total. Exact question text, "what we're listening for" points, and minimum
times are in `backend/src/domain/constants/rubric.ts`, taken verbatim from
the source question bank.

**Mandatory questions:** Q1 (Project Explanation), Q2 (Architecture), Q4
(Technology Decisions), Q7 (Technical Fundamentals), Q9 (Resume Claims) —
each must score ≥ 3.

**Routing:** A1 only if `total >= 25` **and** all five mandatory questions
pass. Otherwise A2.

**Enforcement details:**
- Video questions can only be assigned to a student currently on Track A.
- Each question can be submitted and evaluated independently as responses
  arrive — `finalizeVideoAssessment` does **not** require all ten to be
  submitted at once during the review process, but it does require all ten
  to be *evaluated* before it will compute and persist the final routing
  (you cannot finalize with unscored questions).
- Finalizing requires an `outcomeReason` (≥ 10 characters) and is a one-time
  action (`finalizedAt` is set and further finalization is rejected).
- Every question assignment points at a specific `VideoQuestionSetVersion`
  — changing the question bank later never rewrites what a past student was
  actually asked (§8 below).

## 4. Interview rung model (`interview.service.ts`)

**Corrected 2026-09-09:** the program's actual live scoring workbook
("Database Ninja Interface" source doc, Interview sheet) uses a 4-level
rung scale, not the 5-level narrative ladder in the planning doc:

| Rung | Name | Demonstrates |
|---|---|---|
| R1 | Explain | What the project does, the problem, the student's role |
| R2 | Justify | Why a technology/architecture/approach was chosen |
| R3 | Tradeoff | Comparison against alternatives |
| R4 | Scale & Failure | Concurrency, scalability, reliability, failure scenarios |

Target: highest rung held ≥ 3. `highestRungHeld`/`breakRung` are validated
to the range 1–4 in `interview.service.ts` (`MAX_RUNG = 4`).

**Break cause categories** (`BreakCauseCategory`) match the same source
doc's mechanism — "give ONE hint after the break; recovered → articulation
gap, still stuck → knowledge gap": `KNOWLEDGE_GAP | ARTICULATION_GAP |
OWNERSHIP_GAP | EVIDENCE_CLAIM_GAP | OTHER`.

**Break Rule constraint:** `breakRung` can never exceed `highestRungHeld`.
This models the program's hint-and-recover mechanism: an interviewer may
give a hint at the point a student breaks, and if the student recovers and
keeps climbing, the *final* highest rung held for the session can end up
above the specific rung at which the break was noted — but never below it.

**Interview scheduling:**
- Unlimited interviews per student (`sequenceNumber` auto-increments) — the
  program plan happens to use Mock + Final, but the schema does not assume
  exactly two. The Admin UI defaults to offering exactly 2 interview slots
  (Mock, then Final) per A1 student, but a genuine 3rd re-run is not
  blocked server-side.
- Interviewers must be an existing account on the platform
  (`Interview.interviewerId` → `User`); the Admin UI's interviewer picker is
  restricted to `ADMIN`-role accounts.
- `Interview.transcriptUrl` optionally holds the Google Meet transcript doc
  link for that interview.
- Scheduling the first interview for a Track A1 student advances their
  stage from `A1_INTENSIVE` to `INTERVIEW` (itself a recorded
  `TrackTransition`).
- `growthCoachConfirmationStatus` is tracked as a workflow state
  (`NOT_REQUIRED | PENDING_CONFIRMATION | CONFIRMED | DECLINED |
  RESCHEDULE_REQUIRED`), not a boolean or free text.

## 5. A2 / Track B development loop (`developmentTrack.service.ts`)

Every deliverable is written directly for the student it's assigned to
(`DeliverableAssignment`) — there is no reusable template library and no
separate checkpoint grouping. A2 deliverables are always estimated in
`HOURS`; Track B always in `DAYS`, in half-day steps (0.5, 1, 1.5, ...),
minimum 0.5 — enforced in `assignDeliverable`. The one progress figure
shown to both Admin and Growth Coach — in the app and in the assignment
email — is the sum of estimated time across a student's currently-assigned
deliverables for that track, plus how many of them are `VERIFIED`
(`sumEstimatedTime`).

**Growth Coach decision → routing — the one rule that must never collapse:**

| Track | Decision | Result |
|---|---|---|
| A2 | SUFFICIENT | → **A1**, stage `A1_INTENSIVE`. Video Questioning is **never repeated** — the student already proved they could do it. |
| A2 | NOT_SUFFICIENT | Stays A2, stage `A2_DEVELOPMENT`. When recorded by an Admin, a `TrackTransition` is still recorded (history of the decision itself); the `GrowthCoachEvaluation` row itself is always recorded either way. |
| B | SUFFICIENT | → **A**, stage `VIDEO_ASSESSMENT`. The student re-enters at Orientation/Video — they have never been through Track A's process. |
| B | NOT_SUFFICIENT | Stays B, stage `B_DEVELOPMENT`. |

This is enforced in `recordGrowthCoachEvaluation()` — not left to the
Admin's judgment at the point of promotion — precisely so an A2 promotion
can never accidentally re-trigger a video assignment, and a Track B
promotion can never accidentally skip it.

Recording a Growth Coach evaluation requires `student.currentTrack` to
match the `track` argument (prevents recording an A2 decision for a
student who has already moved), and `feedback` of at least 10 characters.

**Movement always rests with Program Admins.** When a Growth Coach records
the evaluation, the routing above is computed and stored on the
`GrowthCoachEvaluation` but not applied — `pendingAdminConfirmation` is set
and the student does not move yet. A Program Admin must call
`POST /growth-coach-evaluations/:id/confirm` to apply it (or `.../dismiss`
to discard it without moving the student); until then it surfaces as a task
on every Admin's Tasks feed. When an Admin records the evaluation directly,
the transition applies immediately, same as before — that is already a
deliberate Admin action.

## 6. Graduation (`graduation.service.ts`)

Graduation is **always an explicit Admin action** — nothing else in the
codebase ever sets `programStatus` to `GRADUATED` or `FUTURE_PIPELINE`, and
completing interviews (even with `result: "ADVANCE"`) does not
auto-graduate a student (see `tests/unit/interviewAndGraduation.test.ts`).

- `GRADUATE` → `programStatus = GRADUATED`, stage `GRADUATION`.
- `NOT_GRADUATE` → `programStatus = FUTURE_PIPELINE`, stage
  `RE_EVALUATION` — never a dead end; the student stays in the historical
  timeline and can be re-evaluated.
- Requires a reason ≥ 10 characters and only applies to Track A1 students.

## 7. Track transitions & the override rule (`trackTransition.service.ts`)

`recordTrackTransition` is the **only** place in the codebase allowed to
change a student's current track/stage/status. Every call is either:

- **Routine** (`sourceType: AUTOMATIC` or `MANUAL`) — one of the moves the
  program flow actually produces: `null→A`, `null→B`, `A→A1`, `A→A2`,
  `A2→A1`, `A2→A2`, `B→A`, `B→B`, `A1→A1`. These require only a meaningful
  `reason` (≥ 8 characters).
- **Exceptional** (`sourceType: OVERRIDE`) — anything else, e.g. `A→B`
  (demoting a Track A student) or `A1→A2`. These are rejected unless
  `sourceType` is explicitly `OVERRIDE` with its own `overrideReason` — see
  spec §66/37. The Admin "Move Student" UI catches the resulting error and
  prompts for an override reason rather than silently failing.

Every transition, routine or not, writes an immutable `TrackTransition` row
(`fromTrack`, `toTrack`, `fromStage`, `toStage`, `reason`, `sourceType`,
`relatedEvaluationType`/`relatedEvaluationId`, `actorId`, `effectiveAt`) and
an `AuditEvent`. `Student.currentTrack`/`currentStage`/`programStatus` are
only ever a cached projection of this log.

## 8. Versioned rules

- `RubricVersion` (key `PR_RUBRIC_V1`) holds the Project Review dimensions,
  threshold, and mandatory minimums as data.
- `VideoQuestionSetVersion` (under `VideoQuestionSet` key `TRACK_A_BASE`)
  holds the question bank, threshold, and mandatory question keys as data.
- A completed `ProjectReview`/finalized `VideoAssignment` always stores
  which version it used. Changing policy in the future means creating a new
  version row, never mutating an existing one — historical decisions keep
  the threshold that was actually in force when they were made.

## 9. Cohort & student identity

A student's identity (`Student`) is independent of cohort membership.
`CohortEnrollment` rows track every cohort a student has ever belonged to;
moving cohorts ends the active enrollment (`isActive: false, endedAt: now`)
and starts a new one — the old row is never deleted or overwritten.

## 10. Validation rules enforced server-side

- Every score is bounded to its dimension/question's max (0–5).
- Interview rungs are bounded to 1–5; break rung ≤ highest rung held.
- Communication rating bounded to 1–5.
- Bulk cohort enrollment rejects an empty student list.
- Email sending rejects an empty recipient list and any malformed address.
- Flags require a title and a description of at least 10 characters.
- Deliverable verification and checkpoint evaluation require feedback text.
- Track transitions require a reason; exceptional ones require an override
  reason.

## Known limitations (honestly scoped for this release)

- **Import is intentionally shallow.** `import.service.ts` imports student
  *identity* (name, email, campus/growth coach *if an exact name match
  already exists*, chosen project) and preserves every legacy
  operational-workbook column as a note. It does **not** attempt to
  auto-reconstruct historical `ProjectReview`/`VideoAssignment`/`Interview`
  rows from the workbook's free-text score/rung/status columns — those
  columns don't carry per-dimension scores, so fabricating structured
  evaluation rows from them would mean inventing data the source doesn't
  actually contain. See `docs/IMPORT_MAPPING.md`.
- **No automatic email triggers yet.** Every email send in this release is
  an explicit Admin action (spec §29 explicitly allows deferring automatic
  triggers to a later phase; the `EmailEvent`/`EmailTemplate` model already
  supports adding them without a schema change).
- **SMTP provider is implemented but untested against a real mailbox** in
  this session — `EMAIL_MODE=mock` is the safe default; see
  `docs/EMAIL_SYSTEM.md`.

## Corrections made during implementation

The task description's own paraphrase of some rules differed from the
actual source `Project_Defense_Plan.pdf`; the source was treated as
authoritative once it became available mid-session:

- **Interview ladder labels.** The task text suggested
  R1=Explanation/R2=Justification/R3=Trade-offs/R4=Scaling+Failure (4
  levels). The source defines 5 levels: R1=Explain, R2=Implement,
  R3=Justify, R4=Tradeoff, R5=Scale & Failure. `RUNG_LEVELS` was corrected
  to match the source.
- **Video question text/timing.** Initial question text and per-question
  minimum times were plausible placeholders written before the source was
  available; they were replaced with the source's exact question wording,
  "what we're listening for" points, and per-question minimum times
  (converted to seconds).
- **Deliverable "Submission Required" field.** Initially modeled as a
  boolean (has a submission requirement: yes/no). The real operational
  workbook uses this as free text describing exactly what must be
  submitted (e.g. "1 commit/PR link showing the completed change, with a
  3-5 line caption"). Corrected to a required `String` field
  (`DeliverableAssignment.submissionRequired`) before any real usage — see
  the migration `deliverable-submission-required-text`.
