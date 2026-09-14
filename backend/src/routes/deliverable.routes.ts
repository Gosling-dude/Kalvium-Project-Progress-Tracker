import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ForbiddenError } from "../lib/errors";
import { SUBMISSION_TYPE, VERIFICATION_STATUS, TIME_UNIT } from "../domain/constants/enums";
import { getGrowthCoachForUserId } from "../domain/services/campus.service";
import {
  assignDeliverable,
  deleteDeliverableAssignment,
  getDeliverablesTableHtml,
  markDeliverableSetEmailed,
  recordDeliverableSubmission,
  sumEstimatedTime,
  updateDeliverableAssignment,
  verifyDeliverable,
} from "../domain/services/developmentTrack.service";

export const deliverableRouter = Router();
deliverableRouter.use(requireAuth, requireRole("ADMIN", "GROWTH_COACH"));

// Assigning a deliverable stays Admin-only; a Growth Coach's actions are
// restricted to their own assigned students' submission/verification at the
// service layer (resolveActorGrowthCoachId below).
const adminOnly = requireRole("ADMIN");

// Resolves the caller's GrowthCoach id when they're logged in as one, so the
// service layer can enforce "only your own assigned students" — undefined
// (not called) for Admin, who is unrestricted.
async function resolveActorGrowthCoachId(req: import("express").Request): Promise<string | null | undefined> {
  if (req.user!.role !== "GROWTH_COACH") return undefined;
  const coach = await getGrowthCoachForUserId(req.user!.id);
  if (!coach) throw new ForbiddenError("No Growth Coach profile is linked to this account.");
  return coach.id;
}

// Every deliverable is written directly for the one student it's assigned
// to — there is no reusable template library (each one is unique to the
// gap it addresses).
const directDeliverableSchema = z.object({
  title: z.string().min(1),
  gapAddressed: z.string().min(1),
  whatStudentMustDo: z.string().min(1),
  expectedOutcome: z.string().min(1),
  submissionType: z.enum(SUBMISSION_TYPE),
  submissionRequired: z.string().min(1),
  submissionDetails: z.string().optional(),
  verificationCriteria: z.string().min(1),
  estimatedTimeValue: z.number().positive(),
  estimatedTimeUnit: z.enum(TIME_UNIT),
});

deliverableRouter.post(
  "/assignments",
  adminOnly,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string().min(1),
      direct: directDeliverableSchema,
      track: z.enum(["A2", "B"]),
      dueAt: z.coerce.date().optional(),
    });
    const input = schema.parse(req.body);
    res.status(201).json({ data: await assignDeliverable({ ...input, actorId: req.user!.id }) });
  }),
);

deliverableRouter.get(
  "/assignments/table",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string().min(1),
      track: z.enum(["A2", "B"]),
      // Comma-separated assignment ids — lets the admin pick exactly which
      // assigned deliverables go into this particular email. Omitted means
      // every currently-assigned deliverable for the track.
      ids: z.string().optional(),
    });
    const input = schema.parse(req.query);
    const ids = input.ids ? input.ids.split(",").filter(Boolean) : undefined;
    res.json({ data: { html: await getDeliverablesTableHtml(input.studentId, input.track, ids) } });
  }),
);

deliverableRouter.get(
  "/assignments/estimated-time",
  asyncHandler(async (req, res) => {
    const schema = z.object({ studentId: z.string().min(1), track: z.enum(["A2", "B"]) });
    const input = schema.parse(req.query);
    res.json({ data: await sumEstimatedTime(input.studentId, input.track) });
  }),
);

// Called by the frontend right after the deliverable-assignment email
// actually sends — locks the set (see assignDeliverable) and computes the
// combined deadline from the total estimated time of everything currently
// assigned, counted from this moment.
deliverableRouter.post(
  "/assignments/mark-emailed",
  adminOnly,
  asyncHandler(async (req, res) => {
    const schema = z.object({ studentId: z.string().min(1), track: z.enum(["A2", "B"]) });
    const input = schema.parse(req.body);
    res.json({ data: await markDeliverableSetEmailed(input.studentId, input.track, req.user!.id) });
  }),
);

// Editing/deleting a deliverable's own definition stays Admin-only — a
// Growth Coach's edits are limited to recording a submission or verifying
// one (below), never the deliverable's content itself.
deliverableRouter.patch(
  "/assignments/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    const schema = directDeliverableSchema.partial().extend({ dueAt: z.coerce.date().nullable().optional() });
    const input = schema.parse(req.body);
    res.json({ data: await updateDeliverableAssignment(req.params.id, input, req.user!.id) });
  }),
);

deliverableRouter.delete(
  "/assignments/:id",
  adminOnly,
  asyncHandler(async (req, res) => {
    await deleteDeliverableAssignment(req.params.id, req.user!.id);
    res.status(204).send();
  }),
);

deliverableRouter.post(
  "/assignments/:id/submission",
  asyncHandler(async (req, res) => {
    const schema = z.object({ submissionFromStudent: z.string().min(1) });
    const input = schema.parse(req.body);
    const actorGrowthCoachId = await resolveActorGrowthCoachId(req);
    res.json({ data: await recordDeliverableSubmission(req.params.id, input, req.user!.id, actorGrowthCoachId) });
  }),
);

deliverableRouter.post(
  "/assignments/:id/verify",
  asyncHandler(async (req, res) => {
    const schema = z.object({ verificationStatus: z.enum(VERIFICATION_STATUS), feedback: z.string().min(1) });
    const input = schema.parse(req.body);
    const actorGrowthCoachId = await resolveActorGrowthCoachId(req);
    res.json({ data: await verifyDeliverable(req.params.id, input, req.user!.id, actorGrowthCoachId) });
  }),
);
