import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { recordAuditEvent } from "./audit.service";
import { enrollStudentInCohort } from "./cohort.service";
import type { ProgramStatus, Track } from "../constants/enums";

export interface StudentListFilters {
  search?: string;
  cohortId?: string;
  campusId?: string;
  growthCoachId?: string;
  track?: Track;
  programStatus?: ProgramStatus;
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
    where.OR = [
      { fullName: { contains: filters.search } },
      { email: { contains: filters.search } },
      { chosenProject: { contains: filters.search } },
    ];
  }
  if (filters.campusId) where.campusId = filters.campusId;
  if (filters.growthCoachId) where.growthCoachId = filters.growthCoachId;
  if (filters.track) where.currentTrack = filters.track;
  if (filters.programStatus) where.programStatus = filters.programStatus;
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
      },
    }),
  ]);

  return {
    data: students.map((s) => ({
      ...s,
      currentCohort: s.cohortEnrollments[0]?.cohort ?? null,
      openFlagCount: s._count.flags,
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
  chosenProject?: string;
  resumeReference?: string;
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
      chosenProject: input.chosenProject,
      resumeReference: input.resumeReference,
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

export async function getStudentSummary(id: string) {
  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      campus: true,
      growthCoach: true,
      cohortEnrollments: { where: { isActive: true }, include: { cohort: true }, take: 1 },
      flags: { where: { status: "OPEN" } },
    },
  });
  if (!student) throw new NotFoundError("Student", id);
  return { ...student, currentCohort: student.cohortEnrollments[0]?.cohort ?? null };
}
