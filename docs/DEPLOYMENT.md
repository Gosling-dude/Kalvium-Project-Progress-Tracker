# Deployment

**Status: not deployed.** This document is preparation for when the user
wants to deploy — no hosting, database, or email provider has been
provisioned in this session, and none of the steps below have been
executed against a real environment. Per the working agreement, actual
deployment only happens once the user explicitly provides the credentials
below and asks for it.

## Environment variables

### Backend (`backend/.env`, see `backend/.env.example`)

| Variable | Required in prod | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | `file:./dev.db` locally. For production, a PostgreSQL connection string — see "Switching to PostgreSQL" below. |
| `JWT_SECRET` | Yes | Must be a long random value in production — the checked-in default is explicitly labeled dev-only and insecure. |
| `JWT_EXPIRES_IN` | No | Default `12h`. |
| `COOKIE_NAME` | No | Default `kalvium_session`. |
| `PORT` | No | Default `4000`. |
| `NODE_ENV` | Yes | `production` in prod — disables pretty-printed logs, tightens cookie `secure` flag. |
| `CORS_ORIGIN` | Yes | Must be set to the deployed frontend's exact origin in production. |
| `EMAIL_MODE` | Yes | `mock` until an SMTP provider is verified — see `docs/EMAIL_SYSTEM.md`. Never default to `smtp` without testing against a real mailbox first. |
| `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | Only if `EMAIL_MODE=smtp` | |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | Only for seeding | Change the password immediately after first login in any shared environment; the seed script only sets it if the user doesn't already exist (`upsert` with `update: {}`), so re-running seed never resets a changed password. |

### Frontend (`frontend/.env`, see `frontend/.env.example`)

| Variable | Notes |
|---|---|
| `VITE_API_URL` | Defaults to `/api` (works with the same-origin proxy setup in `vite.config.ts` for dev). In production, point this at the deployed API's base URL if the frontend and backend are on different origins, and make sure `CORS_ORIGIN` on the backend matches. |

## Build & start

```bash
# Backend
cd backend
npm ci
npx prisma migrate deploy   # applies migrations without prompting; safe for CI/CD
npm run build               # tsc -> dist/
npm start                   # node dist/server.js

# Frontend
cd frontend
npm ci
npm run build                # -> dist/, serve as static files behind any web server/CDN
```

## Health check

`GET /health` (unauthenticated) returns `{ status: "ok", uptime }`. Point
your platform's health check / load balancer probe at this.

## Switching to PostgreSQL for production

The schema was deliberately designed to make this a small, mechanical
change (see `docs/ARCHITECTURE.md`):

1. In `backend/prisma/schema.prisma`, change:
   ```prisma
   datasource db {
     provider = "postgresql"   // was "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` to a real PostgreSQL connection string.
3. Delete `backend/prisma/migrations/` and regenerate a fresh initial
   migration against Postgres (`npx prisma migrate dev --name init`) —
   SQLite and PostgreSQL migration SQL are not interchangeable, so the
   existing SQLite migration history cannot be replayed as-is against
   Postgres. Because every "enum" is already a validated `String` column
   (not a native SQLite feature), no field types need to change.
4. Re-run `npm run seed`.

**This has not been executed or tested in this session** — treat step 3 as
the one part of this migration that needs verification (run it against a
disposable database first) rather than assuming it will apply cleanly.

## Security checklist before going live

- [ ] `JWT_SECRET` is a real random secret, not the dev default.
- [ ] `SEED_ADMIN_PASSWORD` has been changed from the default after first login.
- [ ] `CORS_ORIGIN` is the exact deployed frontend origin (not `*`).
- [ ] `NODE_ENV=production`.
- [ ] `EMAIL_MODE=smtp` only after sending a real test email to a disposable inbox and confirming `EmailDeliveryAttempt` rows show `SENT`.
- [ ] No `.env` file is committed (already gitignored).
- [ ] The database file/connection string is not publicly readable.
- [ ] Rate limiting (`express-rate-limit`, already applied to `/api/auth/login` and `/api` generally) is appropriate for expected traffic — tune `windowMs`/`limit` in `backend/src/app.ts` if needed.
- [ ] If deployed behind a reverse proxy/load balancer, set `app.set("trust proxy", ...)` in `backend/src/app.ts` (currently unset) so `express-rate-limit` keys on the real client IP instead of the proxy's — otherwise all traffic looks like one client and either everyone gets rate-limited together or the limiter is ineffective.

## What to hand over when ready to deploy

When the user is ready to actually deploy, they will need to provide (and
only at that point should these be requested, per the working agreement):

1. A hosting target for the backend (and whether the frontend is served
   from the same host, a static host/CDN, or split).
2. A production PostgreSQL connection string (or confirmation SQLite is
   acceptable for a low-traffic deployment — note SQLite on most PaaS
   platforms loses data on redeploy unless a persistent volume is
   attached).
3. Real SMTP credentials, only once ready to move off `EMAIL_MODE=mock`.
4. The exact production frontend origin, for `CORS_ORIGIN`.
