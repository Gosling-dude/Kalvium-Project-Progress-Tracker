import { prisma } from "../../lib/prisma";
import { BusinessRuleError, NotFoundError, ValidationError } from "../../lib/errors";
import { recordAuditEvent } from "./audit.service";
import type { CohortStatus } from "../constants/enums";

export interface CohortInput {
  name: string;
  code: string;
  description?: string;
  campusId?: string;
  startDate?: Date;
  endDate?: Date;
  notes?: string;
}

export async function createCohort(input: CohortInput, actorId: string) {
  const existing = await prisma.cohort.findUnique({ where: { code: input.code } });
  if (existing) throw new ValidationError(`Cohort code '${input.code}' is already in use.`);

  const cohort = await prisma.cohort.create({ data: input });
  await recordAuditEvent({ actorId, action: "COHORT_CREATED", entityType: "Cohort", entityId: cohort.id, after: cohort });
  return cohort;
}

export async function updateCohort(id: string, input: Partial<CohortInput & { status: CohortStatus }>, actorId: string) {
  const cohort = await prisma.cohort.findUnique({ where: { id } });
  if (!cohort) throw new NotFoundError("Cohort", id);

  const updated = await prisma.cohort.update({ where: { id }, data: input });
  await recordAuditEvent({ actorId, action: "COHORT_UPDATED", entityType: "Cohort", entityId: id, before: cohort, after: updated });
  return updated;
}

export async function listCohorts(status?: CohortStatus) {
  const cohorts = await prisma.cohort.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      campus: { select: { id: true, name: true } },
      _count: { select: { enrollments: { where: { isActive: true } } } },
    },
  });
  return cohorts.map((c) => ({ ...c, activeStudentCount: c._count.enrollments }));
}

export async function getCohort(id: string) {
  const cohort = await prisma.cohort.findUnique({
    where: { id },
    include: { campus: true, enrollments: { include: { student: true }, orderBy: { startedAt: "desc" } } },
  });
  if (!cohort) throw new NotFoundError("Cohort", id);
  return cohort;
}

// Enrolling a student ends any current active enrollment (elsewhere) and
// starts a new one here — history of every past enrollment is preserved,
// never deleted or overwritten. See spec section 2/7.
export async function enrollStudentInCohort(
  input: { studentId: string; cohortId: string; reason?: string },
  actorId: string,
) {
  const [student, cohort] = await Promise.all([
    prisma.student.findUnique({ where: { id: input.studentId } }),
    prisma.cohort.findUnique({ where: { id: input.cohortId } }),
  ]);
  if (!student) throw new NotFoundError("Student", input.studentId);
  if (!cohort) throw new NotFoundError("Cohort", input.cohortId);
  if (cohort.status !== "ACTIVE") {
    throw new BusinessRuleError(`Cohort '${cohort.name}' is not active and cannot accept new enrollments.`);
  }

  const currentActive = await prisma.cohortEnrollment.findFirst({
    where: { studentId: input.studentId, isActive: true },
  });
  if (currentActive?.cohortId === input.cohortId) {
    throw new BusinessRuleError(`Student is already enrolled in cohort '${cohort.name}'.`);
  }

  const operations = [];
  if (currentActive) {
    operations.push(
      prisma.cohortEnrollment.update({
        where: { id: currentActive.id },
        data: { isActive: false, endedAt: new Date() },
      }),
    );
  }
  operations.push(
    prisma.cohortEnrollment.create({
      data: {
        studentId: input.studentId,
        cohortId: input.cohortId,
        reason: input.reason ?? (currentActive ? "Moved between cohorts" : "Initial cohort assignment"),
        createdById: actorId,
      },
    }),
  );
  const results = await prisma.$transaction(operations);
  const enrollment = results[results.length - 1];

  await recordAuditEvent({
    actorId,
    action: currentActive ? "COHORT_MOVED" : "COHORT_ASSIGNED",
    entityType: "Student",
    entityId: input.studentId,
    before: currentActive ? { cohortId: currentActive.cohortId } : undefined,
    after: { cohortId: input.cohortId },
    metadata: { reason: input.reason },
  });

  return enrollment;
}

export async function bulkEnrollStudents(
  input: { studentIds: string[]; cohortId: string; reason?: string },
  actorId: string,
) {
  if (input.studentIds.length === 0) {
    throw new ValidationError("Select at least one student for this bulk action.");
  }
  const results = [];
  for (const studentId of input.studentIds) {
    results.push(await enrollStudentInCohort({ studentId, cohortId: input.cohortId, reason: input.reason }, actorId));
  }
  return { affectedCount: results.length };
}

export async function getCohortEnrollmentHistory(studentId: string) {
  return prisma.cohortEnrollment.findMany({
    where: { studentId },
    include: { cohort: true },
    orderBy: { startedAt: "asc" },
  });
}
