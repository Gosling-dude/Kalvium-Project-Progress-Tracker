import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import {
  assignVideoQuestionSet,
  finalizeVideoAssessment,
  getVideoAssignmentProgress,
  recordQuestionEvaluation,
  recordSubmission,
} from "../domain/services/videoAssessment.service";
import { prisma } from "../lib/prisma";

export const videoRouter = Router();
videoRouter.use(requireAuth, requireRole("ADMIN"));

videoRouter.get(
  "/question-sets",
  asyncHandler(async (_req, res) => {
    const sets = await prisma.videoQuestionSet.findMany({
      include: { versions: { include: { questions: { orderBy: { order: "asc" } } }, orderBy: { versionNumber: "desc" } } },
    });
    res.json({ data: sets });
  }),
);

videoRouter.post(
  "/assignments",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string().min(1),
      questionSetKey: z.string().optional(),
      deadlineAt: z.coerce.date().optional(),
    });
    const input = schema.parse(req.body);
    res.status(201).json({ data: await assignVideoQuestionSet({ ...input, actorId: req.user!.id }) });
  }),
);

videoRouter.get(
  "/assignments/:id",
  asyncHandler(async (req, res) => {
    res.json({ data: await getVideoAssignmentProgress(req.params.id) });
  }),
);

videoRouter.post(
  "/assignments/:id/questions/:questionId/submission",
  asyncHandler(async (req, res) => {
    const schema = z.object({ submissionReference: z.string().min(1) });
    const input = schema.parse(req.body);
    res.json({
      data: await recordSubmission({
        videoAssignmentId: req.params.id,
        questionId: req.params.questionId,
        submissionReference: input.submissionReference,
        actorId: req.user!.id,
      }),
    });
  }),
);

videoRouter.post(
  "/assignments/:id/questions/:questionId/evaluation",
  asyncHandler(async (req, res) => {
    const schema = z.object({ score: z.number().int().min(0), notes: z.string().min(1) });
    const input = schema.parse(req.body);
    res.json({
      data: await recordQuestionEvaluation({
        videoAssignmentId: req.params.id,
        questionId: req.params.questionId,
        score: input.score,
        notes: input.notes,
        reviewerId: req.user!.id,
      }),
    });
  }),
);

videoRouter.post(
  "/assignments/:id/finalize",
  asyncHandler(async (req, res) => {
    const schema = z.object({ outcomeReason: z.string().min(10) });
    const input = schema.parse(req.body);
    res.json({
      data: await finalizeVideoAssessment({ videoAssignmentId: req.params.id, outcomeReason: input.outcomeReason, actorId: req.user!.id }),
    });
  }),
);
