import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { recordAuditEvent } from "../domain/services/audit.service";

export const settingsRouter = Router();
settingsRouter.use(requireAuth, requireRole("ADMIN"));

settingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.appSetting.findMany({ orderBy: { key: "asc" } });
    res.json({ data: settings.map((s) => ({ ...s, value: JSON.parse(s.value) })) });
  }),
);

settingsRouter.put(
  "/:key",
  asyncHandler(async (req, res) => {
    const schema = z.object({ value: z.unknown(), description: z.string().optional() });
    const input = schema.parse(req.body);
    const before = await prisma.appSetting.findUnique({ where: { key: req.params.key } });

    const updated = await prisma.appSetting.upsert({
      where: { key: req.params.key },
      create: { key: req.params.key, value: JSON.stringify(input.value), description: input.description },
      update: { value: JSON.stringify(input.value), description: input.description },
    });

    await recordAuditEvent({
      actorId: req.user!.id,
      action: "SETTING_UPDATED",
      entityType: "AppSetting",
      entityId: req.params.key,
      before,
      after: updated,
    });

    res.json({ data: { ...updated, value: JSON.parse(updated.value) } });
  }),
);

settingsRouter.get(
  "/versions/rubrics",
  asyncHandler(async (_req, res) => {
    const versions = await prisma.rubricVersion.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ data: versions.map((v) => ({ ...v, dimensions: JSON.parse(v.dimensions) })) });
  }),
);

settingsRouter.get(
  "/versions/video-question-sets",
  asyncHandler(async (_req, res) => {
    const versions = await prisma.videoQuestionSetVersion.findMany({
      include: { questions: { orderBy: { order: "asc" } }, questionSet: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: versions.map((v) => ({ ...v, mandatoryQuestionKeys: JSON.parse(v.mandatoryQuestionKeys) })) });
  }),
);
