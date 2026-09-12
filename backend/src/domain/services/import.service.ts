import * as XLSX from "xlsx";
import { prisma } from "../../lib/prisma";
import { BusinessRuleError, ValidationError } from "../../lib/errors";
import { recordAuditEvent } from "./audit.service";
import { enrollStudentInCohort } from "./cohort.service";

// Maps the operational spreadsheet's column headers (see IMPORT_MAPPING.md)
// onto our normalized fields. Campus and Growth Coach are resolved against
// existing reference data by name/email when possible, but a name/email that
// doesn't match anything on file is no longer dropped — see
// resolveOrCreateCampus/resolveOrCreateGrowthCoach below, which create a
// minimal placeholder instead so the student record is never left blank
// just because nobody registered that campus/coach in Settings first.
const HEADER_ALIASES: Record<string, string> = {
  "student email": "email",
  email: "email",
  "full name": "fullName",
  name: "fullName",
  "growth coach": "growthCoachName",
  "growth coach name": "growthCoachName",
  "growth coach email": "growthCoachEmail",
  "coach email": "growthCoachEmail",
  campus: "campusName",
  "chosen project": "chosenProject",
  batch: "batch",
  year: "batch",
  "batch year": "batch", // also matches "Batch/Year", "Batch-Year", "Batch_Year" — see normalizeHeader
  "resume link": "resumeLink",
  "resume drive link": "resumeLink",
  "google drive link": "resumeLink",
  "resume google drive link": "resumeLink",
  resume: "resumeLink",
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

// A header like "Batch/Year" or "Batch - Year" must still match the "batch
// year" alias above — collapse any punctuation between words into a single
// space before looking it up, rather than requiring an exact string match
// per possible separator.
function normalizeHeader(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface NormalizedRow {
  rowNumber: number;
  email?: string;
  fullName?: string;
  growthCoachName?: string;
  growthCoachEmail?: string;
  campusName?: string;
  chosenProject?: string;
  batch?: string;
  resumeLink?: string;
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
    const alias = HEADER_ALIASES[normalizeHeader(key)];
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
    growthCoachEmail: normalized.growthCoachEmail || undefined,
    campusName: normalized.campusName || undefined,
    chosenProject: normalized.chosenProject || undefined,
    batch: normalized.batch || undefined,
    resumeLink: normalized.resumeLink || undefined,
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
      warnings.push({
        rowNumber,
        message: `Student with email ${row.email} already exists — the existing record won't be duplicated, any blank campus/growth coach/batch/project fields will be filled in from this file, and they'll still be enrolled into the cohort if one is selected.`,
      });
    }

    validRows.push(row);
  });

  return { totalRows: rawRows.length, validRows, errors, warnings };
}

function campusCodeFromName(name: string, takenCodes: Set<string>): string {
  const base = name.toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12) || "CAMPUS";
  if (!takenCodes.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}${n}`;
    if (!takenCodes.has(candidate)) return candidate;
  }
}

// Campus has no login/security implications (just name + a generated code),
// so an unrecognized name is safe to create on the spot rather than leaving
// the student's campus blank until someone registers it in Settings first.
async function resolveOrCreateCampus(
  name: string | undefined,
  campusByName: Map<string, { id: string; name: string; code: string }>,
  takenCodes: Set<string>,
  actorId: string,
  rowNumber: number,
  warnings: ImportRowWarning[],
): Promise<string | undefined> {
  if (!name) return undefined;
  const key = name.toLowerCase();
  const existing = campusByName.get(key);
  if (existing) return existing.id;

  const code = campusCodeFromName(name, takenCodes);
  takenCodes.add(code);
  const created = await prisma.campus.create({ data: { name, code, active: false } });
  campusByName.set(key, created);
  warnings.push({
    rowNumber,
    message: `Campus '${name}' wasn't in the system — added it automatically (code ${code}, inactive by default). Review it in Settings.`,
  });
  return created.id;
}

