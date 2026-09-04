-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "estimatedTime" TEXT,
    "track" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DeliverableTemplate" ("active", "createdAt", "estimatedTime", "expectedOutcome", "gapAddressed", "id", "key", "order", "submissionDetails", "submissionRequired", "submissionType", "title", "track", "updatedAt", "verificationCriteria", "version", "whatStudentMustDo") SELECT "active", "createdAt", "estimatedTime", "expectedOutcome", "gapAddressed", "id", "key", "order", "submissionDetails", "submissionRequired", "submissionType", "title", "track", "updatedAt", "verificationCriteria", "version", "whatStudentMustDo" FROM "DeliverableTemplate";
DROP TABLE "DeliverableTemplate";
ALTER TABLE "new_DeliverableTemplate" RENAME TO "DeliverableTemplate";
CREATE UNIQUE INDEX "DeliverableTemplate_key_key" ON "DeliverableTemplate"("key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
