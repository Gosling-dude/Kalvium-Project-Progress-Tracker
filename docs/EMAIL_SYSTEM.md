# Email System

## Design

Email is a first-class domain capability, not HTML strings scattered through
routes/components:

```
EmailTemplate  — versioned subject + HTML body + declared {{variable}} names
EmailEvent     — one admin-triggered "send" action (may target many students)
EmailRecipient — one row per recipient, storing the FINAL RENDERED body
                 (so a later template edit never changes what a historical
                 email actually said)
EmailDeliveryAttempt — append-only per-recipient attempt log
```

`backend/src/domain/services/email.service.ts` owns rendering
(`{{variable}}` substitution — see `renderTemplate`), preview, and send.
`emailProvider.ts` abstracts the actual transport behind an `EmailProvider`
interface with two implementations:

- **MockEmailProvider** (default, `EMAIL_MODE=mock`) — never contacts a real
  mail server. Logs the send and returns a synthetic `mock-<timestamp>-...`
  message id. This is what tests and local development use, specifically so
  an application bug can never spam a real student's inbox.
- **SmtpEmailProvider** (`EMAIL_MODE=smtp`) — uses `nodemailer` with
  `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD` from the environment.
  **Not exercised against a live mailbox in this session** — verify with a
  disposable/test inbox before enabling in any environment that reaches
  real students.

Switching providers is a one-line environment change (`EMAIL_MODE`); no
code in routes or the domain layer needs to change.

## Templates seeded by default

`TRACK_A_VIDEO_QUESTIONS_ASSIGNED`, `TRACK_A_VIDEO_RESULT`,
`INTERVIEW_SCHEDULED`, `INTERVIEW_FEEDBACK`, `A2_DELIVERABLE_ASSIGNMENT`,
`A2_PROGRESS_RESULT`, `TRACK_B_DELIVERABLE_ASSIGNMENT`,
`TRACK_B_PROGRESS_RESULT`, `PROMOTED_TO_TRACK_A`, `A1_INTERVIEW_SCHEDULE`,
`GRADUATED`, `NOT_GRADUATED`, `RE_EVALUATION`. Default copy is in
`backend/src/domain/constants/emailTemplateSeed.ts`; edit via
`PATCH /api/email/templates/:id` (bumps `version`) or the Emails page in the
Admin UI — never by editing the seed file in a running environment.

## Preview → Send flow

1. Admin picks a template and fills in per-recipient variables (the UI
   reads the template's declared `variables` list, so it never hardcodes
   which placeholders exist).
2. `POST /api/email/preview` renders the final subject/body **without**
   creating any `EmailEvent`/`EmailRecipient` row — nothing is logged until
   the Admin explicitly confirms.
3. `POST /api/email/send` creates the `EmailEvent` + one `EmailRecipient`
   per recipient (with the rendered body already stored), then calls the
   provider once per recipient and records an `EmailDeliveryAttempt` +
   updates the recipient's status. The event's overall `status` is
   `SENT`/`PARTIAL`/`FAILED` based on how many recipients actually
   succeeded — **the API never claims success just because the HTTP call to
   `/send` itself succeeded.**

## Safety rules enforced server-side

- Sending to zero recipients is rejected (`ValidationError`), not silently
  treated as a no-op — this is what prevents a frontend bug from
  "succeeding" at sending nothing while looking like it worked, and more
  importantly prevents a bug that resolves recipients incorrectly from
  silently mass-emailing (recipient count is always explicit and shown in
  the preview).
- Any malformed recipient address rejects the entire send.
- Sending is only ever explicit Admin action in this release (see
  `docs/BUSINESS_RULES.md` "Known limitations" — automatic triggers are
  architected for but not enabled).

## Extending

Adding a new template key: add it to `EMAIL_TEMPLATE_KEY` in
`backend/src/domain/constants/enums.ts`, add default copy to
`emailTemplateSeed.ts`, re-run `npm run seed` (upserts, safe to re-run).
