-- DropIndex
DROP INDEX "Checkpoint_studentId_idx";

-- DropIndex
DROP INDEX "DeliverableTemplate_key_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Checkpoint";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "DeliverableTemplate";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeliverableAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
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
    CONSTRAINT "DeliverableAssignment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliverableAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_DeliverableAssignment" ("assignedAt", "cohortEnrollmentId", "createdAt", "createdById", "dueAt", "estimatedTimeUnit", "estimatedTimeValue", "expectedOutcome", "feedback", "gapAddressed", "id", "status", "studentId", "submissionDetails", "submissionFromStudent", "submissionRequired", "submissionType", "submittedAt", "title", "track", "updatedAt", "verificationCriteria", "verificationStatus", "verifiedAt", "verifiedById", "whatStudentMustDo") SELECT "assignedAt", "cohortEnrollmentId", "createdAt", "createdById", "dueAt", "estimatedTimeUnit", "estimatedTimeValue", "expectedOutcome", "feedback", "gapAddressed", "id", "status", "studentId", "submissionDetails", "submissionFromStudent", "submissionRequired", "submissionType", "submittedAt", "title", "track", "updatedAt", "verificationCriteria", "verificationStatus", "verifiedAt", "verifiedById", "whatStudentMustDo" FROM "DeliverableAssignment";
DROP TABLE "DeliverableAssignment";
ALTER TABLE "new_DeliverableAssignment" RENAME TO "DeliverableAssignment";
CREATE INDEX "DeliverableAssignment_studentId_idx" ON "DeliverableAssignment"("studentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

