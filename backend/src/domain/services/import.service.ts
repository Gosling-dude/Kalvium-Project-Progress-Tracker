import * as XLSX from "xlsx";
import { prisma } from "../../lib/prisma";
import { ValidationError } from "../../lib/errors";
import { recordAuditEvent } from "./audit.service";
import { enrollStudentInCohort } from "./cohort.service";

// Maps the operational spreadsheet's column headers (see IMPORT_MAPPING.md)
// onto our normalized fields. Anything we can't confidently map to a real
// entity (Growth Coach / Campus not already on file, free-text track/rung
// history) is preserved as a note rather than silently fabricated as
// structured evaluation data — see spec section 32/47.
const HEADER_ALIASES: Record<string, string> = {
  "student email": "email",
  email: "email",
  "full name": "fullName",
  name: "fullName",
  "growth coach": "growthCoachName",
  campus: "campusName",
  "chosen project": "chosenProject",
  remarks: "remarks",
  "resume screening": "resumeScreening",
  track: "trackHint",
  "video question rung": "videoQuestionRung",
  "1st interview rung held": "interview1Rung",
  "2nd interview rung held": "interview2Rung",
  "final status": "finalStatus",
  feedback: "feedback",
  history: "history",
};

interface NormalizedRow {
  rowNumber: number;
  email?: string;
  fullName?: string;
  growthCoachName?: string;
  campusName?: string;
  chosenProject?: string;
  legacyNotes: string;
}

export interface ImportRowError {
  rowNumber: number;
  message: string;
}

export interface ImportRowWarning {
  rowNumber: number;
  message: string;
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: NormalizedRow[];
  errors: ImportRowError[];
  warnings: ImportRowWarning[];
}

export function parseSpreadsheetBuffer(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
}

function normalizeRow(raw: Record<string, unknown>, rowNumber: number): NormalizedRow {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const alias = HEADER_ALIASES[key.trim().toLowerCase()];
    if (alias) normalized[alias] = String(value ?? "").trim();
  }

  const legacyParts: string[] = [];
  for (const field of ["remarks", "resumeScreening", "trackHint", "videoQuestionRung", "interview1Rung", "interview2Rung", "finalStatus", "feedback", "history"]) {
    if (normalized[field]) legacyParts.push(`${field}: ${normalized[field]}`);
  }

  return {
    rowNumber,
    email: normalized.email || undefined,
    fullName: normalized.fullName || undefined,
    growthCoachName: normalized.growthCoachName || undefined,
    campusName: normalized.campusName || undefined,
    chosenProject: normalized.chosenProject || undefined,
    legacyNotes: legacyParts.length > 0 ? `[Imported from workbook] ${legacyParts.join("; ")}` : "",
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function previewStudentImport(rawRows: Record<string, unknown>[]): Promise<ImportPreviewResult> {
  if (rawRows.length === 0) throw new ValidationError("The uploaded file has no data rows.");

  const existingEmails = new Set(
    (await prisma.student.findMany({ select: { email: true } })).map((s) => s.email.toLowerCase()),
  );

  const errors: ImportRowError[] = [];
  const warnings: ImportRowWarning[] = [];
  const validRows: NormalizedRow[] = [];
  const seenInFile = new Set<string>();

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2; // header is row 1
    const row = normalizeRow(raw, rowNumber);

    if (!row.email || !EMAIL_RE.test(row.email)) {
      errors.push({ rowNumber, message: "Missing or invalid email address." });
      return;
    }
    if (!row.fullName) {
      errors.push({ rowNumber, message: "Missing full name." });
      return;
    }
    const emailLower = row.email.toLowerCase();
    if (seenInFile.has(emailLower)) {
      errors.push({ rowNumber, message: `Duplicate email within file: ${row.email}` });
      return;
    }
    seenInFile.add(emailLower);
    if (existingEmails.has(emailLower)) {
      warnings.push({ rowNumber, message: `Student with email ${row.email} already exists — row will be skipped on commit.` });
    }

    validRows.push(row);
  });

  return { totalRows: rawRows.length, validRows, errors, warnings };
}

export async function commitStudentImport(
  rows: NormalizedRow[],
  input: { cohortId?: string },
  actorId: string,
) {
  const [campuses, growthCoaches] = await Promise.all([
    prisma.campus.findMany(),
    prisma.growthCoach.findMany(),
  ]);
  const campusByName = new Map(campuses.map((c) => [c.name.toLowerCase(), c]));
  const coachByName = new Map(growthCoaches.map((c) => [c.name.toLowerCase(), c]));

  let created = 0;
  let skippedExisting = 0;
  const unresolvedWarnings: ImportRowWarning[] = [];

  for (const row of rows) {
    const existing = await prisma.student.findUnique({ where: { email: row.email! } });
    if (existing) {
      skippedExisting++;
      continue;
    }

    const campus = row.campusName ? campusByName.get(row.campusName.toLowerCase()) : undefined;
    if (row.campusName && !campus) {
      unresolvedWarnings.push({ rowNumber: row.rowNumber, message: `Campus '${row.campusName}' not found — left unassigned.` });
    }
    const coach = row.growthCoachName ? coachByName.get(row.growthCoachName.toLowerCase()) : undefined;
    if (row.growthCoachName && !coach) {
      unresolvedWarnings.push({ rowNumber: row.rowNumber, message: `Growth Coach '${row.growthCoachName}' not found — left unassigned.` });
    }

    const student = await prisma.student.create({
      data: {
        fullName: row.fullName!,
        email: row.email!,
        campusId: campus?.id,
        growthCoachId: coach?.id,
        chosenProject: row.chosenProject,
        notes: row.legacyNotes || undefined,
        createdById: actorId,
      },
    });

    if (input.cohortId) {
      await enrollStudentInCohort({ studentId: student.id, cohortId: input.cohortId }, actorId);
    }
    created++;
  }

  await recordAuditEvent({
    actorId,
    action: "STUDENTS_IMPORTED",
    entityType: "Student",
    entityId: "bulk-import",
    after: { created, skippedExisting },
  });

  return { created, skippedExisting, warnings: unresolvedWarnings };
}
