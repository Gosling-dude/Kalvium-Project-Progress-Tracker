import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  completeProjectReview,
  createProjectReview,
  getProjectReview,
  updateProjectReview,
} from "../domain/services/projectReview.service";
import {
  completeProjectReviewSchema,
  createProjectReviewSchema,
  updateProjectReviewSchema,
} from "../domain/validation/projectReview.schema";
import { prisma } from "../lib/prisma";

export const projectReviewRouter = Router();
projectReviewRouter.use(requireAuth, requireRole("ADMIN"));

projectReviewRouter.get(
  "/rubric",
  asyncHandler(async (_req, res) => {
    const rubric = await prisma.rubricVersion.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" } });
    res.json({ data: rubric ? { ...rubric, dimensions: JSON.parse(rubric.dimensions) } : null });
  }),
);

projectReviewRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createProjectReviewSchema.parse(req.body);
    res.status(201).json({ data: await createProjectReview({ ...input, reviewerId: req.user!.id }) });
  }),
);

projectReviewRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ data: await getProjectReview(req.params.id) });
  }),
);

projectReviewRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateProjectReviewSchema.parse(req.body);
    res.json({ data: await updateProjectReview(req.params.id, input, req.user!.id) });
  }),
);

projectReviewRouter.post(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const input = completeProjectReviewSchema.parse(req.body);
    res.json({ data: await completeProjectReview(req.params.id, input, req.user!.id) });
  }),
);
