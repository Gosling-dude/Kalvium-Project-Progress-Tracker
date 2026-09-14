# Deployment

**Status: prepped for Render (backend) + Vercel (frontend) + Neon (Postgres), not yet deployed.**
Everything below has been written, built, and type-checked in this session,
and the Postgres migration was generated and validated without a live
database (`prisma migrate diff --from-empty`, then `prisma validate`) — but
none of it has been run against a real Render/Vercel/Neon environment yet.
Treat the first real deploy as the actual verification step, not this
document.

## Why there are two Prisma schemas

- `backend/prisma/schema.prisma` — SQLite. Used for local dev and the test
  suite. Zero setup, nothing to provision.
- `backend/prisma/postgres/schema.prisma` — PostgreSQL (Neon in production),
  with its own `migrations/` folder alongside it.

Prisma's `datasource` `provider` must be a literal string — it can't be
switched per-environment inside one schema file — so production needs its
own schema file. Everything else (every model, field, index) must stay
identical between the two; run `npm run check:schema-parity` after editing
either one (it fails loudly on drift). If you add a migration to one, add
the equivalent migration to the other.

One known, deliberate behavior difference the parity check can't catch:
SQLite's `contains` filter is case-insensitive by default; Postgres's is
not. `backend/src/domain/services/student.service.ts`'s student search
(`fullName`/`email`/`chosenProject`) is flagged with a comment there — add
`mode: "insensitive"` to those three filters when you cut over to Postgres,
to keep the search behaving the same way for users.

## Environment variables

### Backend (`backend/.env`, see `backend/.env.example`)

| Variable | Required in prod | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon's **pooled** connection string (`...-pooler.neon.tech/...?sslmode=require`). The app's runtime queries use this. |
| `DIRECT_DATABASE_URL` | Yes (Postgres only) | Neon's **unpooled** connection string. Migrations (`prisma migrate deploy`) run against this — Neon's pooler doesn't support the DDL/session behavior migrations need. |
| `JWT_SECRET` | Yes | Long random value — generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. The app **refuses to start** in production if this is missing or is the checked-in dev default (see `src/config/env.ts`). |
| `JWT_EXPIRES_IN` | No | Default `12h`. |
| `COOKIE_NAME` | No | Default `kalvium_session`. Note: the frontend actually authenticates via a Bearer token in `Authorization` (stored in localStorage), not this cookie — it's a secondary fallback path (see `requireAuth`). |
| `PORT` | No | Default `4000`. Render sets this itself; leave it alone if using the included `render.yaml`. |
| `NODE_ENV` | Yes | `production` in prod — disables pretty-printed logs, sets cookies `Secure`+`SameSite=None` (needed since Vercel and Render are different origins), and enables the startup checks above. |
| `CORS_ORIGIN` | Yes | The deployed frontend's exact origin(s). Comma-separated if more than one (e.g. production domain + a Vercel preview URL). No wildcard support — an unlisted origin gets a clean `403`. |
| `EMAIL_MODE` | Yes | `mock` until an SMTP provider is verified — see `docs/EMAIL_SYSTEM.md`. Never default to `smtp` without testing against a real mailbox first. |
| `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Only if `EMAIL_MODE=smtp` | |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Only for seeding | Change the password immediately after first login in any shared environment. The seed script only sets it if the user doesn't already exist (`upsert` with `update: {}`), so re-running seed never resets a changed password. `prisma/seed.ts` also refuses to insert its fake demo students/cohorts when `NODE_ENV=production`. |

### Frontend (`frontend/.env`, see `frontend/.env.example`)

| Variable | Notes |
|---|---|
| `VITE_API_URL` | Defaults to `/api` (works with the same-origin dev proxy in `vite.config.ts`). In production, set this to the deployed backend's full URL (e.g. `https://your-backend.onrender.com/api`) — Vercel and Render are different origins, so this can't be relative. Set it as a Vercel project env var (`vite build` inlines it at build time). |

## Deploying

### 1. Neon (Postgres)

1. Create a Neon project and database.
2. Copy both connection strings from the Neon dashboard: the **pooled** one
   (has `-pooler` in the hostname) → `DATABASE_URL`, and the **direct**
   one → `DIRECT_DATABASE_URL`. Both need `?sslmode=require`.
