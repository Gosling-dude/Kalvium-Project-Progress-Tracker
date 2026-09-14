// One-off demo data for the deliverable-set email/deadline/status feature —
// not part of the regular seed pipeline (prisma/seed.ts stays the source of
// truth for baseline dev data). Run with `npm run seed:deliverable-demo`.
//
// Produces one A2/Track B student in each deliverable-set state so every
// Students-list badge and Development-tab state can be seen without manually
// walking a student through the whole flow:
//   - Farhan Sheikh   (A2, existing) -> OVERDUE   (emailed, deadline in the past, still incomplete)
//   - Meera Nambiar   (B,  existing) -> ON_TRACK  (emailed, deadline still ahead)
//   - Neha Kulkarni   (B,  existing) -> ALL_SUBMITTED (emailed, student submitted, awaiting verification)
//   - Priya Desai     (A2, new)      -> COMPLETED (emailed, everything verified)
//   - Karan Mehta     (A2, new)      -> DRAFT     (assigned, NOT yet emailed — assign the email yourself to see it flip)
import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import {
  assignDeliverable,
  markDeliverableSetEmailed,
  recordDeliverableSubmission,
  verifyDeliverable,
} from "../src/domain/services/developmentTrack.service";
import { enrollStudentInCohort } from "../src/domain/services/cohort.service";

const DIRECT_FIELDS = {
  submissionType: "REPOSITORY" as const,
  submissionRequired: "A GitHub repository link with the completed work.",
  verificationCriteria: "Growth Coach reviews the repository and a short walkthrough call.",
};

