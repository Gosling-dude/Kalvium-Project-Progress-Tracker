import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "../lib/prisma";

export const auditRouter = Router();
auditRouter.use(requireAuth, requireRole("ADMIN"));

auditRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const page = req.query.page ? Number(req.query.page) : 1;
    const pageSize = Math.min(100, req.query.pageSize ? Number(req.query.pageSize) : 50);
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId as string | undefined;

    const where = { entityType: entityType || undefined, entityId: entityId || undefined };
    const [total, events] = await Promise.all([
      prisma.auditEvent.count({ where }),
      prisma.auditEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { id: true, name: true, role: true } } },
      }),
    ]);
    res.json({ data: events, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } });
  }),
);
