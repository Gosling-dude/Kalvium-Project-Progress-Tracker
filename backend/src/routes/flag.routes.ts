import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { FLAG_CATEGORY, FLAG_SEVERITY } from "../domain/constants/enums";
import { createFlag, listOpenFlags, resolveFlag } from "../domain/services/flag.service";

export const flagRouter = Router();
flagRouter.use(requireAuth, requireRole("ADMIN"));

flagRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listOpenFlags() });
  }),
);

flagRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string().min(1),
      category: z.enum(FLAG_CATEGORY),
      severity: z.enum(FLAG_SEVERITY),
      title: z.string().min(1),
      description: z.string().min(1),
    });
    const input = schema.parse(req.body);
    res.status(201).json({ data: await createFlag({ ...input, actorId: req.user!.id }) });
  }),
);

flagRouter.post(
  "/:id/resolve",
  asyncHandler(async (req, res) => {
    const schema = z.object({ resolutionNote: z.string().min(1) });
    const input = schema.parse(req.body);
    res.json({ data: await resolveFlag(req.params.id, input, req.user!.id) });
  }),
);
