import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL", "file:./dev.db"),
  jwtSecret: required("JWT_SECRET", "dev-only-insecure-secret-change-me-32chars"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "12h",
  cookieName: process.env.COOKIE_NAME ?? "kalvium_session",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  emailMode: (process.env.EMAIL_MODE ?? "mock") as "mock" | "smtp",
  emailFrom: process.env.EMAIL_FROM ?? "Kalvium Project Defence <no-reply@kalvium.example>",
  smtp: {
    host: process.env.SMTP_HOST ?? "",
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
  },
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? "admin@kalvium.example",
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!",
  isTest: process.env.NODE_ENV === "test",
};