3. Nothing else to do here — the first Render deploy runs the migration
   (see `render.yaml`'s build command).

### 2. Render (backend)

The included `render.yaml` (repo root) is a Blueprint — in the Render
dashboard, "New +" → "Blueprint", point it at this repo, and it reads the
file automatically. It will prompt for every variable marked `sync: false`
(the two Neon URLs, `CORS_ORIGIN`, email settings, seed admin credentials);
`JWT_SECRET` is auto-generated.

Without the blueprint, configure a Web Service manually with:
- Root directory: `backend`
- Build command: `npm ci && npm run build:postgres` (runs the schema-parity
  check, generates the Postgres Prisma client, applies migrations via
  `DIRECT_DATABASE_URL`, then compiles TypeScript)
- Start command: `npm start`
- Health check path: `/health`

After the first deploy, run the one-off seed command from the Render shell
(or a Render Job) to create the bootstrap admin and baseline reference data
(rubric, video question bank, email templates):
```bash
npx prisma db execute --schema prisma/postgres/schema.prisma --stdin <<< "select 1" # sanity check connectivity
npm run seed
```
(`seed` uses whatever `@prisma/client` is currently generated — which the
build command already pointed at Postgres — so no extra flags needed.)

### 3. Vercel (frontend)

- Root directory: `frontend` (this repo is a monorepo; set this in the
  Vercel project's General settings).
- Framework preset: Vite (auto-detected). `frontend/vercel.json` sets the
  build command, output directory, the SPA rewrite (React Router needs
  every path to fall through to `index.html`, or a refresh on `/students/x`
  404s), and long-lived caching for hashed asset filenames.
- Env var: `VITE_API_URL` = your Render backend's URL + `/api`.
- Once you know the Vercel URL (and any custom domain), set it as
  `CORS_ORIGIN` on the Render backend and redeploy the backend — the two
  are circularly dependent on first deploy, which is normal.

## Local build & start (for reference / non-Render hosts)

```bash
# Backend — SQLite (dev)
cd backend
npm ci
npx prisma migrate deploy
npm run build
npm start

# Backend — Postgres (prod-equivalent)
cd backend
npm ci
npm run build:postgres   # schema-parity check + generate + migrate deploy + tsc, all against Postgres
npm start

# Frontend
cd frontend
npm ci
npm run build             # -> dist/, serve as static files behind any web server/CDN
```

## Health check

`GET /health` (unauthenticated) returns `{ status: "ok", uptime }`. Point
your platform's health check / load balancer probe at this — `render.yaml`
already does.

## Security checklist before going live

- [x] `JWT_SECRET` missing or left at the dev default now makes the app **refuse to start** in production (`src/config/env.ts`) — nothing to double-check manually, just don't skip setting it.
- [ ] `SEED_ADMIN_PASSWORD` has been changed from the default after first login.
- [x] `CORS_ORIGIN` unlisted origins get a clean `403`, never a wildcard-allow (`src/app.ts`).
- [ ] `NODE_ENV=production` is actually set (Render sets this by default for web services, but confirm).
- [ ] `EMAIL_MODE=smtp` only after sending a real test email to a disposable inbox and confirming `EmailDeliveryAttempt` rows show `SENT`.
- [x] No `.env` file is committed (gitignored at the repo root).
- [ ] Neon connection strings are the ones with `?sslmode=require`, and not shared outside the Render service's env vars.
- [x] Rate limiting (`express-rate-limit`) applied to `/api/auth/login` (20/15min) and `/api` generally (300/min) — tune in `backend/src/app.ts` if traffic patterns need it.
- [x] `app.set("trust proxy", 1)` is set (`src/app.ts`) — `express-rate-limit` now keys on the real client IP behind Render's proxy, not the proxy's own IP.
- [x] Auth cookie is `Secure` + `SameSite=None` in production (`src/routes/auth.routes.ts`) — correct for Render/Vercel being different origins. (Not load-bearing for the app's actual auth, which uses a Bearer token — see the note under `COOKIE_NAME` above — but kept correct regardless.)
- [x] Graceful shutdown on `SIGTERM`/`SIGINT` (`src/server.ts`) — in-flight requests finish and the DB pool closes cleanly on every Render deploy/restart, instead of being cut off mid-response.
- [ ] `prisma/postgres/schema.prisma` and `prisma/schema.prisma` still match (`npm run check:schema-parity`) — re-run after any schema change.
- [ ] The `mode: "insensitive"` search fix (see "Why there are two Prisma schemas" above) has been applied to `student.service.ts` once actually running on Postgres.

## What's still genuinely untested

Everything above was written and validated as far as possible without a
live Postgres connection (schema validation, DB-less migration generation,
full local test suite against SQLite, manual CORS/cookie/shutdown checks
against the running dev server). The one thing that can only be verified
against the real Neon database is: **does `npm run build:postgres` apply
the generated migration cleanly?** Recommend doing that once, watching the
Render build log, before pointing real users at it.
