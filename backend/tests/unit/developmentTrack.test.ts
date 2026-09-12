import { describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import {
  assignDeliverable,
  confirmGrowthCoachEvaluationTransition,
  deleteDeliverableAssignment,
  dismissGrowthCoachEvaluationTransition,
  getDeliverablesTableHtml,
  recordGrowthCoachEvaluation,
  sumEstimatedTime,
  updateDeliverableAssignment,
  verifyDeliverable,
} from "../../src/domain/services/developmentTrack.service";
import { createCampusCohortStudent } from "../helpers";
import { testAdminId } from "../setup";

async function makeStudentOnTrack(track: "A2" | "B") {
  const { student } = await createCampusCohortStudent(testAdminId);
  await prisma.student.update({
    where: { id: student.id },
    data: { currentTrack: track, currentStage: track === "A2" ? "A2_DEVELOPMENT" : "B_DEVELOPMENT", programStatus: "ACTIVE" },
  });
  return student;
}

const DIRECT_FIELDS = {
  title: "Rebuild the auth module",
  gapAddressed: "Could not explain the login flow under questioning.",
  whatStudentMustDo: "Rebuild the module from scratch without referring to the original.",
  expectedOutcome: "Can explain every line unaided.",
  submissionType: "REPOSITORY" as const,
  submissionRequired: "A GitHub link to the rebuilt module.",
  verificationCriteria: "Live walkthrough with Growth Coach.",
};

// Every deliverable is written directly for its student — there is no
// template library — so assignment always takes `direct` content, and the
// estimate must fit the track's unit and (for Track B) half-day steps.
describe("Deliverable assignment — direct content, no templates", () => {
  it("assigns an A2 deliverable in hours", async () => {
    const student = await makeStudentOnTrack("A2");
    const assignment = await assignDeliverable({
      studentId: student.id,
      track: "A2",
      actorId: testAdminId,
      direct: { ...DIRECT_FIELDS, estimatedTimeValue: 6, estimatedTimeUnit: "HOURS" },
    });
    expect(assignment.estimatedTimeUnit).toBe("HOURS");
    expect(assignment.estimatedTimeValue).toBe(6);
  });

  it("rejects an A2 deliverable estimated in days", async () => {
    const student = await makeStudentOnTrack("A2");
    await expect(
      assignDeliverable({
        studentId: student.id,
        track: "A2",
        actorId: testAdminId,
        direct: { ...DIRECT_FIELDS, estimatedTimeValue: 1, estimatedTimeUnit: "DAYS" },
      }),
    ).rejects.toThrow();
  });

  it("accepts Track B estimates in half-day steps (0.5, 1, 1.5, ...)", async () => {
    const student = await makeStudentOnTrack("B");
    for (const value of [0.5, 1, 1.5, 2]) {
      await expect(
        assignDeliverable({
          studentId: student.id,
          track: "B",
          actorId: testAdminId,
          direct: { ...DIRECT_FIELDS, estimatedTimeValue: value, estimatedTimeUnit: "DAYS" },
        }),
      ).resolves.toBeTruthy();
    }
  });

  it("rejects a Track B estimate below the 0.5-day minimum", async () => {
    const student = await makeStudentOnTrack("B");
    await expect(
      assignDeliverable({
        studentId: student.id,
        track: "B",
        actorId: testAdminId,
        direct: { ...DIRECT_FIELDS, estimatedTimeValue: 0.25, estimatedTimeUnit: "DAYS" },
      }),
    ).rejects.toThrow();
  });

  it("rejects a Track B estimate that isn't a half-day step", async () => {
    const student = await makeStudentOnTrack("B");
    await expect(
      assignDeliverable({
        studentId: student.id,
        track: "B",
        actorId: testAdminId,
        direct: { ...DIRECT_FIELDS, estimatedTimeValue: 1.25, estimatedTimeUnit: "DAYS" },
      }),
    ).rejects.toThrow();
  });
});

describe("sumEstimatedTime — the one progress number for a student's development loop", () => {
  it("sums estimated time and counts verified deliverables for a track", async () => {
    const student = await makeStudentOnTrack("A2");
    const a = await assignDeliverable({
      studentId: student.id,
      track: "A2",
      actorId: testAdminId,
      direct: { ...DIRECT_FIELDS, estimatedTimeValue: 6, estimatedTimeUnit: "HOURS" },
    });
    await assignDeliverable({
      studentId: student.id,
      track: "A2",
      actorId: testAdminId,
      direct: { ...DIRECT_FIELDS, estimatedTimeValue: 4, estimatedTimeUnit: "HOURS" },
    });
    await verifyDeliverable(a.id, { verificationStatus: "VERIFIED", feedback: "Clean rebuild, walked through every line." }, testAdminId);

    const summary = await sumEstimatedTime(student.id, "A2");
    expect(summary).toEqual({ value: 10, unit: "HOURS", count: 2, verifiedCount: 1 });
  });
});

describe("A2 development loop", () => {
  it("promotes A2 -> A1 directly on a SUFFICIENT Growth Coach decision, skipping Video Questioning", async () => {
    const student = await makeStudentOnTrack("A2");

    await recordGrowthCoachEvaluation({
      studentId: student.id,
      track: "A2",
      decision: "SUFFICIENT",
      feedback: "Completed all deliverables with clear evidence of closing the fundamentals gap.",
      actorId: testAdminId,
    });

    const updated = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.currentTrack).toBe("A1");
    expect(updated.currentStage).toBe("A1_INTENSIVE"); // NOT VIDEO_ASSESSMENT — A2 never repeats video

    const videoAssignments = await prisma.videoAssignment.count({ where: { studentId: student.id } });
    expect(videoAssignments).toBe(0);
  });

  it("keeps a NOT_SUFFICIENT student in the A2 loop and still records the decision as history", async () => {
    const student = await makeStudentOnTrack("A2");

    await recordGrowthCoachEvaluation({
      studentId: student.id,
      track: "A2",
      decision: "NOT_SUFFICIENT",
      feedback: "Only 1 of 3 deliverables completed; ownership gap not yet closed.",
      actorId: testAdminId,
    });

    const updated = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.currentTrack).toBe("A2");

    const transitions = await prisma.trackTransition.count({ where: { studentId: student.id } });
    expect(transitions).toBe(1); // decision is still recorded even though track didn't change
  });
});

