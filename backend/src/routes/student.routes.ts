import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { PROGRAM_STATUS, STAGE, TRACK } from "../domain/constants/enums";
import { recordTrackTransition } from "../domain/services/trackTransition.service";
import { createStudent, getStudentSummary, listStudents, updateStudent } from "../domain/services/student.service";
import { getCohortEnrollmentHistory } from "../domain/services/cohort.service";
import { getStudentTimeline } from "../domain/services/timeline.service";
import { getEntityAuditTrail } from "../domain/services/audit.service";
import { listProjectReviewsForStudent } from "../domain/services/projectReview.service";
import { prisma } from "../lib/prisma";
import {
  listCheckpointsForStudent,
  listDeliverablesForStudent,
  listGrowthCoachEvaluationsForStudent,
} from "../domain/services/developmentTrack.service";
import { listInterviewsForStudent } from "../domain/services/interview.service";
import { listFlagsForStudent } from "../domain/services/flag.service";
import { listGraduationDecisionsForStudent } from "../domain/services/graduation.service";
import { listEmailEventsForStudent } from "../domain/services/email.service";
import { getStudentTrackHistory } from "../domain/services/trackTransition.service";

export const studentRouter = Router();
studentRouter.use(requireAuth, requireRole("ADMIN"));

const studentInputSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  campusId: z.string().optional(),
  growthCoachId: z.string().optional(),
  chosenProject: z.string().optional(),
  resumeReference: z.string().optional(),
  notes: z.string().optional(),
  cohortId: z.string().optional(),
});

studentRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = req.query;
    const result = await listStudents({
      search: q.search as string | undefined,
      cohortId: q.cohortId as string | undefined,
      campusId: q.campusId as string | undefined,
      growthCoachId: q.growthCoachId as string | undefined,
      track: q.track as (typeof TRACK)[number] | undefined,
      programStatus: q.programStatus as (typeof PROGRAM_STATUS)[number] | undefined,
      hasOpenFlags: q.hasOpenFlags === "true",
      page: q.page ? Number(q.page) : undefined,
      pageSize: q.pageSize ? Number(q.pageSize) : undefined,
      sort: q.sort as never,
    });
    res.json(result);
  }),
);

studentRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = studentInputSchema.parse(req.body);
    res.status(201).json({ data: await createStudent(input, req.user!.id) });
  }),
);

studentRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ data: await getStudentSummary(req.params.id) });
  }),
);

studentRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = studentInputSchema.omit({ cohortId: true }).partial().parse(req.body);
    res.json({ data: await updateStudent(req.params.id, input, req.user!.id) });
  }),
);

// The Student 360 view: everything needed to answer "where is this student
// right now, why, and what's next" from one call.
studentRouter.get(
  "/:id/detail",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const [
      student,
      cohortHistory,
      trackHistory,
      projectReviews,
      videoAssignments,
      interviews,
      deliverables,
      checkpoints,
      growthCoachEvaluations,
      flags,
      graduationDecisions,
      emailHistory,
      timeline,
    ] = await Promise.all([
      getStudentSummary(id),
      getCohortEnrollmentHistory(id),
      getStudentTrackHistory(id),
      listProjectReviewsForStudent(id),
      prisma.videoAssignment.findMany({
        where: { studentId: id },
        include: { evaluations: { include: { question: true } }, questionSetVersion: true },
        orderBy: { assignedAt: "desc" },
      }),
      listInterviewsForStudent(id),
      listDeliverablesForStudent(id),
      listCheckpointsForStudent(id),
      listGrowthCoachEvaluationsForStudent(id),
      listFlagsForStudent(id),
      listGraduationDecisionsForStudent(id),
      listEmailEventsForStudent(id),
      getStudentTimeline(id),
    ]);

    res.json({
      data: {
        student,
        cohortHistory,
        trackHistory,
        projectReviews,
        videoAssignments,
        interviews,
        deliverables,
        checkpoints,
        growthCoachEvaluations,
        flags,
        graduationDecisions,
        emailHistory,
        timeline,
      },
    });
  }),
);

studentRouter.get(
  "/:id/timeline",
  asyncHandler(async (req, res) => {
    res.json({ data: await getStudentTimeline(req.params.id) });
  }),
);

// Manual "Move Student" action (spec section 66). Automatic transitions
// triggered by domain services (Project Review, Video, Growth Coach,
// Graduation) never go through this route — only deliberate Admin action.
studentRouter.post(
  "/:id/track-transition",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      toTrack: z.enum(TRACK),
      toStage: z.enum(STAGE),
      toProgramStatus: z.enum(PROGRAM_STATUS),
      reason: z.string().min(8),
      sourceType: z.enum(["MANUAL", "OVERRIDE"]),
      overrideReason: z.string().optional(),
      notes: z.string().optional(),
    });
    const input = schema.parse(req.body);
    const transition = await recordTrackTransition({ ...input, studentId: req.params.id, actorId: req.user!.id });
    res.status(201).json({ data: transition });
  }),
);

studentRouter.get(
  "/:id/audit",
  asyncHandler(async (req, res) => {
    res.json({ data: await getEntityAuditTrail("Student", req.params.id) });
  }),
);
