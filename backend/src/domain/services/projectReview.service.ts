import { prisma } from "../../lib/prisma";
import { BusinessRuleError, NotFoundError, ValidationError } from "../../lib/errors";
import { recordTrackTransition } from "./trackTransition.service";
import { recordAuditEvent } from "./audit.service";
import { PROJECT_REVIEW_RUBRIC_V1, RubricDimensionDef } from "../constants/rubric";

export interface ScoreInput {
  dimensionKey: string;
  score: number;
  reason: string;
}

interface RubricVersionRecord {
  id: string;
  key: string;
  totalMax: number;
  threshold: number;
  dimensions: string;
}

function parseDimensions(rubricVersion: RubricVersionRecord): RubricDimensionDef[] {
  return JSON.parse(rubricVersion.dimensions) as RubricDimensionDef[];
}

async function getActiveRubricVersion(rubricVersionId?: string) {
  const rubricVersion = rubricVersionId
    ? await prisma.rubricVersion.findUnique({ where: { id: rubricVersionId } })
    : await prisma.rubricVersion.findFirst({
        where: { key: PROJECT_REVIEW_RUBRIC_V1.key, active: true },
      });
  if (!rubricVersion) throw new NotFoundError("RubricVersion", rubricVersionId);
  return rubricVersion;
}

function validateScoresAgainstDimensions(scores: ScoreInput[], dimensions: RubricDimensionDef[]) {
  const byKey = new Map(dimensions.map((d) => [d.key, d]));
  const seen = new Set<string>();

  for (const score of scores) {
    const dim = byKey.get(score.dimensionKey);
    if (!dim) {
      throw new ValidationError(`Unknown rubric dimension '${score.dimensionKey}'`);
    }
    if (score.score < 0 || score.score > dim.maxScore) {
      throw new ValidationError(`${dim.label} score must be between 0 and ${dim.maxScore}`);
    }
    seen.add(score.dimensionKey);
  }

  const missing = dimensions.filter((d) => !seen.has(d.key));
  if (missing.length > 0) {
    throw new ValidationError(
      `Missing scores for dimensions: ${missing.map((d) => d.label).join(", ")}`,
    );
  }
}

function computeOutcome(scores: ScoreInput[], dimensions: RubricDimensionDef[], threshold: number) {
  const byKey = new Map(dimensions.map((d) => [d.key, d]));
  const total = scores.reduce((sum, s) => sum + s.score, 0);
  const thresholdPassed = total >= threshold;

  const triggeredMandatoryFailures: string[] = [];
  const scoreRows = scores.map((s) => {
    const dim = byKey.get(s.dimensionKey)!;
    const mandatoryPass = dim.mandatory ? s.score >= (dim.mandatoryMin ?? 0) : null;
    if (dim.mandatory && !mandatoryPass) triggeredMandatoryFailures.push(dim.key);
    return {
      dimensionKey: dim.key,
      dimensionLabel: dim.label,
      score: s.score,
      maxScore: dim.maxScore,
      isMandatory: dim.mandatory,
      mandatoryMin: dim.mandatoryMin,
      mandatoryPass,
      reason: s.reason,
      order: dim.order,
    };
  });

  const mandatoryPassed = triggeredMandatoryFailures.length === 0;
  const outcome: "TRACK_A" | "TRACK_B" = thresholdPassed && mandatoryPassed ? "TRACK_A" : "TRACK_B";

  return { total, thresholdPassed, mandatoryPassed, outcome, triggeredMandatoryFailures, scoreRows };
}

export async function createProjectReview(input: {
  studentId: string;
  rubricVersionId?: string;
  scores: ScoreInput[];
  reviewerId: string;
}) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new NotFoundError("Student", input.studentId);

  const rubricVersion = await getActiveRubricVersion(input.rubricVersionId);
  const dimensions = parseDimensions(rubricVersion);
  validateScoresAgainstDimensions(input.scores, dimensions);

  const computed = computeOutcome(input.scores, dimensions, rubricVersion.threshold);
  const activeEnrollment = await prisma.cohortEnrollment.findFirst({
    where: { studentId: input.studentId, isActive: true },
  });

  const review = await prisma.projectReview.create({
    data: {
      studentId: input.studentId,
      cohortEnrollmentId: activeEnrollment?.id ?? null,
      rubricVersionId: rubricVersion.id,
      reviewerId: input.reviewerId,
      status: "DRAFT",
      totalScore: computed.total,
      thresholdPassed: computed.thresholdPassed,
      mandatoryPassed: computed.mandatoryPassed,
      scores: { create: computed.scoreRows },
    },
    include: { scores: true },
  });

  await recordAuditEvent({
    actorId: input.reviewerId,
    action: "PROJECT_REVIEW_CREATED",
    entityType: "ProjectReview",
    entityId: review.id,
    after: { totalScore: computed.total, status: "DRAFT" },
  });

  return review;
}

