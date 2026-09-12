import { prisma } from "../../lib/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { recordAuditEvent } from "./audit.service";
import { hashPassword } from "./auth.service";

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

// `password` is optional: a Growth Coach is always valid as reference data
// (e.g. for assigning students) without a login. Supplying a password creates
// a real User account (role GROWTH_COACH) linked 1:1 to this coach, so they
// can sign in and see their own assigned students (spec section 17).
export async function createGrowthCoach(
  input: { name: string; email: string; campusId?: string; password?: string },
  actorId: string,
) {
  const existing = await prisma.growthCoach.findUnique({ where: { email: input.email } });
  if (existing) throw new ValidationError(`A Growth Coach with email '${input.email}' already exists.`);

  let userId: string | undefined;
  if (input.password) {
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) throw new ValidationError(`A user account with email '${input.email}' already exists.`);
    const user = await prisma.user.create({
      data: { email: input.email, name: input.name, passwordHash: await hashPassword(input.password), role: "GROWTH_COACH" },
    });
    userId = user.id;
  }

  const coach = await prisma.growthCoach.create({
    data: { name: input.name, email: input.email, campusId: input.campusId, userId },
  });
  await recordAuditEvent({ actorId, action: "GROWTH_COACH_CREATED", entityType: "GrowthCoach", entityId: coach.id, after: coach });
  return coach;
}

export async function updateGrowthCoach(
  id: string,
  input: Partial<{ name: string; email: string; campusId: string | null; active: boolean; password: string }>,
  actorId: string,
) {
  const coach = await prisma.growthCoach.findUnique({ where: { id } });
  if (!coach) throw new NotFoundError("GrowthCoach", id);

  const { password, ...rest } = input;
  if (password) {
    if (coach.userId) {
      await prisma.user.update({ where: { id: coach.userId }, data: { passwordHash: await hashPassword(password) } });
    } else {
      const user = await prisma.user.create({
        data: {
          email: input.email ?? coach.email,
          name: input.name ?? coach.name,
          passwordHash: await hashPassword(password),
          role: "GROWTH_COACH",
        },
      });
      (rest as { userId?: string }).userId = user.id;
    }
  }

  const updated = await prisma.growthCoach.update({ where: { id }, data: rest });

  // A deactivated Growth Coach must also lose their login — otherwise
  // "deactivating" them still leaves their account able to sign in and see
  // their already-assigned students.
  if (rest.active !== undefined && updated.userId) {
    await prisma.user.update({ where: { id: updated.userId }, data: { active: rest.active } });
  }

  await recordAuditEvent({ actorId, action: "GROWTH_COACH_UPDATED", entityType: "GrowthCoach", entityId: id, before: coach, after: updated });
  return updated;
}

// Resolves the GrowthCoach reference-data row for a logged-in GROWTH_COACH
// user — the join point between a login (User) and the assignable evaluator
// identity (GrowthCoach) students already point at.
export async function getGrowthCoachForUserId(userId: string) {
  return prisma.growthCoach.findUnique({ where: { userId } });
}
