import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { INTERVIEW_TYPE, GROWTH_COACH_CONFIRMATION_STATUS, BREAK_CAUSE_CATEGORY, INTERVIEW_RESULT } from "../domain/constants/enums";
import {
  completeInterview,
  recordInterviewEvaluation,
  scheduleInterview,
  updateInterviewSchedule,
} from "../domain/services/interview.service";
import { prisma } from "../lib/prisma";

export const interviewRouter = Router();
interviewRouter.use(requireAuth, requireRole("ADMIN"));

interviewRouter.get(
  "/rung-levels",
  asyncHandler(async (_req, res) => {
    res.json({ data: await prisma.rungLevel.findMany({ orderBy: { order: "asc" } }) });
  }),
);

interviewRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string().min(1),
      interviewType: z.enum(INTERVIEW_TYPE),
      scheduledStart: z.coerce.date().optional(),
      scheduledEnd: z.coerce.date().optional(),
      timezone: z.string().optional(),
      interviewerId: z.string().optional(),
      chosenProject: z.string().optional(),
      growthCoachConfirmationStatus: z.enum(GROWTH_COACH_CONFIRMATION_STATUS).optional(),
    });
    const input = schema.parse(req.body);
    res.status(201).json({ data: await scheduleInterview({ ...input, actorId: req.user!.id }) });
  }),
);

interviewRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      scheduledStart: z.coerce.date().optional(),
      scheduledEnd: z.coerce.date().optional(),
      timezone: z.string().optional(),
      interviewerId: z.string().optional(),
      growthCoachConfirmationStatus: z.enum(GROWTH_COACH_CONFIRMATION_STATUS).optional(),
      status: z.enum(["SCHEDULED", "CANCELLED", "RESCHEDULED"]).optional(),
    });
    const input = schema.parse(req.body);
    res.json({ data: await updateInterviewSchedule(req.params.id, input, req.user!.id) });
  }),
);

interviewRouter.post(
  "/:id/complete",
  asyncHandler(async (req, res) => {
    const schema = z.object({ actualStart: z.coerce.date().optional(), actualEnd: z.coerce.date().optional(), notes: z.string().optional() });
    const input = schema.parse(req.body);
    res.json({ data: await completeInterview(req.params.id, input, req.user!.id) });
  }),
);

interviewRouter.post(
  "/:id/evaluation",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      highestRungHeld: z.number().int().min(1).max(5).optional(),
      breakRung: z.number().int().min(1).max(5).optional(),
      breakCauseCategory: z.enum(BREAK_CAUSE_CATEGORY).optional(),
      breakCauseNotes: z.string().optional(),
      evidence: z.string().optional(),
      communicationRating: z.number().int().min(1).max(5).optional(),
      prescription: z.string().optional(),
      strengths: z.string().optional(),
      weaknesses: z.string().optional(),
      overallFeedback: z.string().min(1),
      result: z.enum(INTERVIEW_RESULT).optional(),
    });
    const input = schema.parse(req.body);
    res.json({ data: await recordInterviewEvaluation({ ...input, interviewId: req.params.id, evaluatorId: req.user!.id }) });
  }),
);