// Growth Coach's email is a required, unique, login-capable identity — we
// only auto-create one when the file actually gives us an email to use.
// Matching by name alone with no email present can't be safely turned into a
// new record (there's nothing unique to create it with), so that case stays
// unassigned with a warning telling the admin what's needed.
async function resolveOrCreateGrowthCoach(
  name: string | undefined,
  email: string | undefined,
  coachByName: Map<string, { id: string; name: string; email: string }>,
  coachByEmail: Map<string, { id: string; name: string; email: string }>,
  actorId: string,
  rowNumber: number,
  warnings: ImportRowWarning[],
): Promise<string | undefined> {
  if (email) {
    const existing = coachByEmail.get(email.toLowerCase());
    if (existing) return existing.id;

    const created = await prisma.growthCoach.create({
      data: { name: name || email, email, active: false },
    });
    coachByEmail.set(email.toLowerCase(), created);
    coachByName.set(created.name.toLowerCase(), created);
    warnings.push({
      rowNumber,
      message: `Growth Coach '${email}' wasn't in the system — added a profile automatically (inactive, no login yet). Review it in Settings.`,
    });
    return created.id;
  }

  if (!name) return undefined;
  const existing = coachByName.get(name.toLowerCase());
  if (existing) return existing.id;

  warnings.push({
    rowNumber,
    message: `Growth Coach '${name}' not found and no email was given for them, so a new profile couldn't be created — left unassigned. Add them in Settings (with an email) then edit this student, or add a "Growth Coach Email" column and re-upload.`,
  });
  return undefined;
}

export async function commitStudentImport(
  rows: NormalizedRow[],
  input: { cohortId?: string },
  actorId: string,
) {
  const [campuses, growthCoaches, cohort] = await Promise.all([
    prisma.campus.findMany(),
    prisma.growthCoach.findMany(),
    input.cohortId ? prisma.cohort.findUnique({ where: { id: input.cohortId } }) : null,
  ]);
  const campusByName = new Map(campuses.map((c) => [c.name.toLowerCase(), c]));
  const coachByName = new Map(growthCoaches.map((c) => [c.name.toLowerCase(), c]));
  const coachByEmail = new Map(growthCoaches.map((c) => [c.email.toLowerCase(), c]));
  const takenCampusCodes = new Set(campuses.map((c) => c.code));

  if (input.cohortId) {
    if (!cohort) throw new ValidationError(`Cohort ${input.cohortId} not found.`);
    if (cohort.status !== "ACTIVE") {
      throw new BusinessRuleError(`Cohort '${cohort.name}' is not active and cannot accept new enrollments.`);
    }
  }

  let created = 0;
  let skippedExisting = 0;
  let updatedExisting = 0;
  let enrolled = 0;
  let alreadyInCohort = 0;
  const warnings: ImportRowWarning[] = [];

  for (const row of rows) {
    const campusId = await resolveOrCreateCampus(row.campusName, campusByName, takenCampusCodes, actorId, row.rowNumber, warnings);
    const growthCoachId = await resolveOrCreateGrowthCoach(
      row.growthCoachName,
      row.growthCoachEmail,
      coachByName,
      coachByEmail,
      actorId,
      row.rowNumber,
      warnings,
    );

    let student = await prisma.student.findUnique({ where: { email: row.email! } });

    if (student) {
      skippedExisting++;
      // Only fill in gaps — never overwrite a field someone has already
      // set through the UI just because this row's column was blank.
      const fill: Record<string, unknown> = {};
      if (!student.campusId && campusId) fill.campusId = campusId;
      if (!student.growthCoachId && growthCoachId) fill.growthCoachId = growthCoachId;
      if (!student.batch && row.batch) fill.batch = row.batch;
      if (!student.chosenProject && row.chosenProject) fill.chosenProject = row.chosenProject;
      if (!student.resumeLink && row.resumeLink) fill.resumeLink = row.resumeLink;
      if (Object.keys(fill).length > 0) {
        student = await prisma.student.update({ where: { id: student.id }, data: fill });
        updatedExisting++;
      }
    } else {
      student = await prisma.student.create({
        data: {
          fullName: row.fullName!,
          email: row.email!,
          campusId,
          growthCoachId,
          chosenProject: row.chosenProject,
          batch: row.batch,
          resumeLink: row.resumeLink,
          notes: row.legacyNotes || undefined,
          createdById: actorId,
        },
      });
      created++;
    }

    // Every row in the file gets enrolled — new or already on file — so a
    // cohort-scoped upload both fills gaps in the student database AND adds
    // everyone in the sheet to this cohort in one pass. Already being
    // enrolled here is a no-op, not a failure, since re-uploading the same
    // roster (e.g. to add a few new names) must not blow up on the rest.
    if (input.cohortId) {
      try {
        await enrollStudentInCohort({ studentId: student.id, cohortId: input.cohortId }, actorId);
        enrolled++;
      } catch (err) {
        if (err instanceof BusinessRuleError) {
          alreadyInCohort++;
        } else {
          throw err;
        }
      }
    }
  }

  await recordAuditEvent({
    actorId,
    action: "STUDENTS_IMPORTED",
    entityType: "Student",
    entityId: "bulk-import",
    after: { created, skippedExisting, updatedExisting, enrolled, alreadyInCohort },
  });

  return { created, skippedExisting, updatedExisting, enrolled, alreadyInCohort, warnings };
}
