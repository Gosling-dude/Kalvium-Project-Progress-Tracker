import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { getDashboardSummary, getProgramWideTrackSummary } from "../domain/services/dashboard.service";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth, requireRole("ADMIN"));

dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ data: await getDashboardSummary() });
  }),
);

// Just the since-inception track/graduation counts, split out from the full
// summary above so the Students page doesn't pay for the action-queue and
// stuck-student queries it never renders.
dashboardRouter.get(
  "/track-summary",
  asyncHandler(async (_req, res) => {
    res.json({ data: await getProgramWideTrackSummary() });
  }),
);
