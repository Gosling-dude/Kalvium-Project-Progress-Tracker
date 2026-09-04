-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "chosenProject" TEXT,
    "resumeReference" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_growthCoachId_fkey" FOREIGN KEY ("growthCoachId") REFERENCES "GrowthCoach" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Student" ("campusId", "chosenProject", "createdAt", "createdById", "currentStage", "currentTrack", "email", "fullName", "growthCoachId", "id", "notes", "phone", "programStatus", "resumeReference", "updatedAt") SELECT "campusId", "chosenProject", "createdAt", "createdById", "currentStage", "currentTrack", "email", "fullName", "growthCoachId", "id", "notes", "phone", "programStatus", "resumeReference", "updatedAt" FROM "Student";
DROP TABLE "Student";
ALTER TABLE "new_Student" RENAME TO "Student";
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");
CREATE INDEX "Student_campusId_idx" ON "Student"("campusId");
CREATE INDEX "Student_growthCoachId_idx" ON "Student"("growthCoachId");
CREATE INDEX "Student_currentTrack_idx" ON "Student"("currentTrack");
CREATE INDEX "Student_programStatus_idx" ON "Student"("programStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
