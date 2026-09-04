import pino from "pino";
import { env } from "../config/env";

// Sensitive fields (passwords, tokens, notes/flags free-text) are redacted so
// they never end up in application logs — see section 55/43 of the spec.
export const logger = pino({
  level: env.isTest ? "silent" : env.nodeEnv === "production" ? "info" : "debug",
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.passwordHash",
      "*.notes",
      "*.description",
      "*.resolutionNote",
    ],
    censor: "[REDACTED]",
  },
  transport:
    env.nodeEnv === "production"
      ? undefined
      : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } },
});
