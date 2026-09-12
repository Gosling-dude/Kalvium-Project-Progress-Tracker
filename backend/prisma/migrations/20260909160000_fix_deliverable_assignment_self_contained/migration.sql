/*
  Fixes drift between schema.prisma and the actual database: migration
  20260909052421_cohort_track_redesign made DeliverableAssignment
  self-contained (title/gapAddressed/whatStudentMustDo/expectedOutcome/
  submissionRequired/submissionDetails/verificationCriteria/estimatedTimeValue/
  estimatedTimeUnit moved onto the assignment itself, templateId/
  templateSnapshot made optional provenance) in schema.prisma, but the
  generated migration.sql never actually altered the DeliverableAssignment
  table. This migration applies that change for real, backfilling the new
  required columns from the existing templateSnapshot JSON where available.
*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeliverableAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "templateId" TEXT,
    "templateSnapshot" TEXT,
    "title" TEXT NOT NULL,
    "gapAddressed" TEXT NOT NULL,
    "whatStudentMustDo" TEXT NOT NULL,
    "expectedOutcome" TEXT NOT NULL,
    "submissionRequired" TEXT NOT NULL,
    "submissionDetails" TEXT,
    "verificationCriteria" TEXT NOT NULL,
    "estimatedTimeValue" REAL NOT NULL,
    "estimatedTimeUnit" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "checkpointId" TEXT,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" DATETIME,
    "submissionType" TEXT NOT NULL,
    "submissionFromStudent" TEXT,
    "submittedAt" DATETIME,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedAt" DATETIME,
    "verifiedById" TEXT,
    "feedback" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliverableAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliverableAssignment_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliverableAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DeliverableTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliverableAssignment_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "Checkpoint" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliverableAssignment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliverableAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DeliverableAssignment" (
    "id", "studentId", "cohortEnrollmentId", "templateId", "templateSnapshot",
    "title", "gapAddressed", "whatStudentMustDo", "expectedOutcome",
    "submissionRequired", "submissionDetails", "verificationCriteria",
    "estimatedTimeValue", "estimatedTimeUnit",
    "track", "checkpointId", "assignedAt", "dueAt",
    "submissionType", "submissionFromStudent", "submittedAt",
    "verificationStatus", "verifiedAt", "verifiedById", "feedback",
    "status", "createdById", "createdAt", "updatedAt"
)
SELECT
    "id", "studentId", "cohortEnrollmentId", "templateId", "templateSnapshot",
    COALESCE(json_extract("templateSnapshot", '$.title'), ''),
    COALESCE(json_extract("templateSnapshot", '$.gapAddressed'), ''),
    COALESCE(json_extract("templateSnapshot", '$.whatStudentMustDo'), ''),
    COALESCE(json_extract("templateSnapshot", '$.expectedOutcome'), ''),
    COALESCE(json_extract("templateSnapshot", '$.submissionRequired'), ''),
    json_extract("templateSnapshot", '$.submissionDetails'),
    COALESCE(json_extract("templateSnapshot", '$.verificationCriteria'), ''),
    COALESCE(json_extract("templateSnapshot", '$.estimatedTimeValue'), 1),
    COALESCE(json_extract("templateSnapshot", '$.estimatedTimeUnit'), 'HOURS'),
    "track", "checkpointId", "assignedAt", "dueAt",
    "submissionType", "submissionFromStudent", "submittedAt",
    "verificationStatus", "verifiedAt", "verifiedById", "feedback",
    "status", "createdById", "createdAt", "updatedAt"
FROM "DeliverableAssignment";
DROP TABLE "DeliverableAssignment";
ALTER TABLE "new_DeliverableAssignment" RENAME TO "DeliverableAssignment";
CREATE INDEX "DeliverableAssignment_studentId_idx" ON "DeliverableAssignment"("studentId");
CREATE INDEX "DeliverableAssignment_checkpointId_idx" ON "DeliverableAssignment"("checkpointId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
