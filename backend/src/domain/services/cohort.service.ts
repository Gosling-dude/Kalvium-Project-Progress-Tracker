import { prisma } from "../../lib/prisma";
import { BusinessRuleError, NotFoundError, ValidationError } from "../../lib/errors";
import { recordAuditEvent } from "./audit.service";
import { deriveDisplayStatus } from "../../lib/displayStatus";
import type { CohortStatus } from "../constants/enums";

export interface CohortInput {
  name: string;
  code: string;
  description?: string;
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
      _count: { select: { enrollments: { where: { isActive: true } } } },
    },
  });
  return cohorts.map((c) => ({ ...c, activeStudentCount: c._count.enrollments }));
}

export async function getCohort(id: string) {
  const cohort = await prisma.cohort.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          student: {
            include: {
              campus: { select: { id: true, name: true } },
              growthCoach: { select: { id: true, name: true, email: true } },
              _count: { select: { flags: { where: { status: "OPEN" } } } },
            },
          },
        },
        orderBy: { startedAt: "desc" },
      },
    },
  });
  if (!cohort) throw new NotFoundError("Cohort", id);
  return {
    ...cohort,
    enrollments: cohort.enrollments.map((e) => ({
      ...e,
      student: { ...e.student, displayStatus: deriveDisplayStatus(e.student), openFlagCount: e.student._count.flags },
    })),
  };
}

// Powers the Cohort Dashboard (spec section 2): Track A / Track B /
// Graduated / Unassigned counts, plus Track A's A/A1/A2 sub-track breakdown —
// scoped to this cohort's currently-active enrollments only.
export async function getCohortDashboard(cohortId: string) {
  const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
  if (!cohort) throw new NotFoundError("Cohort", cohortId);

  const activeStudentIds = (
    await prisma.cohortEnrollment.findMany({
      where: { cohortId, isActive: true },
      select: { studentId: true },
    })
  ).map((e) => e.studentId);

  const grouped = await prisma.student.groupBy({
    by: ["currentTrack", "programStatus"],
    where: { id: { in: activeStudentIds } },
    _count: true,
  });

  let trackA = 0;
  let trackA1 = 0;
  let trackA2 = 0;
  let trackB = 0;
  let graduated = 0;
  let unassigned = 0;

  for (const row of grouped) {
    if (row.programStatus === "GRADUATED") {
      graduated += row._count;
      continue;
    }
    if (row.currentTrack === null) unassigned += row._count;
    else if (row.currentTrack === "A") trackA += row._count;
    else if (row.currentTrack === "A1") trackA1 += row._count;
    else if (row.currentTrack === "A2") trackA2 += row._count;
    else if (row.currentTrack === "B") trackB += row._count;
  }

  return {
    trackACount: trackA + trackA1 + trackA2,
    trackBCount: trackB,
    graduatedCount: graduated,
    unassignedCount: unassigned,
    trackABreakdown: { unassignedSubTrack: trackA, a1: trackA1, a2: trackA2 },
    totalActiveStudents: activeStudentIds.length,
  };
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

// Ends a student's active enrollment without starting a new one — unlike
// enrollStudentInCohort's "move" behavior, this student ends up in no cohort
// at all. History is preserved (isActive: false, endedAt set) rather than
// deleted, so the timeline's "Left cohort X" entry (derived from endedAt in
// timeline.service.ts) shows up automatically.
export async function removeStudentFromCohort(
  input: { studentId: string; cohortId: string; reason?: string },
  actorId: string,
) {
  const enrollment = await prisma.cohortEnrollment.findFirst({
    where: { studentId: input.studentId, isActive: true },
    include: { cohort: true },
  });
  if (!enrollment) {
    throw new BusinessRuleError("This student is not currently enrolled in any cohort.");
  }
  if (enrollment.cohortId !== input.cohortId) {
    throw new BusinessRuleError(`This student is not currently enrolled in cohort '${input.cohortId}'.`);
  }

  const updated = await prisma.cohortEnrollment.update({
    where: { id: enrollment.id },
    data: { isActive: false, endedAt: new Date() },
  });

  await recordAuditEvent({
    actorId,
    action: "COHORT_REMOVED",
    entityType: "Student",
    entityId: input.studentId,
    before: { cohortId: enrollment.cohortId },
    after: { cohortId: null },
    metadata: { reason: input.reason },
  });

  return updated;
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
