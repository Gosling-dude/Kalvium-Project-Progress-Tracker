import { prisma } from "../../lib/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { recordAuditEvent } from "./audit.service";

export async function listCampuses(includeInactive = false) {
  return prisma.campus.findMany({ where: includeInactive ? undefined : { active: true }, orderBy: { name: "asc" } });
}

export async function createCampus(input: { name: string; code: string }, actorId: string) {
  const existing = await prisma.campus.findUnique({ where: { code: input.code } });
  if (existing) throw new ValidationError(`Campus code '${input.code}' is already in use.`);
  const campus = await prisma.campus.create({ data: input });
  await recordAuditEvent({ actorId, action: "CAMPUS_CREATED", entityType: "Campus", entityId: campus.id, after: campus });
  return campus;
}

export async function updateCampus(id: string, input: Partial<{ name: string; code: string; active: boolean }>, actorId: string) {
  const campus = await prisma.campus.findUnique({ where: { id } });
  if (!campus) throw new NotFoundError("Campus", id);
  const updated = await prisma.campus.update({ where: { id }, data: input });
  await recordAuditEvent({ actorId, action: "CAMPUS_UPDATED", entityType: "Campus", entityId: id, before: campus, after: updated });
  return updated;
}

export async function listGrowthCoaches(includeInactive = false) {
  return prisma.growthCoach.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: { name: "asc" },
    include: { campus: { select: { id: true, name: true } } },
  });
}

export async function createGrowthCoach(input: { name: string; email: string; campusId?: string }, actorId: string) {
  const existing = await prisma.growthCoach.findUnique({ where: { email: input.email } });
  if (existing) throw new ValidationError(`A Growth Coach with email '${input.email}' already exists.`);
  const coach = await prisma.growthCoach.create({ data: input });
  await recordAuditEvent({ actorId, action: "GROWTH_COACH_CREATED", entityType: "GrowthCoach", entityId: coach.id, after: coach });
  return coach;
}

export async function updateGrowthCoach(
  id: string,
  input: Partial<{ name: string; email: string; campusId: string | null; active: boolean }>,
  actorId: string,
) {
  const coach = await prisma.growthCoach.findUnique({ where: { id } });
  if (!coach) throw new NotFoundError("GrowthCoach", id);
  const updated = await prisma.growthCoach.update({ where: { id }, data: input });
  await recordAuditEvent({ actorId, action: "GROWTH_COACH_UPDATED", entityType: "GrowthCoach", entityId: id, before: coach, after: updated });
  return updated;
}
