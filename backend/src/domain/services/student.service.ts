import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { recordAuditEvent } from "./audit.service";
import { enrollStudentInCohort } from "./cohort.service";
import { deriveDisplayStatus } from "../../lib/displayStatus";
import { deriveDeliverableSetStatus } from "./developmentTrack.service";
import type { ProgramStatus, Track } from "../constants/enums";

export interface StudentListFilters {
  search?: string;
  cohortId?: string;
  campusId?: string;
  growthCoachId?: string;
  track?: Track;
  programStatus?: ProgramStatus;
  batch?: string;
  hasOpenFlags?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "newest" | "oldest" | "updated" | "name" | "track";
}

export async function listStudents(filters: StudentListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));

  const where: Prisma.StudentWhereInput = {};
  if (filters.search) {
    // SQLite's `contains` is case-insensitive by default; Postgres's is not.
    // `mode` isn't a valid StringFilter field on the SQLite-generated client,
    // so it's only spread in when the currently-generated client is Postgres
    // (i.e. DATABASE_URL is a postgres:// URL) — keeps this file compiling
    // against either of the two schemas described in DEPLOYMENT.md.
    const caseInsensitive = process.env.DATABASE_URL?.startsWith("postgres")
      ? { mode: "insensitive" as const }
      : {};
    where.OR = [
      { fullName: { contains: filters.search, ...caseInsensitive } },
      { email: { contains: filters.search, ...caseInsensitive } },
      { chosenProject: { contains: filters.search, ...caseInsensitive } },
    ];
  }
  if (filters.campusId) where.campusId = filters.campusId;
  if (filters.growthCoachId) where.growthCoachId = filters.growthCoachId;
  if (filters.track) where.currentTrack = filters.track;
  if (filters.programStatus) where.programStatus = filters.programStatus;
  if (filters.batch) where.batch = filters.batch;
  if (filters.cohortId) {
    where.cohortEnrollments = { some: { cohortId: filters.cohortId, isActive: true } };
  }
  if (filters.hasOpenFlags) {
    where.flags = { some: { status: "OPEN" } };
  }

  const orderBy: Prisma.StudentOrderByWithRelationInput =
    filters.sort === "oldest"
      ? { createdAt: "asc" }
      : filters.sort === "updated"
        ? { updatedAt: "desc" }
        : filters.sort === "name"
          ? { fullName: "asc" }
          : filters.sort === "track"
            ? { currentTrack: "asc" }
            : { createdAt: "desc" };

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        campus: { select: { id: true, name: true } },
        growthCoach: { select: { id: true, name: true } },
        cohortEnrollments: { where: { isActive: true }, include: { cohort: true }, take: 1 },
        _count: { select: { flags: { where: { status: "OPEN" } } } },
        // Only used to derive deliverableSetStatus below — not returned as
        // its own field, so the list payload stays lean.
        deliverableAssignments: { select: { track: true, status: true } },
      },
    }),
  ]);

  return {
    data: students.map(({ deliverableAssignments, ...s }) => ({
      ...s,
      currentCohort: s.cohortEnrollments[0]?.cohort ?? null,
      openFlagCount: s._count.flags,
      displayStatus: deriveDisplayStatus(s),
      deliverableSetStatus: deriveDeliverableSetStatus(s, deliverableAssignments),
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

export interface CreateStudentInput {
  fullName: string;
  email: string;
  phone?: string;
  campusId?: string;
  growthCoachId?: string;
  batch?: string;
  chosenProject?: string;
  resumeLink?: string;
  notes?: string;
  cohortId?: string;
}

export async function createStudent(input: CreateStudentInput, actorId: string) {
  const existing = await prisma.student.findUnique({ where: { email: input.email } });
  if (existing) throw new ValidationError(`A student with email '${input.email}' already exists.`);

  const student = await prisma.student.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      campusId: input.campusId,
      growthCoachId: input.growthCoachId,
      batch: input.batch,
      chosenProject: input.chosenProject,
      resumeLink: input.resumeLink,
      notes: input.notes,
      createdById: actorId,
    },
  });

  if (input.cohortId) {
    await enrollStudentInCohort({ studentId: student.id, cohortId: input.cohortId }, actorId);
  }

  await recordAuditEvent({
    actorId,
    action: "STUDENT_CREATED",
    entityType: "Student",
    entityId: student.id,
    after: student,
  });

  return student;
}

export async function updateStudent(
  id: string,
  input: Partial<Omit<CreateStudentInput, "cohortId" | "email">> & { email?: string },
  actorId: string,
) {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw new NotFoundError("Student", id);

  if (input.email && input.email !== student.email) {
    const existing = await prisma.student.findUnique({ where: { email: input.email } });
    if (existing) throw new ValidationError(`A student with email '${input.email}' already exists.`);
  }

  const updated = await prisma.student.update({ where: { id }, data: input });
  await recordAuditEvent({
    actorId,
    action: "STUDENT_UPDATED",
    entityType: "Student",
    entityId: id,
    before: student,
    after: updated,
  });
  return updated;
}

// Permanently erases a student and every record that exists only because of
// them — enrollment history, reviews, video/interview evaluations,
// deliverables, flags, graduation decisions, and their email recipient/
// delivery rows. This is a hard, irreversible delete (not the
// normal append-only history model used everywhere else in this app), so it
// exists only for genuine "this record should never have existed" cases —
// removing someone from a cohort while keeping their history is
// `removeStudentFromCohort` instead. Deletion order matters: every table
// below is deleted child-first so no foreign key is ever left dangling.
export async function deleteStudent(id: string, actorId: string) {
  const student = await prisma.student.findUnique({ where: { id } });
  if (!student) throw new NotFoundError("Student", id);

  await prisma.$transaction(async (tx) => {
    const [projectReviews, videoAssignments, interviews] = await Promise.all([
      tx.projectReview.findMany({ where: { studentId: id }, select: { id: true } }),
      tx.videoAssignment.findMany({ where: { studentId: id }, select: { id: true } }),
      tx.interview.findMany({ where: { studentId: id }, select: { id: true } }),
    ]);
    const projectReviewIds = projectReviews.map((r) => r.id);
    const videoAssignmentIds = videoAssignments.map((v) => v.id);
    const interviewIds = interviews.map((i) => i.id);

    const emailRecipients = await tx.emailRecipient.findMany({
      where: {
        OR: [
          { studentId: id },
          { videoAssignmentId: { in: videoAssignmentIds } },
          { interviewId: { in: interviewIds } },
        ],
      },
      select: { id: true },
    });
    const emailRecipientIds = emailRecipients.map((r) => r.id);

    await tx.emailDeliveryAttempt.deleteMany({ where: { emailRecipientId: { in: emailRecipientIds } } });
    await tx.emailRecipient.deleteMany({ where: { id: { in: emailRecipientIds } } });

    await tx.projectReviewScore.deleteMany({ where: { projectReviewId: { in: projectReviewIds } } });
    await tx.videoQuestionEvaluation.deleteMany({ where: { videoAssignmentId: { in: videoAssignmentIds } } });
    await tx.interviewEvaluation.deleteMany({ where: { interviewId: { in: interviewIds } } });

    await tx.projectReview.deleteMany({ where: { studentId: id } });
    await tx.videoAssignment.deleteMany({ where: { studentId: id } });
    await tx.interview.deleteMany({ where: { studentId: id } });
    await tx.deliverableAssignment.deleteMany({ where: { studentId: id } });
    await tx.growthCoachEvaluation.deleteMany({ where: { studentId: id } });
    await tx.graduationDecision.deleteMany({ where: { studentId: id } });
    await tx.flag.deleteMany({ where: { studentId: id } });
    await tx.trackTransition.deleteMany({ where: { studentId: id } });
    await tx.cohortEnrollment.deleteMany({ where: { studentId: id } });

    await tx.student.delete({ where: { id } });
  });

  await recordAuditEvent({
    actorId,
    action: "STUDENT_DELETED",
    entityType: "Student",
    entityId: id,
    before: { fullName: student.fullName, email: student.email },
  });
}

export async function getStudentSummary(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      campus: true,
      growthCoach: true,
      cohortEnrollments: { where: { isActive: true }, include: { cohort: true }, take: 1 },
      flags: { where: { status: "OPEN" } },
      deliverableAssignments: { select: { track: true, status: true } },
    },
  });
  if (!student) throw new NotFoundError("Student", id);
  const { deliverableAssignments, ...rest } = student;
  return {
    ...rest,
    currentCohort: rest.cohortEnrollments[0]?.cohort ?? null,
    displayStatus: deriveDisplayStatus(rest),
    deliverableSetStatus: deriveDeliverableSetStatus(rest, deliverableAssignments),
  };
}
