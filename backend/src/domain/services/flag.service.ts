import { prisma } from "../../lib/prisma";
import { BusinessRuleError, NotFoundError, ValidationError } from "../../lib/errors";
import { recordAuditEvent } from "./audit.service";
import type { FlagCategory, FlagSeverity } from "../constants/enums";

export async function createFlag(input: {
  studentId: string;
  category: FlagCategory;
  severity: FlagSeverity;
  title: string;
  description: string;
  assignedToId?: string;
  actorId: string;
}) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new NotFoundError("Student", input.studentId);
  if (!input.title || input.title.trim().length < 3) {
    throw new ValidationError("Flag title is required.");
  }
  if (!input.description || input.description.trim().length < 10) {
    throw new ValidationError("Flag description must explain the concern (at least 10 characters).");
  }
  if (input.assignedToId) {
    const assignee = await prisma.user.findUnique({ where: { id: input.assignedToId } });
    if (!assignee) throw new NotFoundError("User", input.assignedToId);
  }

  const flag = await prisma.flag.create({
    data: {
      studentId: input.studentId,
      category: input.category,
      severity: input.severity,
      title: input.title,
      description: input.description,
      assignedToId: input.assignedToId ?? null,
      createdById: input.actorId,
    },
  });

  await recordAuditEvent({
    actorId: input.actorId,
    action: "FLAG_CREATED",
    entityType: "Flag",
    entityId: flag.id,
    after: { studentId: input.studentId, category: input.category, severity: input.severity, assignedToId: input.assignedToId },
  });

  return flag;
}

// Surfaces in the assignee's Tasks view (spec sections 15/16) so a flag
// assignment doesn't have to be discovered manually.
export async function listFlagsAssignedTo(userId: string) {
  return prisma.flag.findMany({
    where: { assignedToId: userId, status: "OPEN" },
    orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
    include: { student: { select: { id: true, fullName: true, email: true } } },
  });
}

export async function resolveFlag(
  flagId: string,
  input: { resolutionNote: string },
  actorId: string,
) {
  const flag = await prisma.flag.findUnique({ where: { id: flagId } });
  if (!flag) throw new NotFoundError("Flag", flagId);
  if (flag.status === "RESOLVED") throw new BusinessRuleError("This flag is already resolved.");
  if (!input.resolutionNote || input.resolutionNote.trim().length < 5) {
    throw new ValidationError("A resolution note is required.");
  }

  const updated = await prisma.flag.update({
    where: { id: flagId },
    data: {
      status: "RESOLVED",
      resolvedById: actorId,
      resolvedAt: new Date(),
      resolutionNote: input.resolutionNote,
    },
  });

  await recordAuditEvent({
    actorId,
    action: "FLAG_RESOLVED",
    entityType: "Flag",
    entityId: flagId,
  });

  return updated;
}

export async function listFlagsForStudent(studentId: string) {
  return prisma.flag.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
  });
}

export async function listOpenFlags() {
  return prisma.flag.findMany({
    where: { status: "OPEN" },
    orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
    include: {
      student: { select: { id: true, fullName: true, email: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
}
