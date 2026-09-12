import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  createCampus,
  createGrowthCoach,
  listCampuses,
  listGrowthCoaches,
  updateCampus,
  updateGrowthCoach,
} from "../domain/services/campus.service";

export const campusRouter = Router();
campusRouter.use(requireAuth, requireRole("ADMIN"));

campusRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ data: await listCampuses(req.query.includeInactive === "true") });
  }),
);

campusRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const schema = z.object({ name: z.string().min(1), code: z.string().min(1) });
    const input = schema.parse(req.body);
    res.status(201).json({ data: await createCampus(input, req.user!.id) });
  }),
);

campusRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const schema = z.object({ name: z.string().min(1).optional(), code: z.string().min(1).optional(), active: z.boolean().optional() });
    const input = schema.parse(req.body);
    res.json({ data: await updateCampus(req.params.id, input, req.user!.id) });
  }),
);

export const growthCoachRouter = Router();
growthCoachRouter.use(requireAuth, requireRole("ADMIN"));

growthCoachRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json({ data: await listGrowthCoaches(req.query.includeInactive === "true") });
  }),
);

growthCoachRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email(),
      campusId: z.string().optional(),
      password: z.string().min(8).optional(),
    });
    const input = schema.parse(req.body);
    res.status(201).json({ data: await createGrowthCoach(input, req.user!.id) });
  }),
);

growthCoachRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      campusId: z.string().nullable().optional(),
      active: z.boolean().optional(),
      password: z.string().min(8).optional(),
    });
    const input = schema.parse(req.body);
    res.json({ data: await updateGrowthCoach(req.params.id, input, req.user!.id) });
  }),
);
