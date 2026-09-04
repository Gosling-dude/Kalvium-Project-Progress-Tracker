import { describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { recordInterviewEvaluation, scheduleInterview } from "../../src/domain/services/interview.service";
import { recordGraduationDecision } from "../../src/domain/services/graduation.service";
import { createCampusCohortStudent } from "../helpers";
import { testAdminId } from "../setup";

async function makeA1Student() {
  const { student } = await createCampusCohortStudent(testAdminId);
  await prisma.student.update({ where: { id: student.id }, data: { currentTrack: "A1", currentStage: "A1_INTENSIVE", programStatus: "ACTIVE" } });
  return student;
}

describe("Interview rung model", () => {
  it("rejects a break rung higher than the highest rung held", async () => {
    const student = await makeA1Student();
    const interview = await scheduleInterview({ studentId: student.id, interviewType: "MOCK", actorId: testAdminId });

    await expect(
      recordInterviewEvaluation({
        interviewId: interview.id,
        highestRungHeld: 2,
        breakRung: 4,
        overallFeedback: "Held R2 but somehow broke at R4 — should be rejected.",
        evaluatorId: testAdminId,
      }),
    ).rejects.toThrow();
  });

  it("accepts a break rung at or below the highest rung held", async () => {
    const student = await makeA1Student();
    const interview = await scheduleInterview({ studentId: student.id, interviewType: "MOCK", actorId: testAdminId });

    const evaluation = await recordInterviewEvaluation({
      interviewId: interview.id,
      highestRungHeld: 3,
      breakRung: 3,
      overallFeedback: "Broke exactly at R3 (Justify) when pressed on trade-off reasoning.",
      evaluatorId: testAdminId,
    });

    expect(evaluation.highestRungHeld).toBe(3);
    expect(evaluation.breakRung).toBe(3);
  });

  it("supports an unlimited number of interviews per student, sequenced in order", async () => {
    const student = await makeA1Student();
    const i1 = await scheduleInterview({ studentId: student.id, interviewType: "MOCK", actorId: testAdminId });
    const i2 = await scheduleInterview({ studentId: student.id, interviewType: "FINAL", actorId: testAdminId });
    const i3 = await scheduleInterview({ studentId: student.id, interviewType: "OTHER", actorId: testAdminId });

    expect(i1.sequenceNumber).toBe(1);
    expect(i2.sequenceNumber).toBe(2);
    expect(i3.sequenceNumber).toBe(3);
  });
});

describe("Graduation decision", () => {
  it("requires an explicit decision — completing interviews alone never graduates a student", async () => {
    const student = await makeA1Student();
    const interview = await scheduleInterview({ studentId: student.id, interviewType: "FINAL", actorId: testAdminId });
    await recordInterviewEvaluation({
      interviewId: interview.id,
      highestRungHeld: 5,
      overallFeedback: "Held R5 confidently across two independent interviews.",
      evaluatorId: testAdminId,
      result: "ADVANCE",
    });

    const stillA1 = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(stillA1.programStatus).toBe("ACTIVE"); // not auto-graduated
  });

  it("records GRADUATE and sets programStatus to GRADUATED", async () => {
    const student = await makeA1Student();
    const decision = await recordGraduationDecision({
      studentId: student.id,
      decision: "GRADUATE",
      reason: "Combined mock and final interview performance exceeds the graduation threshold.",
      actorId: testAdminId,
    });

    expect(decision.resultingProgramStatus).toBe("GRADUATED");
    const updated = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.programStatus).toBe("GRADUATED");
  });

  it("records NOT_GRADUATE as Future Pipeline / Re-evaluation, not a dead end", async () => {
    const student = await makeA1Student();
    const decision = await recordGraduationDecision({
      studentId: student.id,
      decision: "NOT_GRADUATE",
      reason: "Broke at R3 in the final interview; placed in Future Pipeline for re-evaluation.",
      actorId: testAdminId,
    });

    expect(decision.resultingProgramStatus).toBe("FUTURE_PIPELINE");
    const updated = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.programStatus).toBe("FUTURE_PIPELINE");
    expect(updated.currentStage).toBe("RE_EVALUATION");
  });
});
