# Kalvium Project Defence Progress Tracker

A program-progression engine and operational tracker for the Kalvium Project
Defence program. This release implements the **Admin/Manager** experience
end-to-end; Teaching Ninja and Growth Coach roles are scaffolded in the data
model and authorization layer but do not yet have dedicated UIs (see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)).

For the full picture, read, in this order:

1. This file — how to run it locally.
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack, layout, extension points.
3. [`docs/BUSINESS_RULES.md`](docs/BUSINESS_RULES.md) — every routing rule, threshold, and why it exists.
4. [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — every entity and relationship.
5. [`docs/API.md`](docs/API.md) — every endpoint.
6. [`docs/EMAIL_SYSTEM.md`](docs/EMAIL_SYSTEM.md), [`docs/IMPORT_MAPPING.md`](docs/IMPORT_MAPPING.md), [`docs/TESTING.md`](docs/TESTING.md), [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — supporting subsystems.

## Repository layout

```
backend/   Node.js + TypeScript + Express + Prisma API
frontend/  React + TypeScript + Vite + Tailwind Admin SPA
docs/      Documentation listed above
```

## Prerequisites

- Node.js 20+ and npm
- No external database server is required for local development — the
  backend uses a file-based SQLite database by default (see
  `docs/DEPLOYMENT.md` for switching to PostgreSQL in production).

## Running locally

### 1. Backend

```bash
cd backend
cp .env.example .env        # defaults work out of the box for local dev
npm install
npx prisma migrate deploy   # applies all migrations to backend/prisma/dev.db
npm run seed                # seeds rubric, video question bank, rung levels,
                             # email templates, an admin user, and a realistic
                             # dev dataset spanning every program stage
npm run dev                 # starts the API on http://localhost:4000
```

Default seeded admin login: `admin@kalvium.example` / `ChangeMe123!`
(override via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` in `.env` before
seeding — change this password immediately in any shared environment).

### 2. Frontend

```bash
cd frontend
cp .env.example .env        # VITE_API_URL defaults to /api, proxied to :4000 in dev
npm install
npm run dev                 # starts the Admin SPA on http://localhost:5173
```

Open http://localhost:5173 and sign in with the admin credentials above.

### 3. Running tests

```bash
cd backend
npm test                    # 40 vitest cases covering the critical business
                             # rules — see docs/TESTING.md
```

### 4. Production builds

```bash
cd backend && npm run build && npm start
cd frontend && npm run build && npm run preview
```

## What's implemented

Cohorts (with full enrollment history) · Students + search/filter/sort/
pagination · Student 360 (identity, timeline, every subsystem in one page) ·
Project/Resume Review rubric with server-side Track A/B routing · Track A
video question bank + partial evaluation + A1/A2 routing · Interviews with
the R1–R5 rung model, unlimited sequence, break-rung validation · A2 / Track
B deliverables, checkpoints, and the Growth Coach evaluation gate (with the
A2-skips-video vs. B-redoes-video distinction enforced server-side) ·
Explicit graduation/re-evaluation decisions · Flags/concerns · Append-only
track-transition and audit history · Email templates/preview/send/logging
(mock provider by default — see `docs/EMAIL_SYSTEM.md`) · CSV/XLSX import
(preview → commit) and export · An operational dashboard with an action
queue, not decorative charts.

See `docs/BUSINESS_RULES.md` §"Known limitations" and the final
implementation report in the project conversation history for what is
intentionally out of scope for this release.