async function backdateEmailedSet(studentId: string, sentAt: Date, deadline: Date) {
  await prisma.student.update({ where: { id: studentId }, data: { deliverableEmailSentAt: sentAt, deliverableDeadline: deadline } });
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No admin user found — run `npm run seed` first.");

  // ---- Aditi Rao (A2, new) -> OVERDUE ----
  // A brand-new dummy student rather than reusing an existing seeded one —
  // avoids touching anything you may already be testing with by hand.
  const bangaloreForOverdue = await prisma.campus.findFirst({ where: { code: "BLR" } });
  const coachForOverdue = await prisma.growthCoach.findFirst({ where: { email: "asha.rao@kalvium.example" } });
  const cohortForOverdue = await prisma.cohort.findFirst({ where: { code: "SPE-2024-B1" } });

  let aditi = await prisma.student.findUnique({ where: { email: "aditi.rao@student.example" } });
  if (!aditi) {
    aditi = await prisma.student.create({
      data: {
        fullName: "Aditi Rao",
        email: "aditi.rao@student.example",
        campusId: bangaloreForOverdue?.id,
        growthCoachId: coachForOverdue?.id,
        chosenProject: "Campus Marketplace App",
        createdById: admin.id,
        currentTrack: "A2",
        currentStage: "A2_DEVELOPMENT",
        programStatus: "ACTIVE",
      },
    });
    if (cohortForOverdue) await enrollStudentInCohort({ studentId: aditi.id, cohortId: cohortForOverdue.id }, admin.id);
  }
  if (aditi.currentTrack === "A2" && !aditi.deliverableEmailSentAt) {
    const existing = await prisma.deliverableAssignment.count({ where: { studentId: aditi.id, track: "A2" } });
    if (existing === 0) {
      await assignDeliverable({
        studentId: aditi.id,
        track: "A2",
        actorId: admin.id,
        direct: {
          ...DIRECT_FIELDS,
          title: "Authentication Flow Walkthrough",
          gapAddressed: "Could not explain how login/session handling works under questioning.",
          whatStudentMustDo: "Document and diagram the full authentication flow in your own project, end to end.",
          expectedOutcome: "Can explain every step of the auth flow unaided.",
          estimatedTimeValue: 4,
          estimatedTimeUnit: "HOURS",
        },
      });
    }
    await markDeliverableSetEmailed(aditi.id, "A2", admin.id);
    // Backdate so the (already short) estimate has clearly lapsed.
    const sentAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const deadline = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await backdateEmailedSet(aditi.id, sentAt, deadline);
    console.log(`Aditi Rao (A2, new): deliverable set emailed ${sentAt.toDateString()}, deadline ${deadline.toDateString()} -> OVERDUE`);
  }

  // ---- Meera Nambiar (B, existing) -> ON_TRACK ----
  const meera = await prisma.student.findUnique({ where: { email: "meera.nambiar@student.example" } });
  if (meera && meera.currentTrack === "B") {
    await markDeliverableSetEmailed(meera.id, "B", admin.id);
    const sentAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const deadline = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    await backdateEmailedSet(meera.id, sentAt, deadline);
    console.log(`Meera Nambiar (B): deliverable set emailed ${sentAt.toDateString()}, deadline ${deadline.toDateString()} -> ON_TRACK`);
  } else {
    console.log("Skipped Meera Nambiar — not found or not on Track B (already seeded differently?).");
  }

  // ---- Neha Kulkarni (B, existing) -> ALL_SUBMITTED ----
  const neha = await prisma.student.findUnique({ where: { email: "neha.kulkarni@student.example" } });
  if (neha && neha.currentTrack === "B" && !neha.deliverableEmailSentAt) {
    const d1 = await assignDeliverable({
      studentId: neha.id,
      track: "B",
      actorId: admin.id,
      direct: {
        ...DIRECT_FIELDS,
        title: "Rebuild the Core Feature With Real Ownership",
        gapAddressed: "Could not separate own contribution from a team template.",
        whatStudentMustDo: "Rebuild the budgeting calculation feature from scratch, alone, and deploy it.",
        expectedOutcome: "A working, deployed feature the student can defend end-to-end.",
        estimatedTimeValue: 2,
        estimatedTimeUnit: "DAYS",
      },
    });
    const d2 = await assignDeliverable({
      studentId: neha.id,
      track: "B",
      actorId: admin.id,
      direct: {
        ...DIRECT_FIELDS,
        title: "Write the Architecture README",
        gapAddressed: "No documentation explaining how the project fits together.",
        whatStudentMustDo: "Write a README covering architecture, setup, and the main data flow.",
        expectedOutcome: "A README a reviewer can use to understand the project without asking questions.",
        estimatedTimeValue: 1,
        estimatedTimeUnit: "DAYS",
      },
    });
    await markDeliverableSetEmailed(neha.id, "B", admin.id);
    await recordDeliverableSubmission(d1.id, { submissionFromStudent: "https://github.com/neha-k/budget-planner" }, admin.id);
    await recordDeliverableSubmission(d2.id, { submissionFromStudent: "https://github.com/neha-k/budget-planner/blob/main/README.md" }, admin.id);
    const sentAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const deadline = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
    await backdateEmailedSet(neha.id, sentAt, deadline);
    console.log(`Neha Kulkarni (B): both deliverables submitted, awaiting verification -> ALL_SUBMITTED`);
  } else {
    console.log("Skipped Neha Kulkarni — not found, not on Track B, or already has an emailed set.");
  }

  // ---- Priya Desai (A2, new) -> COMPLETED ----
  const bangalore = await prisma.campus.findFirst({ where: { code: "BLR" } });
  const coach1 = await prisma.growthCoach.findFirst({ where: { email: "asha.rao@kalvium.example" } });
  const cohort1 = await prisma.cohort.findFirst({ where: { code: "SPE-2024-B1" } });

  let priya = await prisma.student.findUnique({ where: { email: "priya.desai@student.example" } });
  if (!priya) {
    priya = await prisma.student.create({
      data: {
        fullName: "Priya Desai",
        email: "priya.desai@student.example",
        campusId: bangalore?.id,
        growthCoachId: coach1?.id,
        chosenProject: "Habit Tracker App",
        createdById: admin.id,
        currentTrack: "A2",
        currentStage: "A2_DEVELOPMENT",
        programStatus: "ACTIVE",
      },
    });
    if (cohort1) await enrollStudentInCohort({ studentId: priya.id, cohortId: cohort1.id }, admin.id);
  }
  if (priya.currentTrack === "A2" && !priya.deliverableEmailSentAt) {
    const d1 = await assignDeliverable({
      studentId: priya.id,
      track: "A2",
      actorId: admin.id,
      direct: {
        ...DIRECT_FIELDS,
        title: "Explain the Notification Scheduling Logic",
        gapAddressed: "Could not explain how scheduled reminders are triggered.",
        whatStudentMustDo: "Document the scheduling/cron logic and walk through it live.",
        expectedOutcome: "Can explain the scheduling logic unaided.",
        estimatedTimeValue: 3,
        estimatedTimeUnit: "HOURS",
      },
    });
    const d2 = await assignDeliverable({
      studentId: priya.id,
      track: "A2",
      actorId: admin.id,
      direct: {
        ...DIRECT_FIELDS,
        title: "Resume Claims Audit",
        gapAddressed: "A performance claim on the resume had no basis.",
        whatStudentMustDo: "Re-measure the claimed number and correct the resume with a defensible figure.",
        expectedOutcome: "Every claim on the resume is defensible with a stated method.",
        estimatedTimeValue: 2,
        estimatedTimeUnit: "HOURS",
      },
    });
    await markDeliverableSetEmailed(priya.id, "A2", admin.id);
    await recordDeliverableSubmission(d1.id, { submissionFromStudent: "https://github.com/priya-d/habit-tracker" }, admin.id);
    await recordDeliverableSubmission(d2.id, { submissionFromStudent: "https://github.com/priya-d/habit-tracker/resume.pdf" }, admin.id);
    await verifyDeliverable(d1.id, { verificationStatus: "VERIFIED", feedback: "Clear walkthrough, matches the code." }, admin.id);
    await verifyDeliverable(d2.id, { verificationStatus: "VERIFIED", feedback: "Corrected figure is defensible." }, admin.id);
    console.log("Priya Desai (A2, new): both deliverables verified -> COMPLETED");
  }

  // ---- Karan Mehta (A2, new) -> DRAFT (assign the email yourself to see it flip) ----
  let karan = await prisma.student.findUnique({ where: { email: "karan.mehta@student.example" } });
  if (!karan) {
    karan = await prisma.student.create({
      data: {
        fullName: "Karan Mehta",
        email: "karan.mehta@student.example",
        campusId: bangalore?.id,
        growthCoachId: coach1?.id,
        chosenProject: "Campus Event Finder",
        createdById: admin.id,
        currentTrack: "A2",
        currentStage: "A2_DEVELOPMENT",
        programStatus: "ACTIVE",
      },
    });
    if (cohort1) await enrollStudentInCohort({ studentId: karan.id, cohortId: cohort1.id }, admin.id);
  }
  if (karan.currentTrack === "A2" && !karan.deliverableEmailSentAt) {
    const existing = await prisma.deliverableAssignment.count({ where: { studentId: karan.id, track: "A2" } });
    if (existing === 0) {
      await assignDeliverable({
        studentId: karan.id,
        track: "A2",
        actorId: admin.id,
        direct: {
          ...DIRECT_FIELDS,
          title: "Fix the Event Filtering Bug",
          gapAddressed: "Could not explain why filtering by date silently failed.",
          whatStudentMustDo: "Find and fix the root cause of the filtering bug, and add a test for it.",
          expectedOutcome: "Filtering works correctly and is covered by a test.",
          estimatedTimeValue: 5,
          estimatedTimeUnit: "HOURS",
        },
      });
      await assignDeliverable({
        studentId: karan.id,
        track: "A2",
        actorId: admin.id,
        direct: {
          ...DIRECT_FIELDS,
          title: "Deploy a Working Live Version",
          gapAddressed: "Project was never deployed — nothing to demonstrate.",
          whatStudentMustDo: "Deploy the project so it is reachable at a live URL.",
          expectedOutcome: "A working, demonstrable live version.",
          estimatedTimeValue: 3,
          estimatedTimeUnit: "HOURS",
        },
      });
      console.log("Karan Mehta (A2, new): 2 deliverables assigned, NOT yet emailed -> DRAFT. Open his Development tab and send the assignment email to see it flip to a real deadline/status.");
    }
  }

  console.log("\nDone. Open the Students page (filter by Track A2 or B) to see the Deliverable Status / Deadline columns.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
