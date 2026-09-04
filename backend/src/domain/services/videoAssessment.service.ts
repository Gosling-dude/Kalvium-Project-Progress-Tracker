import { prisma } from "../../lib/prisma";
import { BusinessRuleError, NotFoundError, ValidationError } from "../../lib/errors";
import { recordTrackTransition } from "./trackTransition.service";
import { recordAuditEvent } from "./audit.service";

export async function getActiveQuestionSetVersion(questionSetKey: string) {
  const questionSet = await prisma.videoQuestionSet.findUnique({
    where: { key: questionSetKey },
    include: {
      versions: {
        where: { active: true },
        orderBy: { versionNumber: "desc" },
        take: 1,
        include: { questions: { where: { active: true }, orderBy: { order: "asc" } } },
      },
    },
  });
  const version = questionSet?.versions[0];
  if (!version) throw new NotFoundError("Active VideoQuestionSetVersion", questionSetKey);
  return version;
}

export async function assignVideoQuestionSet(input: {
  studentId: string;
  questionSetKey?: string;
  deadlineAt?: Date;
  actorId: string;
}) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new NotFoundError("Student", input.studentId);
  if (student.currentTrack !== "A") {
    throw new BusinessRuleError(
      `Video questions can only be assigned to Track A students (student is currently Track ${student.currentTrack}).`,
    );
  }

  const version = await getActiveQuestionSetVersion(input.questionSetKey ?? "TRACK_A_BASE");
  const activeEnrollment = await prisma.cohortEnrollment.findFirst({
    where: { studentId: input.studentId, isActive: true },
  });

  const assignment = await prisma.videoAssignment.create({
    data: {
      studentId: input.studentId,
      cohortEnrollmentId: activeEnrollment?.id ?? null,
      questionSetVersionId: version.id,
      deadlineAt: input.deadlineAt ?? null,
      createdById: input.actorId,
      evaluations: {
        create: version.questions.map((q) => ({ questionId: q.id })),
      },
    },
    include: { evaluations: { include: { question: true } }, questionSetVersion: { include: { questions: true } } },
  });

  await recordAuditEvent({
    actorId: input.actorId,
    action: "VIDEO_QUESTION_SET_ASSIGNED",
    entityType: "VideoAssignment",
    entityId: assignment.id,
    after: { studentId: input.studentId, questionSetVersionId: version.id },
  });

  return assignment;
}

export async function recordSubmission(input: {
  videoAssignmentId: string;
  questionId: string;
  submissionReference: string;
  actorId: string;
}) {
  const evaluation = await prisma.videoQuestionEvaluation.findUnique({
    where: { videoAssignmentId_questionId: { videoAssignmentId: input.videoAssignmentId, questionId: input.questionId } },
  });
  if (!evaluation) throw new NotFoundError("VideoQuestionEvaluation");

  const updated = await prisma.videoQuestionEvaluation.update({
    where: { id: evaluation.id },
    data: { submitted: true, submittedAt: new Date(), submissionReference: input.submissionReference },
  });

  await prisma.videoAssignment.update({
    where: { id: input.videoAssignmentId },
    data: { status: "IN_PROGRESS" },
  });

  return updated;
}

export async function recordQuestionEvaluation(input: {
  videoAssignmentId: string;
  questionId: string;
  score: number;
  notes: string;
  reviewerId: string;
}) {
  const evaluation = await prisma.videoQuestionEvaluation.findUnique({
    where: { videoAssignmentId_questionId: { videoAssignmentId: input.videoAssignmentId, questionId: input.questionId } },
    include: { question: true },
  });
  if (!evaluation) throw new NotFoundError("VideoQuestionEvaluation");

  if (input.score < 0 || input.score > evaluation.question.marks) {
    throw new ValidationError(`Score must be between 0 and ${evaluation.question.marks}`);
  }
  if (!input.notes || input.notes.trim().length < 3) {
    throw new ValidationError("A brief evaluation note is required.");
  }

  const updated = await prisma.videoQuestionEvaluation.update({
    where: { id: evaluation.id },
    data: {
      evaluated: true,
      score: input.score,
      notes: input.notes,
      reviewerId: input.reviewerId,
      reviewedAt: new Date(),
    },
  });

  await recordAuditEvent({
    actorId: input.reviewerId,
    action: "VIDEO_QUESTION_EVALUATED",
    entityType: "VideoQuestionEvaluation",
    entityId: updated.id,
    after: { score: input.score, questionKey: evaluation.question.questionKey },
  });

  return updated;
}

