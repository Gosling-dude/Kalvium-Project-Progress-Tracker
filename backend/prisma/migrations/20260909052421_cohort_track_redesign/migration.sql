/*
  Warnings:

  - You are about to drop the column `campusId` on the `Cohort` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedTime` on the `DeliverableTemplate` table. All the data in the column will be lost.
  - You are about to drop the column `resumeReference` on the `Student` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Interview" ADD COLUMN "transcriptUrl" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Cohort" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Cohort" ("code", "createdAt", "description", "endDate", "id", "name", "notes", "startDate", "status", "updatedAt") SELECT "code", "createdAt", "description", "endDate", "id", "name", "notes", "startDate", "status", "updatedAt" FROM "Cohort";
DROP TABLE "Cohort";
ALTER TABLE "new_Cohort" RENAME TO "Cohort";
CREATE UNIQUE INDEX "Cohort_code_key" ON "Cohort"("code");
CREATE INDEX "Cohort_status_idx" ON "Cohort"("status");
CREATE TABLE "new_DeliverableTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gapAddressed" TEXT NOT NULL,
    "whatStudentMustDo" TEXT NOT NULL,
    "expectedOutcome" TEXT NOT NULL,
    "submissionType" TEXT NOT NULL,
    "submissionRequired" TEXT NOT NULL,
    "submissionDetails" TEXT,
    "verificationCriteria" TEXT NOT NULL,
    "estimatedTimeValue" REAL NOT NULL DEFAULT 1,
    "estimatedTimeUnit" TEXT NOT NULL DEFAULT 'HOURS',
    "track" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DeliverableTemplate" ("active", "createdAt", "expectedOutcome", "gapAddressed", "id", "key", "order", "submissionDetails", "submissionRequired", "submissionType", "title", "track", "updatedAt", "verificationCriteria", "version", "whatStudentMustDo") SELECT "active", "createdAt", "expectedOutcome", "gapAddressed", "id", "key", "order", "submissionDetails", "submissionRequired", "submissionType", "title", "track", "updatedAt", "verificationCriteria", "version", "whatStudentMustDo" FROM "DeliverableTemplate";
DROP TABLE "DeliverableTemplate";
ALTER TABLE "new_DeliverableTemplate" RENAME TO "DeliverableTemplate";
CREATE UNIQUE INDEX "DeliverableTemplate_key_key" ON "DeliverableTemplate"("key");
CREATE TABLE "new_Flag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedToId" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "resolutionNote" TEXT,
    CONSTRAINT "Flag_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Flag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Flag_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Flag_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Flag" ("category", "createdAt", "createdById", "description", "id", "resolutionNote", "resolvedAt", "resolvedById", "severity", "status", "studentId", "title") SELECT "category", "createdAt", "createdById", "description", "id", "resolutionNote", "resolvedAt", "resolvedById", "severity", "status", "studentId", "title" FROM "Flag";
DROP TABLE "Flag";
ALTER TABLE "new_Flag" RENAME TO "Flag";
CREATE INDEX "Flag_studentId_idx" ON "Flag"("studentId");
CREATE INDEX "Flag_status_idx" ON "Flag"("status");
CREATE INDEX "Flag_assignedToId_idx" ON "Flag"("assignedToId");
CREATE TABLE "new_GrowthCoach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "campusId" TEXT,
    "userId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrowthCoach_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GrowthCoach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GrowthCoach" ("active", "campusId", "createdAt", "email", "id", "name", "updatedAt") SELECT "active", "campusId", "createdAt", "email", "id", "name", "updatedAt" FROM "GrowthCoach";
DROP TABLE "GrowthCoach";
ALTER TABLE "new_GrowthCoach" RENAME TO "GrowthCoach";
CREATE UNIQUE INDEX "GrowthCoach_email_key" ON "GrowthCoach"("email");
CREATE UNIQUE INDEX "GrowthCoach_userId_key" ON "GrowthCoach"("userId");
CREATE INDEX "GrowthCoach_campusId_idx" ON "GrowthCoach"("campusId");
CREATE TABLE "new_Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "campusId" TEXT,
    "growthCoachId" TEXT,
    "currentTrack" TEXT,
    "currentStage" TEXT NOT NULL DEFAULT 'PROJECT_REVIEW',
    "programStatus" TEXT NOT NULL DEFAULT 'ONBOARDING',
    "batch" TEXT,
    "chosenProject" TEXT,
    "resumeLink" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_growthCoachId_fkey" FOREIGN KEY ("growthCoachId") REFERENCES "GrowthCoach" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Student" ("campusId", "chosenProject", "createdAt", "createdById", "currentStage", "currentTrack", "email", "fullName", "growthCoachId", "id", "notes", "phone", "programStatus", "updatedAt") SELECT "campusId", "chosenProject", "createdAt", "createdById", "currentStage", "currentTrack", "email", "fullName", "growthCoachId", "id", "notes", "phone", "programStatus", "updatedAt" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");
CREATE INDEX "Student_campusId_idx" ON "Student"("campusId");
CREATE INDEX "Student_growthCoachId_idx" ON "Student"("growthCoachId");
CREATE INDEX "Student_currentTrack_idx" ON "Student"("currentTrack");
CREATE INDEX "Student_programStatus_idx" ON "Student"("programStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
