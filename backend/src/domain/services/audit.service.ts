import { prisma } from "../../lib/prisma";

export interface RecordAuditEventInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}

// Append-only audit trail. Never update or delete an AuditEvent row — the
// system's historical-truth guarantee depends on this table being immutable.
export async function recordAuditEvent(input: RecordAuditEventInput) {
  return prisma.auditEvent.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before !== undefined ? JSON.stringify(input.before) : null,
      after: input.after !== undefined ? JSON.stringify(input.after) : null,
      metadata: input.metadata !== undefined ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function getEntityAuditTrail(entityType: string, entityId: string) {
  return prisma.auditEvent.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "asc" },
    include: { actor: { select: { id: true, name: true, email: true, role: true } } },
  });
}
