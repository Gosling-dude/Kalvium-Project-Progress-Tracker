import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ForbiddenError } from "../lib/errors";
import { PROGRAM_STATUS, STAGE, TRACK } from "../domain/constants/enums";
import { recordTrackTransition } from "../domain/services/trackTransition.service";
import { createStudent, deleteStudent, getStudentSummary, listStudents, updateStudent } from "../domain/services/student.service";
import { getCohortEnrollmentHistory } from "../domain/services/cohort.service";
import { getStudentTimeline } from "../domain/services/timeline.service";
import { getEntityAuditTrail } from "../domain/services/audit.service";
import { getGrowthCoachForUserId } from "../domain/services/campus.service";
import { listProjectReviewsForStudent } from "../domain/services/projectReview.service";
import { prisma } from "../lib/prisma";
import { listDeliverablesForStudent, listGrowthCoachEvaluationsForStudent } from "../domain/services/developmentTrack.service";
import { listInterviewsForStudent } from "../domain/services/interview.service";
import { listFlagsForStudent } from "../domain/services/flag.service";
import { listGraduationDecisionsForStudent } from "../domain/services/graduation.service";
import { listEmailEventsForStudent } from "../domain/services/email.service";
import { getStudentTrackHistory } from "../domain/services/trackTransition.service";

export const studentRouter = Router();
studentRouter.use(requireAuth);

// Only Admins can create/edit students or move them between tracks — Growth
// Coaches get read access to their own assigned students (below).
const adminOnly = requireRole("ADMIN");
const readAccess = requireRole("ADMIN", "GROWTH_COACH");

// A Growth Coach may only ever read students assigned to them (spec section
// 17); Admin is unrestricted. Returns the caller's GrowthCoach id, or
// undefined for Admin.
async function resolveViewerGrowthCoachId(req: import("express").Request): Promise<string | undefined> {
  if (req.user!.role !== "GROWTH_COACH") return undefined;
  const coach = await getGrowthCoachForUserId(req.user!.id);
  if (!coach) throw new ForbiddenError("No Growth Coach profile is linked to this account.");
  return coach.id;
}

async function assertCanViewStudent(req: import("express").Request, studentId: string) {
  const viewerGrowthCoachId = await resolveViewerGrowthCoachId(req);
  if (viewerGrowthCoachId === undefined) return;
  const student = await prisma.student.findUnique({ where: { id: studentId }, select: { growthCoachId: true } });
  if (!student || student.growthCoachId !== viewerGrowthCoachId) {
    throw new ForbiddenError("You can only view students assigned to you.");
  }
}

const studentInputSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  campusId: z.string().optional(),
  growthCoachId: z.string().optional(),
  batch: z.string().optional(),
  chosenProject: z.string().optional(),
  resumeLink: z.string().optional(),
  notes: z.string().optional(),
  cohortId: z.string().optional(),
});

studentRouter.get(
  "/",
  readAccess,
  asyncHandler(async (req, res) => {
    const q = req.query;
    const viewerGrowthCoachId = await resolveViewerGrowthCoachId(req);
    const result = await listStudents({
      search: q.search as string | undefined,
      cohortId: q.cohortId as string | undefined,
      campusId: q.campusId as string | undefined,
      // A Growth Coach always sees only their own assigned students —
      // their own id overrides anything a client might pass.
      growthCoachId: viewerGrowthCoachId ?? (q.growthCoachId as string | undefined),
      track: q.track as (typeof TRACK)[number] | undefined,
      programStatus: q.programStatus as (typeof PROGRAM_STATUS)[number] | undefined,
      batch: q.batch as string | undefined,
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
  adminOnly,
  asyncHandler(async (req, res) => {
    const input = studentInputSchema.parse(req.body);
    res.status(201).json({ data: await createStudent(input, req.user!.id) });
  }),
);

studentRouter.get(
  "/:id",
  readAccess,
  asyncHandler(async (req, res) => {
    await assertCanViewStudent(req, req.params.id);
    res.json({ data: await getStudentSummary(req.params.id) });
  }),
);

studentRouter.patch(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const input = studentInputSchema.omit({ cohortId: true }).partial().parse(req.body);
    res.json({ data: await updateStudent(req.params.id, input, req.user!.id) });
  }),
);

// Hard delete — irreversible, and wipes every record that exists only
// because of this student (see student.service.ts for the full list).
studentRouter.delete(
  "/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    await deleteStudent(req.params.id, req.user!.id);
    res.status(204).send();
  }),
);

// The Student 360 view: everything needed to answer "where is this student
// right now, why, and what's next" from one call.
studentRouter.get(
  "/:id/detail",
  readAccess,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await assertCanViewStudent(req, id);
    const [
      student,
      cohortHistory,
      trackHistory,
      projectReviews,
      videoAssignments,
      interviews,
      deliverables,
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
  readAccess,
  asyncHandler(async (req, res) => {
    await assertCanViewStudent(req, req.params.id);
    res.json({ data: await getStudentTimeline(req.params.id) });
  }),
);

// Manual "Move Student" action (spec section 66). Automatic transitions
// triggered by domain services (Project Review, Video, Growth Coach,
// Graduation) never go through this route — only deliberate Admin action.
studentRouter.post(
  "/:id/track-transition",
  adminOnly,
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
  adminOnly,
  asyncHandler(async (req, res) => {
    res.json({ data: await getEntityAuditTrail("Student", req.params.id) });
  }),
);
