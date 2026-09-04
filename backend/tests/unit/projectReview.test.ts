import { describe, expect, it } from "vitest";
import { completeProjectReview, createProjectReview } from "../../src/domain/services/projectReview.service";
import { PROJECT_REVIEW_RUBRIC_V1 } from "../../src/domain/constants/rubric";
import { prisma } from "../../src/lib/prisma";
import { createCampusCohortStudent, FULL_RUBRIC_PASS_SCORES } from "../helpers";
import { testAdminId } from "../setup";

const DIMENSION_KEYS = PROJECT_REVIEW_RUBRIC_V1.dimensions.map((d) => d.key);

describe("Project Review routing", () => {
  it("routes to Track A when total >= 25 and all mandatory minimums pass", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    const review = await createProjectReview({
      studentId: student.id,
      reviewerId: testAdminId,
      scores: FULL_RUBRIC_PASS_SCORES(DIMENSION_KEYS), // 4 x 10 = 40
    });

    const completed = await completeProjectReview(
      review.id,
      { outcomeReason: "Strong baseline across every dimension, all mandatory minimums cleared." },
      testAdminId,
    );

    expect(completed.outcome).toBe("TRACK_A");
    expect(completed.totalScore).toBe(40);
    expect(completed.thresholdPassed).toBe(true);
    expect(completed.mandatoryPassed).toBe(true);

    const updatedStudent = await prisma.student.findUniqueOrThrow({ where: { id: student.id } });
    expect(updatedStudent.currentTrack).toBe("A");
    expect(updatedStudent.currentStage).toBe("VIDEO_ASSESSMENT");
  });

  it("routes to Track B when total score is below 25 even with no mandatory failures", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    const review = await createProjectReview({
      studentId: student.id,
      reviewerId: testAdminId,
      scores: DIMENSION_KEYS.map((key) => ({ dimensionKey: key, score: 2, reason: "Below expectations across the board." })),
    });

    const completed = await completeProjectReview(
      review.id,
      { outcomeReason: "Total 20/50 is below the 25 threshold — routed to Track B." },
      testAdminId,
    );

    expect(completed.totalScore).toBe(20);
    expect(completed.thresholdPassed).toBe(false);
    expect(completed.outcome).toBe("TRACK_B");
  });

  it("routes to Track B when total >= 25 but a mandatory dimension fails its minimum", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    // 9 dimensions at 4 = 36, GITHUB_EVIDENCE at 1 (below mandatory min 3) => total 37, still >= 25
    const scores = DIMENSION_KEYS.map((key) => ({
      dimensionKey: key,
      score: key === "GITHUB_EVIDENCE" ? 1 : 4,
      reason: key === "GITHUB_EVIDENCE" ? "No verifiable repository or supporting link." : "Solid.",
    }));
    const review = await createProjectReview({ studentId: student.id, reviewerId: testAdminId, scores });

    const completed = await completeProjectReview(
      review.id,
      { outcomeReason: "Total score clears the threshold, but GitHub/Evidence scored 1, below the mandatory minimum of 3." },
      testAdminId,
    );

    expect(completed.thresholdPassed).toBe(true);
    expect(completed.mandatoryPassed).toBe(false);
    expect(completed.outcome).toBe("TRACK_B");
    expect(JSON.parse(completed.triggeredMandatoryFailures ?? "[]")).toContain("GITHUB_EVIDENCE");
  });

  it("rejects completion without a meaningful outcome reason", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    const review = await createProjectReview({ studentId: student.id, reviewerId: testAdminId, scores: FULL_RUBRIC_PASS_SCORES(DIMENSION_KEYS) });

    await expect(completeProjectReview(review.id, { outcomeReason: "ok" }, testAdminId)).rejects.toThrow();
  });

  it("locks a completed review against further edits", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    const review = await createProjectReview({ studentId: student.id, reviewerId: testAdminId, scores: FULL_RUBRIC_PASS_SCORES(DIMENSION_KEYS) });
    await completeProjectReview(review.id, { outcomeReason: "Clean pass across every dimension, no concerns." }, testAdminId);

    await expect(
      completeProjectReview(review.id, { outcomeReason: "Trying again with a different reason entirely." }, testAdminId),
    ).rejects.toThrow();
  });
});