describe("Track B development loop", () => {
  it("promotes B -> A on a SUFFICIENT decision, re-entering at Orientation/Video (never skipping it)", async () => {
    const student = await makeStudentOnTrack("B");

    await recordGrowthCoachEvaluation({
      studentId: student.id,
      track: "B",
      decision: "SUFFICIENT",
      feedback: "Foundational gaps closed: real project now demonstrable with verifiable GitHub evidence.",
      actorId: testAdminId,
    });

    const updated = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.currentTrack).toBe("A");
    expect(updated.currentStage).toBe("VIDEO_ASSESSMENT"); // must go through Video Questioning, unlike A2->A1
  });

  it("keeps a NOT_SUFFICIENT student in the Track B loop", async () => {
    const student = await makeStudentOnTrack("B");

    await recordGrowthCoachEvaluation({
      studentId: student.id,
      track: "B",
      decision: "NOT_SUFFICIENT",
      feedback: "Project ownership still unclear; continuing Track B development.",
      actorId: testAdminId,
    });

    const updated = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.currentTrack).toBe("B");
  });

  it("rejects a Growth Coach evaluation whose track does not match the student's current track", async () => {
    const student = await makeStudentOnTrack("B");
    await expect(
      recordGrowthCoachEvaluation({
        studentId: student.id,
        track: "A2",
        decision: "SUFFICIENT",
        feedback: "Attempting to record an A2 decision for a Track B student.",
        actorId: testAdminId,
      }),
    ).rejects.toThrow();
  });
});

