import { describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { assignVideoQuestionSet, finalizeVideoAssessment, recordQuestionEvaluation } from "../../src/domain/services/videoAssessment.service";
import { createCampusCohortStudent } from "../helpers";
import { testAdminId } from "../setup";

async function scoreAll(assignmentId: string, scoreFor: (questionKey: string) => number) {
  const evaluations = await prisma.videoQuestionEvaluation.findMany({
    where: { videoAssignmentId: assignmentId },
    include: { question: true },
  });
  for (const evalRow of evaluations) {
    await recordQuestionEvaluation({
      videoAssignmentId: assignmentId,
      questionId: evalRow.questionId,
      score: scoreFor(evalRow.question.questionKey),
      notes: "Evaluated against listening criteria.",
      reviewerId: testAdminId,
    });
  }
}

async function makeTrackAStudent() {
  const { student } = await createCampusCohortStudent(testAdminId);
  await prisma.student.update({ where: { id: student.id }, data: { currentTrack: "A", currentStage: "VIDEO_ASSESSMENT", programStatus: "ACTIVE" } });
  return student;
}

describe("Video Assessment routing", () => {
  it("routes to A1 when total >= 25 and all mandatory questions (Q1,Q2,Q4,Q7,Q9) score >= 3", async () => {
    const student = await makeTrackAStudent();
    const assignment = await assignVideoQuestionSet({ studentId: student.id, actorId: testAdminId });
    await scoreAll(assignment.id, () => 4);

    const finalized = await finalizeVideoAssessment({
      videoAssignmentId: assignment.id,
      outcomeReason: "Total 40/50, all five mandatory questions scored 4 or above.",
      actorId: testAdminId,
    });

    expect(finalized.outcome).toBe("A1");
    const updated = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.currentTrack).toBe("A1");
    expect(updated.currentStage).toBe("A1_INTENSIVE");
  });

  it("routes to A2 when total >= 25 but a mandatory question fails", async () => {
    const student = await makeTrackAStudent();
    const assignment = await assignVideoQuestionSet({ studentId: student.id, actorId: testAdminId });
    await scoreAll(assignment.id, (key) => (key === "Q7" ? 2 : 4));

    const finalized = await finalizeVideoAssessment({
      videoAssignmentId: assignment.id,
      outcomeReason: "Mandatory question Q7 (Technical Fundamentals) scored 2, below the required minimum of 3.",
      actorId: testAdminId,
    });

    expect(finalized.outcome).toBe("A2");
    const updated = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(updated.currentTrack).toBe("A2");
  });

  it("routes to A2 when total score is below 25 even if mandatory questions individually pass", async () => {
    const student = await makeTrackAStudent();
    const assignment = await assignVideoQuestionSet({ studentId: student.id, actorId: testAdminId });
    // 5 mandatory questions at 3 (pass) + 5 non-mandatory at 1 = 15 + 5 = 20, below threshold of 25
    await scoreAll(assignment.id, (key) => (["Q1", "Q2", "Q4", "Q7", "Q9"].includes(key) ? 3 : 1));

    const finalized = await finalizeVideoAssessment({
      videoAssignmentId: assignment.id,
      outcomeReason: "Total 20/50 is below the 25 threshold despite mandatory questions individually passing.",
      actorId: testAdminId,
    });

    expect(finalized.outcome).toBe("A2");
  });

  it("rejects assignment to a student who is not currently Track A", async () => {
    const { student } = await createCampusCohortStudent(testAdminId); // no track yet (ONBOARDING)
    await expect(assignVideoQuestionSet({ studentId: student.id, actorId: testAdminId })).rejects.toThrow();
  });

  it("rejects finalization while any question is still unevaluated (partial review must remain possible without forcing all ten)", async () => {
    const student = await makeTrackAStudent();
    const assignment = await assignVideoQuestionSet({ studentId: student.id, actorId: testAdminId });
    const evaluations = await prisma.videoQuestionEvaluation.findMany({ where: { videoAssignmentId: assignment.id } });

    // Evaluate only the first question — partial evaluation should succeed...
    await recordQuestionEvaluation({ videoAssignmentId: assignment.id, questionId: evaluations[0].questionId, score: 4, notes: "Good.", reviewerId: testAdminId });

    // ...but finalizing before the rest are done must fail.
    await expect(
      finalizeVideoAssessment({ videoAssignmentId: assignment.id, outcomeReason: "Attempting to finalize early.", actorId: testAdminId }),
    ).rejects.toThrow();
  });
});
