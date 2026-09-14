import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const DEV_ONLY_JWT_SECRET = "dev-only-insecure-secret-change-me-32chars";
const DEV_ONLY_SEED_PASSWORD = "ChangeMe123!";

const nodeEnv = process.env.NODE_ENV ?? "development";
const jwtSecret = required("JWT_SECRET", DEV_ONLY_JWT_SECRET);
const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD ?? DEV_ONLY_SEED_PASSWORD;

// Fail fast at boot rather than quietly running production on the checked-in
// dev defaults — cheaper to catch here than to discover after a deploy.
if (nodeEnv === "production") {
  if (jwtSecret === DEV_ONLY_JWT_SECRET || jwtSecret.length < 32) {
    throw new Error(
      "JWT_SECRET is missing or is the insecure dev default. Set a long random JWT_SECRET (>= 32 chars) in production.",
    );
  }
  if (seedAdminPassword === DEV_ONLY_SEED_PASSWORD) {
    // Not fatal on its own (seeding is opt-in and only touches a user that
    // doesn't already exist) but worth surfacing loudly if it slips through.
    // eslint-disable-next-line no-console
    console.warn(
      "[env] SEED_ADMIN_PASSWORD is still the dev default — change it before (or immediately after) seeding a production database.",
    );
  }
}

// CORS_ORIGIN may be a single origin or a comma-separated list (e.g. a
// production domain plus Vercel preview-deployment URLs). No wildcard
// support on purpose — every allowed origin must be listed explicitly.
const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const env = {
  nodeEnv,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL", "file:./dev.db"),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  cookieName: process.env.COOKIE_NAME ?? "kalvium_session",
  corsOrigins,
  emailMode: (process.env.EMAIL_MODE ?? "mock") as "mock" | "smtp",
  emailFrom: process.env.EMAIL_FROM ?? "Kalvium Project Defence <no-reply@kalvium.example>",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
  },
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@kalvium.example",
  seedAdminPassword,
  isTest: process.env.NODE_ENV === "test",
};