// Movement always rests with Program Admins (not the Coach). A Coach's own
// SUFFICIENT decision must not move the student until an Admin confirms it.
describe("Growth Coach evaluation — Admin confirmation gate", () => {
  async function makeCoachAndAssignedStudent(track: "A2" | "B") {
    const student = await makeStudentOnTrack(track);
    const coach = await prisma.growthCoach.create({
      data: { name: "Test Coach", email: `coach-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@kalvium.example` },
    });
    await prisma.student.update({ where: { id: student.id }, data: { growthCoachId: coach.id } });
    return { student, coach };
  }

  it("does not move the student when a Growth Coach records a SUFFICIENT decision — it stays pending", async () => {
    const { student, coach } = await makeCoachAndAssignedStudent("A2");

    const evaluation = await recordGrowthCoachEvaluation({
      studentId: student.id,
      track: "A2",
      decision: "SUFFICIENT",
      feedback: "Completed all deliverables with clear evidence of closing the fundamentals gap.",
      actorId: testAdminId,
      actorGrowthCoachId: coach.id,
    });

    expect(evaluation.pendingAdminConfirmation).toBe(true);
    const updated = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.currentTrack).toBe("A2"); // unchanged — awaiting Admin confirmation

    const transitions = await prisma.trackTransition.count({ where: { studentId: student.id } });
    expect(transitions).toBe(0);
  });

  it("moves the student only once an Admin confirms the pending evaluation", async () => {
    const { student, coach } = await makeCoachAndAssignedStudent("A2");

    const evaluation = await recordGrowthCoachEvaluation({
      studentId: student.id,
      track: "A2",
      decision: "SUFFICIENT",
      feedback: "Completed all deliverables with clear evidence of closing the fundamentals gap.",
      actorId: testAdminId,
      actorGrowthCoachId: coach.id,
    });

    await confirmGrowthCoachEvaluationTransition(evaluation.id, testAdminId);

    const updated = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.currentTrack).toBe("A1");

    const confirmed = await prisma.growthCoachEvaluation.findUniqueOrThrow({ where: { id: evaluation.id } });
    expect(confirmed.pendingAdminConfirmation).toBe(false);
    expect(confirmed.confirmedById).toBe(testAdminId);
  });

  it("lets an Admin dismiss a pending evaluation without moving the student", async () => {
    const { student, coach } = await makeCoachAndAssignedStudent("B");

    const evaluation = await recordGrowthCoachEvaluation({
      studentId: student.id,
      track: "B",
      decision: "SUFFICIENT",
      feedback: "Foundational gaps closed: real project now demonstrable with verifiable GitHub evidence.",
      actorId: testAdminId,
      actorGrowthCoachId: coach.id,
    });

    await dismissGrowthCoachEvaluationTransition(evaluation.id, testAdminId);

    const updated = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.currentTrack).toBe("B"); // never moved

    const dismissed = await prisma.growthCoachEvaluation.findUniqueOrThrow({ where: { id: evaluation.id } });
    expect(dismissed.pendingAdminConfirmation).toBe(false);
  });

  it("does not require confirmation for a NOT_SUFFICIENT Coach decision (nothing to move)", async () => {
    const { student, coach } = await makeCoachAndAssignedStudent("A2");

    const evaluation = await recordGrowthCoachEvaluation({
      studentId: student.id,
      track: "A2",
      decision: "NOT_SUFFICIENT",
      feedback: "Only 1 of 3 deliverables completed; ownership gap not yet closed.",
      actorId: testAdminId,
      actorGrowthCoachId: coach.id,
    });

    expect(evaluation.pendingAdminConfirmation).toBe(false);
  });

  it("rejects a Growth Coach recording an evaluation for a student not assigned to them", async () => {
    const student = await makeStudentOnTrack("A2"); // no growthCoachId set
    const coach = await prisma.growthCoach.create({
      data: { name: "Unassigned Coach", email: `coach-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@kalvium.example` },
    });

    await expect(
      recordGrowthCoachEvaluation({
        studentId: student.id,
        track: "A2",
        decision: "SUFFICIENT",
        feedback: "Attempting to evaluate a student not assigned to this coach.",
        actorId: testAdminId,
        actorGrowthCoachId: coach.id,
      }),
    ).rejects.toThrow();
  });
});

