# Architecture

## Stack

| Layer | Choice | Why |
|---|---|---|
| Backend runtime | Node.js 20 + TypeScript, Express | Small, explicit, no framework magic hiding request handling — easy to reason about for an operational tool. |
| ORM / DB | Prisma + SQLite (dev/test), PostgreSQL-ready | SQLite needs no external service, so `npm install && npm run seed && npm run dev` just works. Enum-like fields are modeled as validated strings (not native DB enums) specifically so switching to PostgreSQL later is a one-line datasource change, not a schema rewrite. See `docs/DEPLOYMENT.md`. |
| Validation | Zod | Runtime validation of every request body, colocated with routes. |
| Auth | JWT (Bearer or httpOnly cookie) + bcrypt | Stateless, works equally well for the SPA (Bearer token in `Authorization`) and for future server-rendered or cookie-based clients. |
| Frontend | React + TypeScript + Vite + Tailwind | Fast dev loop, small bundle, utility CSS matches the "information-dense operational tool" brief better than a component library's opinionated chrome. |
| Server state | TanStack Query | Caching, loading/error states, and cache invalidation on mutation — without hand-rolling it per page. |
| Testing | Vitest + Supertest | Fast, TypeScript-native; Supertest drives the real Express app for permission/route tests. |

## Why the Admin-only scope doesn't require a rewrite later

The system is architected around **roles as data, not as separate apps**:

- `User.role` is one of `ADMIN | TEACHING_NINJA | GROWTH_COACH` (see
  `backend/src/domain/constants/enums.ts`). `requireRole(...)` middleware
  takes a list of allowed roles per route; today every route lists `ADMIN`
  only. Adding a Teaching Ninja or Growth Coach experience means writing new
  routes/pages that call `requireRole("TEACHING_NINJA")` etc. — the auth
  plumbing, JWT issuance, and permission-checking middleware need no changes.
- `Interview.interviewerId`, `VideoQuestionEvaluation.reviewerId`,
  `GrowthCoachEvaluation.evaluatorId` already point at real `User`/
  `GrowthCoach` rows. A Teaching Ninja login would see "my assigned
  interviews" by filtering on `interviewerId = currentUser.id` against
  data that already exists — no schema change.
- `GrowthCoach` is a first-class entity (not a free-text field on `Student`)
  specifically so a future Growth Coach login can be tied to that same row.
- Every workflow's *business logic* lives in a domain service
  (`backend/src/domain/services/*.ts`), not in a route handler. A future
  Growth Coach-facing route for `recordGrowthCoachEvaluation` would call the
  exact same service the Admin UI calls today — the routing/promotion rules
  cannot drift between an Admin-entered evaluation and a future
  Growth-Coach-entered one, because there is only one implementation.

## Directory layout

```
backend/
  prisma/
    schema.prisma          # single source of truth for the data model
    migrations/             # every schema change, applied in order
    seed.ts                 # reference-data + realistic dev dataset
  src/
    config/env.ts            # all environment variables, one place
    domain/
      constants/             # enums.ts (validated string unions), rubric.ts
                              # (default rubric + video question bank + rung
                              # levels — the program's actual policy values)
      services/               # one file per subsystem; this is where every
                              # business rule lives (see below)
      validation/             # zod schemas shared between routes
    lib/                      # prisma client, logger, errors, csv helper
    middleware/               # auth (JWT), error handler
    routes/                   # thin HTTP adapters over domain services
    app.ts, server.ts
  tests/
    unit/                     # one file per business-rule area
    integration/               # permission + route-level tests via supertest

frontend/
  src/
    lib/
      api.ts                  # single axios instance, 401 handling
      queries.ts               # EVERY network call the app makes, in one file
      auth.tsx                 # auth context/provider
    components/ui/             # Button, Badge, Table, Modal, Form primitives
    pages/                     # one file per top-level route
    pages/student/              # Student 360 tabs (the most important page)
```

## The central design principle: state vs. history

Every "current" field on `Student` (`currentTrack`, `currentStage`,
`programStatus`) is a **cached projection** of the append-only
`TrackTransition` table. No code updates `Student.currentTrack` directly —
every transition goes through `trackTransition.service.ts`'s
`recordTrackTransition`, which:

1. Validates the move is either a routine program step or an explicit,
   reasoned `OVERRIDE`.
2. Writes an immutable `TrackTransition` row (before-state, after-state,
   reason, actor, source, related evaluation).
3. Updates `Student`'s cached current-state fields in the same transaction.
4. Writes an `AuditEvent`.

The same pattern repeats for cohort membership (`CohortEnrollment` — moving
cohorts ends one row and starts another, never deletes) and for every other
"important status change" the spec calls out (see `docs/BUSINESS_RULES.md`).

## Where business rules live (and why routes stay thin)

Every routing decision (Project Review → A/B, Video → A1/A2, Growth Coach →
promote/continue, Graduation → graduate/re-evaluate) is implemented in
exactly one domain service function, which:

- Validates input server-side (never trusts a client-computed total/outcome).
- Computes the outcome.
- Persists the evaluation record *and* the resulting transition in the same
  logical operation.
- Returns a structured result.

Routes (`backend/src/routes/*.ts`) only: validate the request shape with
zod, call the service, and shape the HTTP response. This is what makes it
possible to test business rules directly (see `docs/TESTING.md`) without
spinning up HTTP at all.

## Versioned policy data

`RubricVersion` and `VideoQuestionSetVersion` hold the actual scoring
configuration as data (thresholds, mandatory minimums, question text) rather
than as constants scattered through the code. A `ProjectReview` or
`VideoAssignment` row stores *which version* was used, so changing the
rubric or question bank in the future never rewrites the meaning of a past
decision — see `docs/BUSINESS_RULES.md` §"Versioned rules".

## Known architectural trade-offs

- **SQLite for dev/test, not yet wired to PostgreSQL.** The schema was
  designed to make that switch mechanical (see `docs/DEPLOYMENT.md`), but it
  has not been executed or tested against a live Postgres instance in this
  session.
- **No file storage subsystem.** Per spec, student video submissions are
  tracked as metadata/links, not uploaded binaries — so no S3/blob storage
  was built. Deliverable submissions and resume references are also link/
  text fields, not file uploads (`import.service.ts`'s CSV/XLSX import is
  the one place that accepts an actual file upload, via `multer`
  memory storage, capped at 5MB, never written to disk).
- **Single deployable API + SPA**, not micro-services — appropriate for the
  Admin-only scope; nothing about the domain-service boundary prevents
  splitting later if a Teaching Ninja or Growth Coach surface needs its own
  deployment.
