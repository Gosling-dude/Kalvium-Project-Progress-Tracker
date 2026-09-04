import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAuth, requireRole } from "../middleware/auth";
import { ValidationError } from "../lib/errors";
import { commitStudentImport, parseSpreadsheetBuffer, previewStudentImport } from "../domain/services/import.service";
import { exportDeliverables, exportHistory, exportInterviews, exportStudents } from "../domain/services/export.service";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

export const importRouter = Router();
importRouter.use(requireAuth, requireRole("ADMIN"));

importRouter.post(
  "/students/preview",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new ValidationError("No file uploaded. Attach a .csv or .xlsx file as 'file'.");
    const rows = parseSpreadsheetBuffer(req.file.buffer);
    res.json({ data: await previewStudentImport(rows) });
  }),
);

importRouter.post(
  "/students/commit",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      rows: z.array(
        z.object({
          rowNumber: z.number(),
          email: z.string(),
          fullName: z.string(),
          growthCoachName: z.string().optional(),
          campusName: z.string().optional(),
          chosenProject: z.string().optional(),
          legacyNotes: z.string().optional().default(""),
        }),
      ),
      cohortId: z.string().optional(),
    });
    const input = schema.parse(req.body);
    res.json({ data: await commitStudentImport(input.rows, { cohortId: input.cohortId }, req.user!.id) });
  }),
);

export const exportRouter = Router();
exportRouter.use(requireAuth, requireRole("ADMIN"));

function sendExport(res: import("express").Response, filename: string, format: "csv" | "xlsx", content: string | Buffer) {
  if (format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    res.send(content);
  } else {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
    res.send(content);
  }
}

exportRouter.get(
  "/students",
  asyncHandler(async (req, res) => {
    const format = (req.query.format as "csv" | "xlsx") ?? "csv";
    const content = await exportStudents(format, { cohortId: req.query.cohortId as string, track: req.query.track as string });
    sendExport(res, "students", format, content);
  }),
);

exportRouter.get(
  "/interviews",
  asyncHandler(async (req, res) => {
    const format = (req.query.format as "csv" | "xlsx") ?? "csv";
    sendExport(res, "interviews", format, await exportInterviews(format));
  }),
);

exportRouter.get(
  "/deliverables",
  asyncHandler(async (req, res) => {
    const format = (req.query.format as "csv" | "xlsx") ?? "csv";
    sendExport(res, "deliverables", format, await exportDeliverables(format));
  }),
);

exportRouter.get(
  "/history",
  asyncHandler(async (req, res) => {
    const format = (req.query.format as "csv" | "xlsx") ?? "csv";
    sendExport(res, "history", format, await exportHistory(format, req.query.studentId as string));
  }),
);
