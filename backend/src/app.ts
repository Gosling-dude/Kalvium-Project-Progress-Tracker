import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

import { authRouter } from "./routes/auth.routes";
import { campusRouter, growthCoachRouter } from "./routes/campus.routes";
import { cohortRouter } from "./routes/cohort.routes";
import { studentRouter } from "./routes/student.routes";
import { projectReviewRouter } from "./routes/projectReview.routes";
import { videoRouter } from "./routes/video.routes";
import { interviewRouter } from "./routes/interview.routes";
import { deliverableRouter } from "./routes/deliverable.routes";
import { growthCoachEvaluationRouter } from "./routes/growthCoachEvaluation.routes";
import { graduationRouter } from "./routes/graduation.routes";
import { flagRouter } from "./routes/flag.routes";
import { emailRouter } from "./routes/email.routes";
import { auditRouter } from "./routes/audit.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { importRouter, exportRouter } from "./routes/importExport.routes";
import { settingsRouter } from "./routes/settings.routes";
import { tasksRouter } from "./routes/tasks.routes";
import { userRouter } from "./routes/user.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger, autoLogging: !env.isTest }));

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false });
  app.use("/api/auth/login", authLimiter);

  const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false });
  app.use("/api", apiLimiter);

  app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

  app.use("/api/auth", authRouter);
  app.use("/api/campuses", campusRouter);
  app.use("/api/growth-coaches", growthCoachRouter);
  app.use("/api/cohorts", cohortRouter);
  app.use("/api/students", studentRouter);
  app.use("/api/project-reviews", projectReviewRouter);
  app.use("/api/video", videoRouter);
  app.use("/api/interviews", interviewRouter);
  app.use("/api/deliverables", deliverableRouter);
  app.use("/api/growth-coach-evaluations", growthCoachEvaluationRouter);
  app.use("/api/graduation-decisions", graduationRouter);
  app.use("/api/flags", flagRouter);
  app.use("/api/email", emailRouter);
  app.use("/api/audit", auditRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/import", importRouter);
  app.use("/api/export", exportRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/tasks", tasksRouter);
  app.use("/api/users", userRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
