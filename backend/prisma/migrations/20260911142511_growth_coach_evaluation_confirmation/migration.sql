-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GrowthCoachEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "track" TEXT NOT NULL,
    "completion" INTEGER,
    "quality" INTEGER,
    "evidence" TEXT,
    "demonstratedImprovement" INTEGER,
    "understanding" INTEGER,
    "ownership" INTEGER,
    "abilityToExplain" INTEGER,
    "foundationalGapsAddressed" BOOLEAN,
    "decision" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "evaluatorId" TEXT,
    "recordedById" TEXT NOT NULL,
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pendingAdminConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" DATETIME,
    "confirmedById" TEXT,
    CONSTRAINT "GrowthCoachEvaluation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GrowthCoachEvaluation_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GrowthCoachEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "GrowthCoach" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GrowthCoachEvaluation_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GrowthCoachEvaluation_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GrowthCoachEvaluation" ("abilityToExplain", "cohortEnrollmentId", "completion", "createdAt", "decision", "demonstratedImprovement", "evaluatedAt", "evaluatorId", "evidence", "feedback", "foundationalGapsAddressed", "id", "ownership", "quality", "recordedById", "studentId", "track", "understanding") SELECT "abilityToExplain", "cohortEnrollmentId", "completion", "createdAt", "decision", "demonstratedImprovement", "evaluatedAt", "evaluatorId", "evidence", "feedback", "foundationalGapsAddressed", "id", "ownership", "quality", "recordedById", "studentId", "track", "understanding" FROM "GrowthCoachEvaluation";
DROP TABLE "GrowthCoachEvaluation";
ALTER TABLE "new_GrowthCoachEvaluation" RENAME TO "GrowthCoachEvaluation";
CREATE INDEX "GrowthCoachEvaluation_studentId_idx" ON "GrowthCoachEvaluation"("studentId");
CREATE INDEX "GrowthCoachEvaluation_pendingAdminConfirmation_idx" ON "GrowthCoachEvaluation"("pendingAdminConfirmation");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
