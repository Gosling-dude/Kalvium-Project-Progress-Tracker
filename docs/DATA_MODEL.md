# Data Model

Full definitions: `backend/prisma/schema.prisma`. This document explains the
*why* behind the shape, not a field-by-field restatement.

## Enum-like fields are validated strings, not native DB enums

SQLite (the dev/test datasource) has no native enum type in Prisma. Rather
than add native enums that would need to be dropped when switching to
PostgreSQL, every "enum-like" column is a `String` whose legal values are
defined once in `backend/src/domain/constants/enums.ts` and validated by
zod at the API boundary and by the domain services internally. This also
means the exact same value set is guaranteed on SQLite and PostgreSQL.

## Core entity groups

### Identity & reference data
`User` (auth + role), `Campus`, `GrowthCoach`, `Cohort`.

### Student + history
- `Student` — identity plus **cached current state**
  (`currentTrack`/`currentStage`/`programStatus`). `currentTrack` is
  nullable: `null` means "not yet routed by a completed Project Review"
  (ONBOARDING), which is a real state, not a fake default.
- `CohortEnrollment` — one row per (student, cohort) membership period.
  `isActive` + `endedAt` mark history; a student can have many.
- `TrackTransition` — append-only log of every track/stage/status change.
  See `docs/BUSINESS_RULES.md` §7. This table is the actual source of
  truth for "where is this student now"; `Student`'s cached fields are a
  denormalization for query performance.

### Project Review
`RubricVersion` (JSON `dimensions` config + threshold, versioned) →
`ProjectReview` (one per review attempt; `DRAFT` until completed, then
immutable) → `ProjectReviewScore` (one row per dimension, queryable —
never just a JSON blob of scores).

### Video Assessment
`VideoQuestionSet` → `VideoQuestionSetVersion` (threshold + mandatory
question keys, versioned) → `VideoQuestion` (one row per question, full
text) . `VideoAssignment` (one per student per assignment, points at a
specific version) → `VideoQuestionEvaluation` (one row per question per
assignment — supports partial evaluation as responses arrive).

### Interviews
`RungLevel` (reference data: R1–R5) . `Interview` (unlimited per student,
auto-sequenced) → `InterviewEvaluation` (1:1, rung/break/feedback/result).

### A2 / Track B development
`DeliverableTemplate` (reusable, versioned by incrementing `version` on
edit) → `DeliverableAssignment` (snapshots the template at assignment time
into `templateSnapshot` JSON — editing a template never rewrites a past
assignment's meaning) . `Checkpoint` (per-student, not global — different
students can have different checkpoint schedules) . `GrowthCoachEvaluation`
(the promotion gate — see Business Rules §5).

### Graduation, flags, audit
`GraduationDecision` (explicit, one per decision event) . `Flag` (proper
entity: category/severity/status/resolution, not a boolean) . `AuditEvent`
(append-only, generic actor/action/entity/before/after/metadata log).

### Email
`EmailTemplate` (versioned) → `EmailEvent` (one logical "send" action,
possibly to many recipients) → `EmailRecipient` (one per recipient, stores
the *rendered* body so a later template edit never changes what a
historical email actually said) → `EmailDeliveryAttempt` (append-only
per-recipient attempt log, for retry/failure history).

### Configuration
`AppSetting` (free-form key/JSON-value store for operational knobs that
don't need full versioning, e.g. default interview count).

## Relational integrity choices

- `Student.email` and `Cohort.code` are unique.
- `VideoQuestion` is unique per `(questionSetVersionId, questionKey)` —
  deterministic ordering within a set via `order`.
- `InterviewEvaluation.interviewId` is unique (1:1 with `Interview`).
- Soft-delete/archive semantics (`active: Boolean`) are used for `Campus`,
  `GrowthCoach`, `Cohort` (`status`), `DeliverableTemplate`,
  `VideoQuestionSet`/`VideoQuestion`, `EmailTemplate` — nothing referenced
  by historical data is ever hard-deleted by the application. `Flag` and
  `TrackTransition`/`AuditEvent` rows are never deleted at all.

## JSON fields — used deliberately, not as a shortcut

JSON columns (`RubricVersion.dimensions`,
`VideoQuestionSetVersion.mandatoryQuestionKeys`,
`DeliverableAssignment.templateSnapshot`,
`ProjectReview.triggeredMandatoryFailures`,
`GraduationDecision.relatedInterviewIds`, `AuditEvent.before/after/metadata`)
hold **configuration or point-in-time snapshots**, not core transactional
data that needs independent querying — every score, evaluation, and
transition that the Admin needs to filter/sort/report on
(`ProjectReviewScore`, `VideoQuestionEvaluation`, `TrackTransition`, etc.)
is a real relational row.
