import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { COHORT_STATUS } from "../domain/constants/enums";
import {
  bulkEnrollStudents,
  createCohort,
  enrollStudentInCohort,
  getCohort,
  listCohorts,
  updateCohort,
} from "../domain/services/cohort.service";

export const cohortRouter = Router();
cohortRouter.use(requireAuth, requireRole("ADMIN"));

const cohortInputSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  description: z.string().optional(),
  campusId: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  notes: z.string().optional(),
});

cohortRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    res.json({ data: await listCohorts(status as (typeof COHORT_STATUS)[number] | undefined) });
  }),
);

cohortRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = cohortInputSchema.parse(req.body);
    res.status(201).json({ data: await createCohort(input, req.user!.id) });
  }),
);

cohortRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    res.json({ data: await getCohort(req.params.id) });
  }),
);

cohortRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = cohortInputSchema.partial().extend({ status: z.enum(COHORT_STATUS).optional() }).parse(req.body);
    res.json({ data: await updateCohort(req.params.id, input, req.user!.id) });
  }),
);

cohortRouter.post(
  "/:id/enroll",
  asyncHandler(async (req, res) => {
    const schema = z.object({ studentId: z.string().min(1), reason: z.string().optional() });
    const input = schema.parse(req.body);
    res.status(201).json({
      data: await enrollStudentInCohort({ studentId: input.studentId, cohortId: req.params.id, reason: input.reason }, req.user!.id),
    });
  }),
);

cohortRouter.post(
  "/:id/bulk-enroll",
  asyncHandler(async (req, res) => {
    const schema = z.object({ studentIds: z.array(z.string().min(1)), reason: z.string().optional() });
    const input = schema.parse(req.body);
    res.status(201).json({
      data: await bulkEnrollStudents({ studentIds: input.studentIds, cohortId: req.params.id, reason: input.reason }, req.user!.id),
    });
  }),
);
