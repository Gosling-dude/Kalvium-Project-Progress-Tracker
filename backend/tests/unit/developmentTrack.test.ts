import { describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { recordGrowthCoachEvaluation } from "../../src/domain/services/developmentTrack.service";
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
