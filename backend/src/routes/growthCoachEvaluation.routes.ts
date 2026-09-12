import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ForbiddenError } from "../lib/errors";
import { GROWTH_COACH_DECISION } from "../domain/constants/enums";
import { getGrowthCoachForUserId } from "../domain/services/campus.service";
import {
  confirmGrowthCoachEvaluationTransition,
  dismissGrowthCoachEvaluationTransition,
  recordGrowthCoachEvaluation,
} from "../domain/services/developmentTrack.service";

export const growthCoachEvaluationRouter = Router();
growthCoachEvaluationRouter.use(requireAuth, requireRole("ADMIN", "GROWTH_COACH"));

const adminOnly = requireRole("ADMIN");

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

    let actorGrowthCoachId: string | null | undefined;
    if (req.user!.role === "GROWTH_COACH") {
      const coach = await getGrowthCoachForUserId(req.user!.id);
      if (!coach) throw new ForbiddenError("No Growth Coach profile is linked to this account.");
      actorGrowthCoachId = coach.id;
    }

    res.status(201).json({ data: await recordGrowthCoachEvaluation({ ...input, actorId: req.user!.id, actorGrowthCoachId }) });
  }),
);

// Applies a Growth-Coach-recorded evaluation's pending transition — the only
// way that evaluation actually moves the student (movement rests with
// Program Admins, never automatic from the coach's own action).
growthCoachEvaluationRouter.post(
  "/:id/confirm",
  adminOnly,
  asyncHandler(async (req, res) => {
    res.json({ data: await confirmGrowthCoachEvaluationTransition(req.params.id, req.user!.id) });
  }),
);

growthCoachEvaluationRouter.post(
  "/:id/dismiss",
  adminOnly,
  asyncHandler(async (req, res) => {
    res.json({ data: await dismissGrowthCoachEvaluationTransition(req.params.id, req.user!.id) });
  }),
);
