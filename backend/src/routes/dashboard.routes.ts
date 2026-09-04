import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { getDashboardSummary } from "../domain/services/dashboard.service";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth, requireRole("ADMIN"));

dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ data: await getDashboardSummary() });
  }),
);
