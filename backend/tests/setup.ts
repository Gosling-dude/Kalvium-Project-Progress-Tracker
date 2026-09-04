import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../.env.test"), override: true });

import { beforeEach } from "vitest";
import { prisma } from "../src/lib/prisma";
import { seedAdminUser, seedBaselineReferenceData } from "../src/domain/services/systemSeed.service";

// Deletion order respects foreign keys (children before parents). Run inside
// each test file before every test so tests never see another test's data.
async function resetDatabase() {
  const tableNames = [
    "AuditEvent",
    "EmailDeliveryAttempt",
    "EmailRecipient",
    "EmailEvent",
    "GraduationDecision",
    "GrowthCoachEvaluation",
    "InterviewEvaluation",
    "Interview",
    "DeliverableAssignment",
    "Checkpoint",
    "DeliverableTemplate",
    "VideoQuestionEvaluation",
    "VideoAssignment",
    "VideoQuestion",
    "VideoQuestionSetVersion",
    "VideoQuestionSet",
    "ProjectReviewScore",
    "ProjectReview",
    "RubricVersion",
    "TrackTransition",
    "CohortEnrollment",
    "Flag",
    "Student",
    "Cohort",
    "GrowthCoach",
    "Campus",
    "User",
    "RungLevel",
    "AppSetting",
    "EmailTemplate",
  ];

  for (const table of tableNames) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any)[table.charAt(0).toLowerCase() + table.slice(1)].deleteMany();
  }
}

export let testAdminId: string;

beforeEach(async () => {
  await resetDatabase();
  await seedBaselineReferenceData();
  const admin = await seedAdminUser("admin@kalvium.example", "ChangeMe123!");
  testAdminId = admin.id;
});
