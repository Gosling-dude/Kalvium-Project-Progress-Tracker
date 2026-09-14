import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PROJECT_REVIEW_RUBRIC_V1 } from "../src/domain/constants/rubric";
import { seedAdminUser, seedBaselineReferenceData } from "../src/domain/services/systemSeed.service";
import { createProjectReview, completeProjectReview } from "../src/domain/services/projectReview.service";
import { assignVideoQuestionSet, recordQuestionEvaluation, finalizeVideoAssessment } from "../src/domain/services/videoAssessment.service";
import { recordGrowthCoachEvaluation, assignDeliverable } from "../src/domain/services/developmentTrack.service";
import { scheduleInterview, recordInterviewEvaluation, completeInterview } from "../src/domain/services/interview.service";
import { recordGraduationDecision } from "../src/domain/services/graduation.service";
import { createFlag } from "../src/domain/services/flag.service";
import { enrollStudentInCohort } from "../src/domain/services/cohort.service";

const prisma = new PrismaClient();


async function seedDevData(adminId: string) {
  const existingCampus = await prisma.campus.findFirst();
  if (existingCampus) {
    console.log("Dev sample data already present — skipping.");
    return;
  }

  const bangalore = await prisma.campus.create({ data: { name: "Bangalore Campus", code: "BLR" } });
  const pune = await prisma.campus.create({ data: { name: "Pune Campus", code: "PUN" } });

  // coach1 gets a real login (role GROWTH_COACH) to demonstrate the Growth
  // Coach portal; coach2 stays reference-data-only, showing a login is optional.
  const coach1User = await prisma.user.create({
    data: { email: "asha.rao@kalvium.example", passwordHash: await bcrypt.hash("ChangeMe123!", 12), name: "Asha Rao", role: "GROWTH_COACH" },
  });
  const coach1 = await prisma.growthCoach.create({ data: { name: "Asha Rao", email: "asha.rao@kalvium.example", campusId: bangalore.id, userId: coach1User.id } });
  const coach2 = await prisma.growthCoach.create({ data: { name: "Vikram Shah", email: "vikram.shah@kalvium.example", campusId: pune.id } });

  const cohort1 = await prisma.cohort.create({
    data: { name: "SPE 2024 Batch 1", code: "SPE-2024-B1", startDate: new Date("2024-01-15"), status: "ACTIVE" },
  });
  const cohort2 = await prisma.cohort.create({
    data: { name: "SPE 2024 Batch 2", code: "SPE-2024-B2", startDate: new Date("2024-06-01"), status: "ACTIVE" },
  });

  // Interviewers are Program Admin accounts (Teaching Ninja was merged into
  // the Admin role) — the interviewer relation just points at any User.
  const interviewer = await prisma.user.create({
    data: {
      email: "ninja.priya@kalvium.example",
      passwordHash: await bcrypt.hash("ChangeMe123!", 12),
      name: "Priya Menon",
      role: "ADMIN",
    },
  });
  const interviewer2 = await prisma.user.create({
    data: {
      email: "ninja.arjun@kalvium.example",
      passwordHash: await bcrypt.hash("ChangeMe123!", 12),
      name: "Arjun Nair",
      role: "ADMIN",
    },
  });

  // Student 1 — ONBOARDING (no review yet)
  const s1 = await prisma.student.create({
    data: { fullName: "Ananya Verma", email: "ananya.verma@student.example", campusId: bangalore.id, growthCoachId: coach1.id, chosenProject: "Campus Marketplace App", createdById: adminId },
  });
  await enrollStudentInCohort({ studentId: s1.id, cohortId: cohort1.id }, adminId);

  // Student 2 — Track A, awaiting video assignment
  const s2 = await prisma.student.create({
    data: { fullName: "Rohit Sharma", email: "rohit.sharma@student.example", campusId: bangalore.id, growthCoachId: coach1.id, chosenProject: "Expense Tracker API", createdById: adminId },
  });
  await enrollStudentInCohort({ studentId: s2.id, cohortId: cohort1.id }, adminId);
  const s2Review = await createProjectReview({
    studentId: s2.id,
    reviewerId: adminId,
    scores: PROJECT_REVIEW_RUBRIC_V1.dimensions.map((d) => ({ dimensionKey: d.key, score: 4, reason: "Strong resume and solid project depth." })),
  });
  await completeProjectReview(s2Review.id, { outcomeReason: "Total 40/50, all mandatory minimums met — routed to Track A." }, adminId);

  // Student 3 — Track A1 (passed video assessment)
  const s3 = await prisma.student.create({
    data: { fullName: "Kavya Iyer", email: "kavya.iyer@student.example", campusId: pune.id, growthCoachId: coach2.id, chosenProject: "Realtime Chat Platform", createdById: adminId },
  });
  await enrollStudentInCohort({ studentId: s3.id, cohortId: cohort2.id }, adminId);
  const s3Review = await createProjectReview({
    studentId: s3.id,
    reviewerId: adminId,
    scores: PROJECT_REVIEW_RUBRIC_V1.dimensions.map((d) => ({ dimensionKey: d.key, score: 4, reason: "Consistently strong across all dimensions." })),
  });
  await completeProjectReview(s3Review.id, { outcomeReason: "Total 40/50, all mandatory minimums met — routed to Track A." }, adminId);
  const s3Assignment = await assignVideoQuestionSet({ studentId: s3.id, actorId: adminId });
  for (const evalRow of s3Assignment.evaluations) {
    await recordQuestionEvaluation({ videoAssignmentId: s3Assignment.id, questionId: evalRow.questionId, score: 4, notes: "Clear, specific answer with good evidence.", reviewerId: adminId });
  }
  await finalizeVideoAssessment({ videoAssignmentId: s3Assignment.id, outcomeReason: "Total 40/50, all mandatory questions passed — routed to A1.", actorId: adminId });
  await scheduleInterview({ studentId: s3.id, interviewType: "MOCK", scheduledStart: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), interviewerId: interviewer.id, growthCoachConfirmationStatus: "CONFIRMED", actorId: adminId });

  // Student 4 — Track A2 (failed video assessment mandatory question)
  const s4 = await prisma.student.create({
    data: { fullName: "Farhan Sheikh", email: "farhan.sheikh@student.example", campusId: bangalore.id, growthCoachId: coach1.id, chosenProject: "Inventory Management System", createdById: adminId },
  });
  await enrollStudentInCohort({ studentId: s4.id, cohortId: cohort1.id }, adminId);
  const s4Review = await createProjectReview({
    studentId: s4.id,
    reviewerId: adminId,
    scores: PROJECT_REVIEW_RUBRIC_V1.dimensions.map((d) => ({ dimensionKey: d.key, score: 4, reason: "Solid baseline." })),
  });
  await completeProjectReview(s4Review.id, { outcomeReason: "Total 40/50, all mandatory minimums met — routed to Track A." }, adminId);
  const s4Assignment = await assignVideoQuestionSet({ studentId: s4.id, actorId: adminId });
  for (const evalRow of s4Assignment.evaluations) {
    const question = await prisma.videoQuestion.findUnique({ where: { id: evalRow.questionId } });
    const score = question?.questionKey === "Q7" ? 2 : 4;
    await recordQuestionEvaluation({ videoAssignmentId: s4Assignment.id, questionId: evalRow.questionId, score, notes: "Evaluated against listening criteria.", reviewerId: adminId });
  }
  await finalizeVideoAssessment({ videoAssignmentId: s4Assignment.id, outcomeReason: "Mandatory question Q7 (Technical Fundamentals) scored below 3 — routed to A2 for foundational development.", actorId: adminId });
  await assignDeliverable({
    studentId: s4.id,
    track: "A2",
    dueAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    actorId: adminId,
    direct: {
      title: "Data Structures Refresh",
      gapAddressed: "Weak fundamentals in core data structures observed during review.",
      whatStudentMustDo: "Complete 10 practice problems covering arrays, linked lists, and trees; document your approach.",
      expectedOutcome: "Can explain and implement basic data structure operations without assistance.",
      submissionType: "REPOSITORY",
      submissionRequired: "A GitHub repository link containing all 10 solved problems with commit history.",
      verificationCriteria: "Growth Coach reviews the repository and a short walkthrough call.",
      estimatedTimeValue: 6,
      estimatedTimeUnit: "HOURS",
    },
  });
  await createFlag({ studentId: s4.id, category: "OTHER", severity: "LOW", title: "Watching progress closely", description: "Student requested extra time due to exam schedule conflicts this week.", assignedToId: adminId, actorId: adminId });

  // Student 5 — Track B (failed project review)
  const s5 = await prisma.student.create({
    data: {
      fullName: "Meera Nambiar",
      email: "meera.nambiar@student.example",
      campusId: pune.id,
      growthCoachId: coach2.id,
      batch: "2024",
      resumeLink: "https://drive.google.com/file/d/example-meera-resume/view",
      chosenProject: "Personal Portfolio Site",
      createdById: adminId,
    },
  });
  await enrollStudentInCohort({ studentId: s5.id, cohortId: cohort2.id }, adminId);
  const s5Review = await createProjectReview({
    studentId: s5.id,
    reviewerId: adminId,
    scores: PROJECT_REVIEW_RUBRIC_V1.dimensions.map((d) => ({
      dimensionKey: d.key,
      score: d.key === "GITHUB_EVIDENCE" ? 1 : d.key === "PROJECT_DEPTH" ? 2 : 3,
      reason: d.key === "GITHUB_EVIDENCE" ? "No verifiable GitHub history for claimed project." : "Below expectations for a production-ready submission.",
    })),
  });
  await completeProjectReview(
    s5Review.id,
    { outcomeReason: "Total 26/50 but GitHub/Evidence (1) and Project Depth (2) fall below mandatory minimums — routed to Track B." },
    adminId,
  );
  await assignDeliverable({
    studentId: s5.id,
    track: "B",
    dueAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    actorId: adminId,
    direct: {
      title: "Build a Defendable Project From Scratch",
      gapAddressed: "No real, defendable project found during Project Review.",
      whatStudentMustDo: "Scope and build one original project with a genuine technical problem, deploy it, and document the architecture.",
      expectedOutcome: "A working, deployed project the student can defend end-to-end under questioning.",
      submissionType: "REPOSITORY",
      submissionRequired: "A deployed live link plus a GitHub repository link with a README covering architecture and setup.",
      verificationCriteria: "Growth Coach reviews the live deployment and a walkthrough of the architecture and code.",
      estimatedTimeValue: 3,
      estimatedTimeUnit: "DAYS",
    },
  });
  await createFlag({ studentId: s5.id, category: "OWNERSHIP_CONCERN", severity: "MEDIUM", title: "Unverifiable project evidence", description: "No GitHub repository or deployed link could be found matching the resume's project claims.", actorId: adminId });

  // Student 6 — Graduated
  const s6 = await prisma.student.create({
    data: { fullName: "Devika Pillai", email: "devika.pillai@student.example", campusId: bangalore.id, growthCoachId: coach1.id, chosenProject: "Fitness Tracking App", createdById: adminId },
  });
  await enrollStudentInCohort({ studentId: s6.id, cohortId: cohort1.id }, adminId);
  const s6Review = await createProjectReview({
    studentId: s6.id,
    reviewerId: adminId,
    scores: PROJECT_REVIEW_RUBRIC_V1.dimensions.map((d) => ({ dimensionKey: d.key, score: 5, reason: "Exceptional across the board." })),
  });
  await completeProjectReview(s6Review.id, { outcomeReason: "Total 50/50 — routed to Track A." }, adminId);
  const s6Assignment = await assignVideoQuestionSet({ studentId: s6.id, actorId: adminId });
  for (const evalRow of s6Assignment.evaluations) {
    await recordQuestionEvaluation({ videoAssignmentId: s6Assignment.id, questionId: evalRow.questionId, score: 5, notes: "Excellent depth and clarity.", reviewerId: adminId });
  }
  await finalizeVideoAssessment({ videoAssignmentId: s6Assignment.id, outcomeReason: "Total 50/50 — routed to A1.", actorId: adminId });
  const s6Mock = await scheduleInterview({ studentId: s6.id, interviewType: "MOCK", scheduledStart: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), interviewerId: interviewer.id, growthCoachConfirmationStatus: "CONFIRMED", actorId: adminId });
  await completeInterview(s6Mock.id, {}, adminId);
  await recordInterviewEvaluation({ interviewId: s6Mock.id, highestRungHeld: 3, evaluatorId: adminId, overallFeedback: "Held R3 (Tradeoff) confidently; ready for final interview to confirm R4." });
  const s6Final = await scheduleInterview({ studentId: s6.id, interviewType: "FINAL", scheduledStart: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), interviewerId: interviewer2.id, growthCoachConfirmationStatus: "CONFIRMED", actorId: adminId });
  await completeInterview(s6Final.id, {}, adminId);
  await recordInterviewEvaluation({ interviewId: s6Final.id, highestRungHeld: 4, evaluatorId: adminId, overallFeedback: "Held R4 (Scale & Failure) with strong justification and independent reasoning.", result: "ADVANCE" });
  await recordGraduationDecision({ studentId: s6.id, decision: "GRADUATE", reason: "Combined mock (R3) and final (R4) interview performance exceeds graduation threshold.", relatedInterviewIds: [s6Mock.id, s6Final.id], actorId: adminId });

  // Student 7 — Future Pipeline (not graduated)
  const s7 = await prisma.student.create({
    data: { fullName: "Sameer Joshi", email: "sameer.joshi@student.example", campusId: pune.id, growthCoachId: coach2.id, chosenProject: "Recipe Sharing App", createdById: adminId },
  });
  await enrollStudentInCohort({ studentId: s7.id, cohortId: cohort2.id }, adminId);
  const s7Review = await createProjectReview({
    studentId: s7.id,
    reviewerId: adminId,
    scores: PROJECT_REVIEW_RUBRIC_V1.dimensions.map((d) => ({ dimensionKey: d.key, score: 4, reason: "Good baseline submission." })),
  });
  await completeProjectReview(s7Review.id, { outcomeReason: "Total 40/50 — routed to Track A." }, adminId);
  const s7Assignment = await assignVideoQuestionSet({ studentId: s7.id, actorId: adminId });
  for (const evalRow of s7Assignment.evaluations) {
    await recordQuestionEvaluation({ videoAssignmentId: s7Assignment.id, questionId: evalRow.questionId, score: 4, notes: "Adequate.", reviewerId: adminId });
  }
  await finalizeVideoAssessment({ videoAssignmentId: s7Assignment.id, outcomeReason: "Total 40/50 — routed to A1.", actorId: adminId });
  const s7Final = await scheduleInterview({ studentId: s7.id, interviewType: "FINAL", scheduledStart: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), interviewerId: interviewer2.id, growthCoachConfirmationStatus: "CONFIRMED", actorId: adminId });
  await completeInterview(s7Final.id, {}, adminId);
  await recordInterviewEvaluation({ interviewId: s7Final.id, highestRungHeld: 3, breakRung: 3, breakCauseCategory: "KNOWLEDGE_GAP", breakCauseNotes: "Could not justify trade-off decisions under questioning.", evaluatorId: adminId, overallFeedback: "Broke at R3 (Tradeoff); needs another cycle before final decision.", result: "REPEAT" });
  await recordGraduationDecision({ studentId: s7.id, decision: "NOT_GRADUATE", reason: "Broke at R3 in final interview; performance below graduation threshold — placed in Future Pipeline for re-evaluation.", relatedInterviewIds: [s7Final.id], actorId: adminId });

  // Student 8 — Track B, continuing loop (Growth Coach: not sufficient)
  const s8 = await prisma.student.create({
    data: { fullName: "Neha Kulkarni", email: "neha.kulkarni@student.example", campusId: pune.id, growthCoachId: coach2.id, chosenProject: "Budget Planner", createdById: adminId },
  });
  await enrollStudentInCohort({ studentId: s8.id, cohortId: cohort2.id }, adminId);
  const s8Review = await createProjectReview({
    studentId: s8.id,
    reviewerId: adminId,
    scores: PROJECT_REVIEW_RUBRIC_V1.dimensions.map((d) => ({ dimensionKey: d.key, score: d.key === "PROJECT_OWNERSHIP" ? 1 : 3, reason: d.key === "PROJECT_OWNERSHIP" ? "Could not explain core logic; appears to be a template." : "Meets baseline." })),
  });
  await completeProjectReview(s8Review.id, { outcomeReason: "Project Ownership scored 1, below mandatory minimum of 3 — routed to Track B." }, adminId);
  await recordGrowthCoachEvaluation({
    studentId: s8.id,
    track: "B",
    decision: "NOT_SUFFICIENT",
    feedback: "Student has completed 1 of 3 deliverables; ownership gap not yet closed. Continuing Track B development.",
    actorId: adminId,
  });

  console.log("Seeded dev sample data: 2 campuses, 2 growth coaches, 2 cohorts, 3 deliverable templates, 8 students across every stage.");
}

async function main() {
  console.log("Seeding rubric, video question bank, rung levels, email templates...");
  await seedBaselineReferenceData();

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@kalvium.example";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const admin = await seedAdminUser(adminEmail, adminPassword);
  console.log(`Admin user ready: ${admin.email}`);

  // Fake demo students/cohorts/coaches — dev/staging convenience only.
  // Never in production, and never in tests (tests seed their own fixtures).
  if (process.env.NODE_ENV !== "test" && process.env.NODE_ENV !== "production") {
    await seedDevData(admin.id);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
