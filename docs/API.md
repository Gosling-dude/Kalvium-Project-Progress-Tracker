# API Reference

Base URL: `/api` (proxied from the frontend dev server to
`http://localhost:4000/api`). All routes below require authentication
(`Authorization: Bearer <token>` or the `kalvium_session` cookie) and the
`ADMIN` role unless noted. `GET /health` is unauthenticated.

Every response body is `{ "data": ... }` (list endpoints:
`{ "data": [...], "pagination": {...} }`). Errors are
`{ "error": { "code", "message", "details?" } }`.

## Auth

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | `{ email, password }` → `{ token, user }`, also sets an httpOnly cookie. Rate-limited (20/15min). |
| POST | `/auth/logout` | Clears the cookie. |
| GET | `/auth/me` | Current user from the token. |

## Campuses & Growth Coaches

| Method | Path |
|---|---|
| GET | `/campuses?includeInactive=` |
| POST | `/campuses` `{ name, code }` |
| PATCH | `/campuses/:id` |
| GET | `/growth-coaches?includeInactive=` |
| POST | `/growth-coaches` `{ name, email, campusId? }` |
| PATCH | `/growth-coaches/:id` |

## Cohorts

| Method | Path |
|---|---|
| GET | `/cohorts?status=` |
| POST | `/cohorts` `{ name, code, description?, campusId?, startDate?, endDate?, notes? }` |
| GET | `/cohorts/:id` — includes every enrollment (active + historical) |
| PATCH | `/cohorts/:id` |
| POST | `/cohorts/:id/enroll` `{ studentId, reason? }` |
| POST | `/cohorts/:id/bulk-enroll` `{ studentIds: string[], reason? }` — rejects an empty list |

## Students

| Method | Path |
|---|---|
| GET | `/students?search=&cohortId=&campusId=&growthCoachId=&track=&programStatus=&hasOpenFlags=&page=&pageSize=&sort=` |
| POST | `/students` `{ fullName, email, phone?, campusId?, growthCoachId?, chosenProject?, resumeReference?, notes?, cohortId? }` |
| GET | `/students/:id` — summary |
| PATCH | `/students/:id` |
| GET | `/students/:id/detail` — the full Student 360 payload (student, cohort/track history, project reviews, video assignments, interviews, deliverables, checkpoints, growth coach evaluations, flags, graduation decisions, email history, timeline) |
| GET | `/students/:id/timeline` — just the timeline array |
| GET | `/students/:id/audit` |
| POST | `/students/:id/track-transition` `{ toTrack, toStage, toProgramStatus, reason, sourceType: "MANUAL"\|"OVERRIDE", overrideReason?, notes? }` — the deliberate "Move Student" action; see Business Rules §7 |

## Project Review

| Method | Path |
|---|---|
| GET | `/project-reviews/rubric` — active `RubricVersion` with parsed dimensions |
| POST | `/project-reviews` `{ studentId, rubricVersionId?, scores: [{dimensionKey, score, reason}] }` — creates a `DRAFT` |
| GET | `/project-reviews/:id` |
| PATCH | `/project-reviews/:id` `{ scores }` — only while `DRAFT` |
| POST | `/project-reviews/:id/complete` `{ scores?, outcomeReason }` — computes total/mandatory/outcome server-side, routes the student, locks the review |

## Video Assessment

| Method | Path |
|---|---|
| GET | `/video/question-sets` |
| POST | `/video/assignments` `{ studentId, questionSetKey?, deadlineAt? }` — student must currently be Track A |
| GET | `/video/assignments/:id` — progress: submitted/evaluated counts, running total, mandatory status |
| POST | `/video/assignments/:id/questions/:questionId/submission` `{ submissionReference }` |
| POST | `/video/assignments/:id/questions/:questionId/evaluation` `{ score, notes }` |
| POST | `/video/assignments/:id/finalize` `{ outcomeReason }` — requires all 10 evaluated; routes A1/A2 |

## Interviews

