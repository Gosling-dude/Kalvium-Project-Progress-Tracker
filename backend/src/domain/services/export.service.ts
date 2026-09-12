import * as XLSX from "xlsx";
import { prisma } from "../../lib/prisma";
import { toCsv } from "../../lib/csv";

const EXPORT_ROW_LIMIT = 5000;

export type ExportFormat = "csv" | "xlsx";

function buildWorkbook(rows: Record<string, unknown>[], columns: string[], sheetName: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: columns });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

export async function exportStudents(format: ExportFormat, filters: { cohortId?: string; track?: string } = {}) {
  const students = await prisma.student.findMany({
    where: {
      cohortEnrollments: filters.cohortId ? { some: { cohortId: filters.cohortId, isActive: true } } : undefined,
      currentTrack: filters.track,
    },
    include: {
      campus: true,
      growthCoach: true,
      cohortEnrollments: { where: { isActive: true }, include: { cohort: true }, take: 1 },
    },
    take: EXPORT_ROW_LIMIT,
  });

  const columns = [
    "fullName",
    "email",
    "phone",
    "campus",
    "batch",
    "growthCoach",
    "cohort",
    "currentTrack",
    "currentStage",
    "programStatus",
    "chosenProject",
    "createdAt",
  ];
  const rows = students.map((s) => ({
    fullName: s.fullName,
    email: s.email,
    phone: s.phone ?? "",
    campus: s.campus?.name ?? "",
    batch: s.batch ?? "",
    growthCoach: s.growthCoach?.name ?? "",
    cohort: s.cohortEnrollments[0]?.cohort.name ?? "",
    currentTrack: s.currentTrack,
    currentStage: s.currentStage,
    programStatus: s.programStatus,
    chosenProject: s.chosenProject ?? "",
    createdAt: s.createdAt.toISOString(),
  }));

  return format === "csv" ? toCsv(rows, columns) : buildWorkbook(rows, columns, "Students");
}

export async function exportInterviews(format: ExportFormat) {
  const interviews = await prisma.interview.findMany({
    include: { student: true, interviewer: true, evaluation: true },
    take: EXPORT_ROW_LIMIT,
    orderBy: { scheduledStart: "asc" },
  });

  const columns = [
    "studentName",
    "studentEmail",
    "interviewType",
    "sequenceNumber",
    "scheduledStart",
    "status",
    "interviewer",
    "highestRungHeld",
    "breakRung",
    "result",
  ];
  const rows = interviews.map((i) => ({
    studentName: i.student.fullName,
    studentEmail: i.student.email,
    interviewType: i.interviewType,
    sequenceNumber: i.sequenceNumber,
    scheduledStart: i.scheduledStart?.toISOString() ?? "",
    status: i.status,
    interviewer: i.interviewer?.name ?? "",
    highestRungHeld: i.evaluation?.highestRungHeld ?? "",
    breakRung: i.evaluation?.breakRung ?? "",
    result: i.evaluation?.result ?? "",
  }));

  return format === "csv" ? toCsv(rows, columns) : buildWorkbook(rows, columns, "Interviews");
}

export async function exportDeliverables(format: ExportFormat) {
  const deliverables = await prisma.deliverableAssignment.findMany({
    include: { student: true },
    take: EXPORT_ROW_LIMIT,
    orderBy: { assignedAt: "asc" },
  });

  const columns = ["studentName", "studentEmail", "track", "task", "estimatedTime", "status", "verificationStatus", "dueAt", "submittedAt"];
  const rows = deliverables.map((d) => ({
    studentName: d.student.fullName,
    studentEmail: d.student.email,
    track: d.track,
    task: d.title,
    estimatedTime: `${d.estimatedTimeValue} ${d.estimatedTimeUnit.toLowerCase()}`,
    status: d.status,
    verificationStatus: d.verificationStatus,
    dueAt: d.dueAt?.toISOString() ?? "",
    submittedAt: d.submittedAt?.toISOString() ?? "",
  }));

  return format === "csv" ? toCsv(rows, columns) : buildWorkbook(rows, columns, "Deliverables");
}

export async function exportHistory(format: ExportFormat, studentId?: string) {
  const transitions = await prisma.trackTransition.findMany({
    where: studentId ? { studentId } : undefined,
    include: { student: true, actor: true },
    take: EXPORT_ROW_LIMIT,
    orderBy: { effectiveAt: "asc" },
  });

  const columns = ["studentName", "studentEmail", "fromTrack", "toTrack", "fromStage", "toStage", "reason", "sourceType", "actor", "effectiveAt"];
  const rows = transitions.map((t) => ({
    studentName: t.student.fullName,
    studentEmail: t.student.email,
    fromTrack: t.fromTrack ?? "",
    toTrack: t.toTrack,
    fromStage: t.fromStage ?? "",
    toStage: t.toStage,
    reason: t.reason,
    sourceType: t.sourceType,
    actor: t.actor.name,
    effectiveAt: t.effectiveAt.toISOString(),
  }));

  return format === "csv" ? toCsv(rows, columns) : buildWorkbook(rows, columns, "History");
}
