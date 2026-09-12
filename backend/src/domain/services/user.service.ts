import { prisma } from "../../lib/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { hashPassword } from "./auth.service";
import { recordAuditEvent } from "./audit.service";
import type { Role } from "../constants/enums";

// Backs the interviewer picker (spec section 9: "interviewer should be a
// person/account that exists on the platform") and the flag-assignee picker
// (spec sections 15/16) — both need to choose from real User accounts.
export async function listUsers(role?: Role, includeInactive = false) {
  return prisma.user.findMany({
    where: { active: includeInactive ? undefined : true, role },
    select: { id: true, name: true, email: true, role: true, active: true },
    orderBy: { name: "asc" },
  });
}

// Creates a Program Admin account directly. Growth Coach accounts are
// created via POST /growth-coaches instead (createGrowthCoach) so the login
// always stays linked to a GrowthCoach reference-data row — this endpoint
// only ever creates the ADMIN role.
export async function createAdminUser(input: { name: string; email: string; password: string }, actorId: string) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ValidationError(`A user account with email '${input.email}' already exists.`);

  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password), role: "ADMIN" },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  await recordAuditEvent({ actorId, action: "ADMIN_USER_CREATED", entityType: "User", entityId: user.id, after: { email: user.email } });
  return user;
}

export async function setUserActive(id: string, active: boolean, actorId: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError("User", id);
  if (id === actorId && !active) throw new ValidationError("You cannot deactivate your own account.");

  const updated = await prisma.user.update({
    where: { id },
    data: { active },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  await recordAuditEvent({
    actorId,
    action: active ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    entityType: "User",
    entityId: id,
    before: { active: user.active },
    after: { active },
  });
  return updated;
}
