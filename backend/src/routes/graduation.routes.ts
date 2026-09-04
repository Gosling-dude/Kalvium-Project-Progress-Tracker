import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { GRADUATION_DECISION } from "../domain/constants/enums";
import { recordGraduationDecision } from "../domain/services/graduation.service";

export const graduationRouter = Router();
graduationRouter.use(requireAuth, requireRole("ADMIN"));

graduationRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string().min(1),
      decision: z.enum(GRADUATION_DECISION),
      reason: z.string().min(10),
      relatedInterviewIds: z.array(z.string()).optional(),
    });
    const input = schema.parse(req.body);
    res.status(201).json({ data: await recordGraduationDecision({ ...input, actorId: req.user!.id }) });
  }),
);
