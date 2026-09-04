import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { DELIVERABLE_TRACK, SUBMISSION_TYPE, VERIFICATION_STATUS, CHECKPOINT_STATUS } from "../domain/constants/enums";
import {
  archiveDeliverableTemplate,
  createDeliverableTemplate,
  duplicateDeliverableTemplate,
  listDeliverableTemplates,
  updateDeliverableTemplate,
} from "../domain/services/deliverableTemplate.service";
import {
  assignDeliverable,
  createCheckpoint,
  evaluateCheckpoint,
  recordDeliverableSubmission,
  verifyDeliverable,
} from "../domain/services/developmentTrack.service";

export const deliverableRouter = Router();
deliverableRouter.use(requireAuth, requireRole("ADMIN"));

const templateInputSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  gapAddressed: z.string().min(1),
  whatStudentMustDo: z.string().min(1),
  expectedOutcome: z.string().min(1),
  submissionType: z.enum(SUBMISSION_TYPE),
  submissionRequired: z.string().min(1),
  submissionDetails: z.string().optional(),
  verificationCriteria: z.string().min(1),
  estimatedTime: z.string().optional(),
  track: z.enum(DELIVERABLE_TRACK),
  order: z.number().int().optional(),
});

deliverableRouter.get(
  "/templates",
  asyncHandler(async (req, res) => {
    res.json({ data: await listDeliverableTemplates(req.query.track as never) });
  }),
);

deliverableRouter.post(
  "/templates",
  asyncHandler(async (req, res) => {
    const input = templateInputSchema.parse(req.body);
    res.status(201).json({ data: await createDeliverableTemplate(input, req.user!.id) });
  }),
);

deliverableRouter.patch(
  "/templates/:id",
  asyncHandler(async (req, res) => {
    const input = templateInputSchema.partial().parse(req.body);
    res.json({ data: await updateDeliverableTemplate(req.params.id, input, req.user!.id) });
  }),
);

deliverableRouter.post(
  "/templates/:id/duplicate",
  asyncHandler(async (req, res) => {
    const schema = z.object({ newKey: z.string().min(1) });
    const input = schema.parse(req.body);
    res.status(201).json({ data: await duplicateDeliverableTemplate(req.params.id, input.newKey, req.user!.id) });
  }),
);

deliverableRouter.post(
  "/templates/:id/archive",
  asyncHandler(async (req, res) => {
    res.json({ data: await archiveDeliverableTemplate(req.params.id, req.user!.id) });
  }),
);

deliverableRouter.post(
  "/assignments",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string().min(1),
      templateId: z.string().min(1),
      track: z.enum(["A2", "B"]),
      checkpointId: z.string().optional(),
      dueAt: z.coerce.date().optional(),
    });
    const input = schema.parse(req.body);
    res.status(201).json({ data: await assignDeliverable({ ...input, actorId: req.user!.id }) });
  }),
);

deliverableRouter.post(
  "/assignments/:id/submission",
  asyncHandler(async (req, res) => {
    const schema = z.object({ submissionFromStudent: z.string().min(1) });
    const input = schema.parse(req.body);
    res.json({ data: await recordDeliverableSubmission(req.params.id, input, req.user!.id) });
  }),
);

deliverableRouter.post(
  "/assignments/:id/verify",
  asyncHandler(async (req, res) => {
    const schema = z.object({ verificationStatus: z.enum(VERIFICATION_STATUS), feedback: z.string().min(1) });
    const input = schema.parse(req.body);
    res.json({ data: await verifyDeliverable(req.params.id, input, req.user!.id) });
  }),
);

deliverableRouter.post(
  "/checkpoints",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      studentId: z.string().min(1),
      track: z.enum(DELIVERABLE_TRACK),
      name: z.string().min(1),
      sequence: z.number().int(),
      dueAt: z.coerce.date().optional(),
      expectedEvidence: z.string().optional(),
      whatWillBeChecked: z.string().optional(),
      expectedProgress: z.string().optional(),
    });
    const input = schema.parse(req.body);
    res.status(201).json({ data: await createCheckpoint({ ...input, actorId: req.user!.id }) });
  }),
);

deliverableRouter.post(
  "/checkpoints/:id/evaluate",
  asyncHandler(async (req, res) => {
    const schema = z.object({ status: z.enum(CHECKPOINT_STATUS), evaluationNotes: z.string().min(1) });
    const input = schema.parse(req.body);
    res.json({ data: await evaluateCheckpoint(req.params.id, input, req.user!.id) });
  }),
);