describe("Deliverable edit and delete — every deliverable has its own content", () => {
  it("edits a deliverable's own fields without touching its track", async () => {
    const student = await makeStudentOnTrack("A2");
    const assignment = await assignDeliverable({
      studentId: student.id,
      track: "A2",
      actorId: testAdminId,
      direct: { ...DIRECT_FIELDS, estimatedTimeValue: 6, estimatedTimeUnit: "HOURS" },
    });

    const updated = await updateDeliverableAssignment(
      assignment.id,
      { title: "Rebuild the auth module (v2)", estimatedTimeValue: 8 },
      testAdminId,
    );

    expect(updated.title).toBe("Rebuild the auth module (v2)");
    expect(updated.estimatedTimeValue).toBe(8);
    expect(updated.estimatedTimeUnit).toBe("HOURS"); // untouched
    expect(updated.gapAddressed).toBe(DIRECT_FIELDS.gapAddressed); // untouched
  });

  it("rejects an edit that violates Track B's half-day-step rule", async () => {
    const student = await makeStudentOnTrack("B");
    const assignment = await assignDeliverable({
      studentId: student.id,
      track: "B",
      actorId: testAdminId,
      direct: { ...DIRECT_FIELDS, estimatedTimeValue: 1, estimatedTimeUnit: "DAYS" },
    });

    await expect(
      updateDeliverableAssignment(assignment.id, { estimatedTimeValue: 1.25 }, testAdminId),
    ).rejects.toThrow();
  });

  it("deletes a deliverable outright", async () => {
    const student = await makeStudentOnTrack("A2");
    const assignment = await assignDeliverable({
      studentId: student.id,
      track: "A2",
      actorId: testAdminId,
      direct: { ...DIRECT_FIELDS, estimatedTimeValue: 6, estimatedTimeUnit: "HOURS" },
    });

    await deleteDeliverableAssignment(assignment.id, testAdminId);

    const found = await prisma.deliverableAssignment.findUnique({ where: { id: assignment.id } });
    expect(found).toBeNull();
  });
});

describe("getDeliverablesTableHtml — selecting which deliverables go in the email", () => {
  it("includes only the selected ids when given, and totals only those", async () => {
    const student = await makeStudentOnTrack("A2");
    const a = await assignDeliverable({
      studentId: student.id,
      track: "A2",
      actorId: testAdminId,
      direct: { ...DIRECT_FIELDS, title: "Included Deliverable", estimatedTimeValue: 6, estimatedTimeUnit: "HOURS" },
    });
    await assignDeliverable({
      studentId: student.id,
      track: "A2",
      actorId: testAdminId,
      direct: { ...DIRECT_FIELDS, title: "Excluded Deliverable", estimatedTimeValue: 4, estimatedTimeUnit: "HOURS" },
    });

    const html = await getDeliverablesTableHtml(student.id, "A2", [a.id]);
    expect(html).toContain("Included Deliverable");
    expect(html).not.toContain("Excluded Deliverable");
    expect(html).toContain("6 hours"); // total row reflects only the selected one
  });

  it("includes every assigned deliverable when no ids are given", async () => {
    const student = await makeStudentOnTrack("A2");
    await assignDeliverable({
      studentId: student.id,
      track: "A2",
      actorId: testAdminId,
      direct: { ...DIRECT_FIELDS, title: "First", estimatedTimeValue: 6, estimatedTimeUnit: "HOURS" },
    });
    await assignDeliverable({
      studentId: student.id,
      track: "A2",
      actorId: testAdminId,
      direct: { ...DIRECT_FIELDS, title: "Second", estimatedTimeValue: 4, estimatedTimeUnit: "HOURS" },
    });

    const html = await getDeliverablesTableHtml(student.id, "A2");
    expect(html).toContain("First");
    expect(html).toContain("Second");
  });
});
