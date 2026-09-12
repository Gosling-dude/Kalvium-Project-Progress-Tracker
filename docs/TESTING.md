# Testing

## Running

```bash
cd backend
npm test          # runs once (vitest run)
npm run test:watch
npm run typecheck # tsc --noEmit
npm run build     # tsc -p tsconfig.json — must succeed before any commit
```

Frontend:

```bash
cd frontend
npm run typecheck
npm run build
```

## How the backend test suite works

`backend/vitest.config.ts` uses a `globalSetup`
(`tests/globalSetup.ts`) that:
1. Loads `.env.test` (separate `DATABASE_URL=file:./test.db` — **tests never
   touch `dev.db`**).
2. Deletes any existing `test.db` and applies every migration fresh via
   `prisma migrate deploy`.

`tests/setup.ts` registers a global `beforeEach` that truncates every table
(in FK-safe order) and reseeds the baseline reference data (rubric, video
question bank, rung levels, email templates, one admin user) via
`systemSeed.service.ts` — the exact same seeding code `prisma/seed.ts` uses
for dev, so tests and dev/prod bootstrap can never drift apart. This means
**every test starts from a known-clean, fully-seeded database** — no test
depends on another test's leftover state, and `fileParallelism: false`
keeps test files from racing on the shared SQLite file.

## What's covered (mapped to spec §45's required cases)

| Spec case | Test file |
|---|---|
| Project Review: pass / fail-by-total / fail-by-mandatory | `tests/unit/projectReview.test.ts` |
| Project Review: locked after completion, requires meaningful reason | `tests/unit/projectReview.test.ts` |
| Video: A1 / A2-by-mandatory / A2-by-total | `tests/unit/videoAssessment.test.ts` |
| Video: rejects assignment to non-Track-A student; rejects finalize with unevaluated questions (but allows partial evaluation) | `tests/unit/videoAssessment.test.ts` |
| A2 → A1 skips video; A2 stays A2 on insufficient (with history recorded anyway) | `tests/unit/developmentTrack.test.ts` |
| Track B → A goes via Video; Track B stays B on insufficient | `tests/unit/developmentTrack.test.ts` |
| Growth Coach evaluation track-mismatch rejected | `tests/unit/developmentTrack.test.ts` |
| Interview: break rung ≤ held rung enforced both ways; unlimited sequenced interviews | `tests/unit/interviewAndGraduation.test.ts` |
| Graduation: never automatic; explicit GRADUATE/NOT_GRADUATE recorded correctly | `tests/unit/interviewAndGraduation.test.ts` |
| Cohort movement: full history preserved, old enrollment ended not deleted; bulk-move rejects empty list | `tests/unit/historyAndFlags.test.ts` |
| Track transition: always creates history; blocks non-routine moves without override; allows override with reason | `tests/unit/historyAndFlags.test.ts` |
| Flags: create/resolve/audit trail; rejects double-resolve | `tests/unit/historyAndFlags.test.ts` |
| Email: preview renders without logging; send logs event+recipient+attempt via mock provider; rejects empty/invalid recipients | `tests/unit/email.test.ts` |
| Permissions: unauthenticated rejected, ADMIN allowed, GROWTH_COACH allowed on shared endpoints but rejected from admin-only ones, garbage token rejected, health check open | `tests/integration/permissions.test.ts` |
| Move Student (manual track transition) route: routine move succeeds, non-routine blocked, short reason rejected | `tests/integration/trackTransitionRoute.test.ts` |

40 test cases total across 8 files as of this writing.

## What is not covered by automated tests

- **No browser/UI automation.** No browser automation tool was available in
  this session (see the final implementation report). The frontend was
  verified via `tsc -b` (clean), `vite build` (clean), and an end-to-end API
  smoke test against the running dev server (login → dashboard →
  student-detail payload shape → create student → complete Project Review
  → verify resulting track) that exercises the exact contract every page
  consumes — but no one has visually clicked through the rendered UI.
- **No load/performance testing.** Pagination and indexed queries are in
  place (see `docs/ARCHITECTURE.md`), but no test asserts behavior at
  thousands of students.
- **SMTP provider** is implemented but not exercised against a live mailbox.

## Adding a new business-rule test

Follow the existing pattern: import the domain service function directly
(not through HTTP) for unit tests of routing logic, use
`tests/helpers.ts`'s `createCampusCohortStudent(testAdminId)` to get a
disposable student, and assert both the returned value *and* the resulting
`prisma.student.findUniqueOrThrow(...)` state — a routing bug that updates
the return value but not the database (or vice versa) should always be
catchable by a test that checks both.
