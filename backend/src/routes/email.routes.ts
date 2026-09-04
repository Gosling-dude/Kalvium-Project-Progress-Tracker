import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { EMAIL_TEMPLATE_KEY } from "../domain/constants/enums";
import { listEmailEvents, listEmailTemplates, previewEmail, sendEmail, updateEmailTemplate } from "../domain/services/email.service";

export const emailRouter = Router();
emailRouter.use(requireAuth, requireRole("ADMIN"));

const recipientSchema = z.object({
  studentId: z.string().min(1),
  emailAddress: z.string().email(),
  variables: z.record(z.string()).default({}),
  videoAssignmentId: z.string().optional(),
  interviewId: z.string().optional(),
});

emailRouter.get(
  "/templates",
  asyncHandler(async (_req, res) => {
    res.json({ data: await listEmailTemplates() });
  }),
);

emailRouter.patch(
  "/templates/:id",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(1).optional(),
      subject: z.string().min(1).optional(),
      bodyHtml: z.string().min(1).optional(),
      active: z.boolean().optional(),
    });
    const input = schema.parse(req.body);
    res.json({ data: await updateEmailTemplate(req.params.id, input, req.user!.id) });
  }),
);

emailRouter.post(
  "/preview",
  asyncHandler(async (req, res) => {
    const schema = z.object({ templateKey: z.enum(EMAIL_TEMPLATE_KEY), recipients: z.array(recipientSchema).min(1) });
    const input = schema.parse(req.body);
    res.json({ data: await previewEmail(input) });
  }),
);

emailRouter.post(
  "/send",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      templateKey: z.enum(EMAIL_TEMPLATE_KEY),
      recipients: z.array(recipientSchema).min(1),
      relatedEntityType: z.string().optional(),
      relatedEntityId: z.string().optional(),
    });
    const input = schema.parse(req.body);
    res.json({ data: await sendEmail({ ...input, triggeredById: req.user!.id }) });
  }),
);

emailRouter.get(
  "/events",
  asyncHandler(async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 25;
    res.json(await listEmailEvents(page, pageSize));
  }),
);