export async function updateProjectReview(
  reviewId: string,
  input: { scores: ScoreInput[] },
  actorId: string,
) {
  const review = await prisma.projectReview.findUnique({
    where: { id: reviewId },
    include: { rubricVersion: true },
  });
  if (!review) throw new NotFoundError("ProjectReview", reviewId);
  if (review.status === "COMPLETED") {
    throw new BusinessRuleError(
      "This Project Review is already completed and is now part of the historical record. Create a new review instead of editing it.",
    );
  }

  const dimensions = parseDimensions(review.rubricVersion);
  validateScoresAgainstDimensions(input.scores, dimensions);
  const computed = computeOutcome(input.scores, dimensions, review.rubricVersion.threshold);

  await prisma.projectReviewScore.deleteMany({ where: { projectReviewId: reviewId } });
  const updated = await prisma.projectReview.update({
    where: { id: reviewId },
    data: {
      totalScore: computed.total,
      thresholdPassed: computed.thresholdPassed,
      mandatoryPassed: computed.mandatoryPassed,
      scores: { create: computed.scoreRows },
    },
    include: { scores: true },
  });

  await recordAuditEvent({
    actorId,
    action: "PROJECT_REVIEW_UPDATED",
    entityType: "ProjectReview",
    entityId: reviewId,
    after: { totalScore: computed.total },
  });

  return updated;
}

export async function completeProjectReview(
  reviewId: string,
  input: { scores?: ScoreInput[]; outcomeReason: string },
  actorId: string,
) {
  const review = await prisma.projectReview.findUnique({
    where: { id: reviewId },
    include: { scores: true, rubricVersion: true, student: true },
  });
  if (!review) throw new NotFoundError("ProjectReview", reviewId);
  if (review.status === "COMPLETED") {
    throw new BusinessRuleError("This Project Review has already been completed.");
  }
  if (!input.outcomeReason || input.outcomeReason.trim().length < 10) {
    throw new ValidationError(
      "A specific, evidence-based reason is required to complete a Project Review.",
    );
  }

  const dimensions = parseDimensions(review.rubricVersion);
  const scores: ScoreInput[] =
    input.scores ??
    review.scores.map((s) => ({ dimensionKey: s.dimensionKey, score: s.score, reason: s.reason }));

  validateScoresAgainstDimensions(scores, dimensions);

  const missingReasons = scores.filter((s) => !s.reason || s.reason.trim().length < 3);
  if (missingReasons.length > 0) {
    throw new ValidationError(
      `Every dimension needs a brief reason before completing the review. Missing: ${missingReasons
        .map((s) => s.dimensionKey)
        .join(", ")}`,
    );
  }

  const computed = computeOutcome(scores, dimensions, review.rubricVersion.threshold);

  await prisma.projectReviewScore.deleteMany({ where: { projectReviewId: reviewId } });
  const completed = await prisma.projectReview.update({
    where: { id: reviewId },
    data: {
      status: "COMPLETED",
      totalScore: computed.total,
      thresholdPassed: computed.thresholdPassed,
      mandatoryPassed: computed.mandatoryPassed,
      outcome: computed.outcome,
      outcomeReason: input.outcomeReason,
      triggeredMandatoryFailures: JSON.stringify(computed.triggeredMandatoryFailures),
      reviewedAt: new Date(),
      scores: { create: computed.scoreRows },
    },
    include: { scores: true },
  });

  await recordTrackTransition({
    studentId: review.studentId,
    toTrack: computed.outcome === "TRACK_A" ? "A" : "B",
    toStage: computed.outcome === "TRACK_A" ? "VIDEO_ASSESSMENT" : "B_DEVELOPMENT",
    toProgramStatus: "ACTIVE",
    reason: input.outcomeReason,
    sourceType: "AUTOMATIC",
    relatedEvaluationType: "PROJECT_REVIEW",
    relatedEvaluationId: reviewId,
    actorId,
    notes:
      computed.triggeredMandatoryFailures.length > 0
        ? `Mandatory failures: ${computed.triggeredMandatoryFailures.join(", ")}`
        : undefined,
  });

  await recordAuditEvent({
    actorId,
    action: "PROJECT_REVIEW_COMPLETED",
    entityType: "ProjectReview",
    entityId: reviewId,
    after: { outcome: computed.outcome, totalScore: computed.total },
  });

  return completed;
}

export async function getProjectReview(reviewId: string) {
  const review = await prisma.projectReview.findUnique({
    where: { id: reviewId },
    include: { scores: { orderBy: { order: "asc" } }, reviewer: true, rubricVersion: true },
  });
  if (!review) throw new NotFoundError("ProjectReview", reviewId);
  return review;
}

export async function listProjectReviewsForStudent(studentId: string) {
  return prisma.projectReview.findMany({
    where: { studentId },
    include: { scores: { orderBy: { order: "asc" } }, reviewer: true },
    orderBy: { createdAt: "desc" },
  });
}
