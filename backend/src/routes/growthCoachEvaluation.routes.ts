import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { GROWTH_COACH_DECISION } from "../domain/constants/enums";
import { recordGrowthCoachEvaluation } from "../domain/services/developmentTrack.service";

export const growthCoachEvaluationRouter = Router();
growthCoachEvaluationRouter.use(requireAuth, requireRole("ADMIN"));

growthCoachEvaluationRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string().min(1),
      track: z.enum(["A2", "B"]),
      completion: z.number().int().min(0).max(5).optional(),
      quality: z.number().int().min(0).max(5).optional(),
      evidence: z.string().optional(),
      demonstratedImprovement: z.number().int().min(0).max(5).optional(),
      understanding: z.number().int().min(0).max(5).optional(),
      ownership: z.number().int().min(0).max(5).optional(),
      abilityToExplain: z.number().int().min(0).max(5).optional(),
      foundationalGapsAddressed: z.boolean().optional(),
      decision: z.enum(GROWTH_COACH_DECISION),
      feedback: z.string().min(10),
      evaluatorGrowthCoachId: z.string().optional(),
    });
    const input = schema.parse(req.body);
    res.status(201).json({ data: await recordGrowthCoachEvaluation({ ...input, actorId: req.user!.id }) });
  }),
);