| Method | Path |
|---|---|
| GET | `/interviews/rung-levels` |
| POST | `/interviews` `{ studentId, interviewType, scheduledStart?, scheduledEnd?, timezone?, interviewerId?, chosenProject?, growthCoachConfirmationStatus? }` |
| PATCH | `/interviews/:id` — reschedule/status/interviewer/confirmation |
| POST | `/interviews/:id/complete` `{ actualStart?, actualEnd?, notes? }` |
| POST | `/interviews/:id/evaluation` `{ highestRungHeld?, breakRung?, breakCauseCategory?, breakCauseNotes?, evidence?, communicationRating?, prescription?, strengths?, weaknesses?, overallFeedback, result? }` |

## Deliverables

Every deliverable is written directly for the student it's assigned to —
there is no template library and no separate checkpoint grouping.

| Method | Path |
|---|---|
| POST | `/deliverables/assignments` `{ studentId, track, direct: { title, gapAddressed, whatStudentMustDo, expectedOutcome, submissionType, submissionRequired, submissionDetails?, verificationCriteria, estimatedTimeValue, estimatedTimeUnit }, dueAt? }` — Admin only |
| GET | `/deliverables/assignments/table?studentId=&track=` — rendered HTML table (used as the `deliverables` email variable), total estimated time as its last row |
| GET | `/deliverables/assignments/estimated-time?studentId=&track=` — `{ value, unit, count, verifiedCount }` |
| POST | `/deliverables/assignments/:id/submission` `{ submissionFromStudent }` |
| POST | `/deliverables/assignments/:id/verify` `{ verificationStatus, feedback }` |

## Growth Coach Evaluations & Graduation

| Method | Path |
|---|---|
| POST | `/growth-coach-evaluations` `{ studentId, track: "A2"\|"B", completion?, quality?, evidence?, demonstratedImprovement?, understanding?, ownership?, abilityToExplain?, foundationalGapsAddressed?, decision, feedback, evaluatorGrowthCoachId? }` |
| POST | `/graduation-decisions` `{ studentId, decision: "GRADUATE"\|"NOT_GRADUATE", reason, relatedInterviewIds? }` |

## Flags

| Method | Path |
|---|---|
| GET | `/flags` — all open flags, most severe first |
| POST | `/flags` `{ studentId, category, severity, title, description }` |
| POST | `/flags/:id/resolve` `{ resolutionNote }` |

## Email

| Method | Path |
|---|---|
| GET | `/email/templates` |
| PATCH | `/email/templates/:id` `{ name?, subject?, bodyHtml?, active? }` — bumps `version` |
| POST | `/email/preview` `{ templateKey, recipients: [{studentId, emailAddress, variables}] }` — renders only, never sends/logs |
| POST | `/email/send` `{ templateKey, recipients, relatedEntityType?, relatedEntityId? }` — rejects empty recipients or any invalid address |
| GET | `/email/events?page=&pageSize=` |

## Audit & Dashboard

| Method | Path |
|---|---|
| GET | `/audit?page=&pageSize=&entityType=&entityId=` |
| GET | `/dashboard` — see `DashboardSummary` shape in `frontend/src/types/index.ts` |
| GET | `/dashboard/track-summary` — program-wide, since-inception track/graduation counts across **all** cohorts; `ProgramTrackSummary` in `frontend/src/types/index.ts`. Track A rolls up A+A1+A2 and GRADUATED wins over the student's last track, matching `/cohorts/:id/dashboard` |

## Import / Export

| Method | Path |
|---|---|
| POST | `/import/students/preview` — multipart `file` (.csv/.xlsx, ≤5MB) → `{ totalRows, validRows, errors, warnings }` |
| POST | `/import/students/commit` `{ rows, cohortId? }` — commits only the validated rows the client got back from preview |
| GET | `/export/students?format=csv\|xlsx&cohortId=&track=` |
| GET | `/export/interviews?format=` |
| GET | `/export/deliverables?format=` |
| GET | `/export/history?format=&studentId=` |

## Settings

| Method | Path |
|---|---|
| GET | `/settings` |
| PUT | `/settings/:key` `{ value, description? }` |
| GET | `/settings/versions/rubrics` |
| GET | `/settings/versions/video-question-sets` |