export async function getVideoAssignmentProgress(videoAssignmentId: string) {
  const assignment = await prisma.videoAssignment.findUnique({
    where: { id: videoAssignmentId },
    include: {
      evaluations: { include: { question: true }, orderBy: { question: { order: "asc" } } },
      questionSetVersion: true,
    },
  });
  if (!assignment) throw new NotFoundError("VideoAssignment", videoAssignmentId);

  const submittedCount = assignment.evaluations.filter((e) => e.submitted).length;
  const evaluatedCount = assignment.evaluations.filter((e) => e.evaluated).length;
  const totalSoFar = assignment.evaluations.reduce((sum, e) => sum + (e.score ?? 0), 0);
  const mandatoryKeys: string[] = JSON.parse(assignment.questionSetVersion.mandatoryQuestionKeys);
  const mandatoryStatus = mandatoryKeys.map((key) => {
    const evaluation = assignment.evaluations.find((e) => e.question.questionKey === key);
    return {
      questionKey: key,
      evaluated: evaluation?.evaluated ?? false,
      score: evaluation?.score ?? null,
      passes: evaluation?.evaluated ? (evaluation.score ?? 0) >= 3 : null,
    };
  });

  return {
    assignment,
    totalQuestions: assignment.evaluations.length,
    submittedCount,
    evaluatedCount,
    totalScoreSoFar: totalSoFar,
    mandatoryStatus,
  };
}

export async function finalizeVideoAssessment(input: {
  videoAssignmentId: string;
  outcomeReason: string;
  actorId: string;
}) {
  const assignment = await prisma.videoAssignment.findUnique({
    where: { id: input.videoAssignmentId },
    include: { evaluations: { include: { question: true } }, questionSetVersion: true, student: true },
  });
  if (!assignment) throw new NotFoundError("VideoAssignment", input.videoAssignmentId);
  if (assignment.finalizedAt) {
    throw new BusinessRuleError("This video assessment has already been finalized.");
  }
  if (!input.outcomeReason || input.outcomeReason.trim().length < 10) {
    throw new ValidationError(
      "A specific, evidence-based reason is required to finalize a video assessment.",
    );
  }

  const unevaluated = assignment.evaluations.filter((e) => !e.evaluated);
  if (unevaluated.length > 0) {
    throw new BusinessRuleError(
      `${unevaluated.length} of ${assignment.evaluations.length} questions still need evaluation before finalizing.`,
      { pendingQuestionKeys: unevaluated.map((e) => e.question.questionKey) },
    );
  }

  const total = assignment.evaluations.reduce((sum, e) => sum + (e.score ?? 0), 0);
  const thresholdPassed = total >= assignment.questionSetVersion.threshold;
  const mandatoryKeys: string[] = JSON.parse(assignment.questionSetVersion.mandatoryQuestionKeys);
  const mandatoryPassed = mandatoryKeys.every((key) => {
    const evaluation = assignment.evaluations.find((e) => e.question.questionKey === key);
    return (evaluation?.score ?? 0) >= 3;
  });
  const outcome: "A1" | "A2" = thresholdPassed && mandatoryPassed ? "A1" : "A2";

  const updated = await prisma.videoAssignment.update({
    where: { id: input.videoAssignmentId },
    data: {
      status: "EVALUATION_COMPLETE",
      totalScore: total,
      mandatoryPassed,
      outcome,
      outcomeReason: input.outcomeReason,
      finalizedAt: new Date(),
      finalizedById: input.actorId,
    },
  });

  await recordTrackTransition({
    studentId: assignment.studentId,
    toTrack: outcome,
    toStage: outcome === "A1" ? "A1_INTENSIVE" : "A2_DEVELOPMENT",
    toProgramStatus: "ACTIVE",
    reason: input.outcomeReason,
    sourceType: "AUTOMATIC",
    relatedEvaluationType: "VIDEO_ASSESSMENT",
    relatedEvaluationId: assignment.id,
    actorId: input.actorId,
    notes: `Video assessment total ${total}/${assignment.questionSetVersion.totalMax}, mandatory ${mandatoryPassed ? "passed" : "failed"}`,
  });

  await recordAuditEvent({
    actorId: input.actorId,
    action: "VIDEO_ASSESSMENT_FINALIZED",
    entityType: "VideoAssignment",
    entityId: assignment.id,
    after: { outcome, total },
  });

  return updated;
}
