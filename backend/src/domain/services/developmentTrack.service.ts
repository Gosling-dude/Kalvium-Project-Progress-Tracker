// Shared A2 / Track B "development loop" logic: deliverable assignment,
// checkpoints, and the Growth Coach evaluation gate that decides whether a
// student advances (A2 -> A1, or B -> A) or continues the loop. A2 and Track B
// share the same mechanics but differ in one critical rule enforced here:
// promoting out of A2 goes straight to A1 (video is never repeated), while
// promoting out of Track B always re-enters Track A at Orientation/Video.
import { prisma } from "../../lib/prisma";
import { BusinessRuleError, NotFoundError, ValidationError } from "../../lib/errors";
import { recordTrackTransition } from "./trackTransition.service";
import { recordAuditEvent } from "./audit.service";
import type {
  CheckpointStatus,
  DeliverableTrack,
  GrowthCoachDecision,
  SubmissionType,
  VerificationStatus,
} from "../constants/enums";

function assertDevelopmentTrack(track: string): asserts track is "A2" | "B" {
  if (track !== "A2" && track !== "B") {
    throw new ValidationError("Development-loop operations are only valid for track A2 or B.");
  }
}

export async function createCheckpoint(input: {
  studentId: string;
  track: DeliverableTrack;
  name: string;
  sequence: number;
  dueAt?: Date;
  expectedEvidence?: string;
  whatWillBeChecked?: string;
  expectedProgress?: string;
  actorId: string;
}) {
  assertDevelopmentTrack(input.track);
  const activeEnrollment = await prisma.cohortEnrollment.findFirst({
    where: { studentId: input.studentId, isActive: true },
  });

  const checkpoint = await prisma.checkpoint.create({
    data: {
      studentId: input.studentId,
      cohortEnrollmentId: activeEnrollment?.id ?? null,
      track: input.track,
      name: input.name,
      sequence: input.sequence,
      dueAt: input.dueAt ?? null,
      expectedEvidence: input.expectedEvidence ?? null,
      whatWillBeChecked: input.whatWillBeChecked ?? null,
      expectedProgress: input.expectedProgress ?? null,
    },
  });

  await recordAuditEvent({
    actorId: input.actorId,
    action: "CHECKPOINT_CREATED",
    entityType: "Checkpoint",
    entityId: checkpoint.id,
    after: { studentId: input.studentId, name: input.name },
  });
  return checkpoint;
}

export async function evaluateCheckpoint(
  checkpointId: string,
  input: { status: CheckpointStatus; evaluationNotes: string },
  actorId: string,
) {
  const checkpoint = await prisma.checkpoint.findUnique({ where: { id: checkpointId } });
  if (!checkpoint) throw new NotFoundError("Checkpoint", checkpointId);
  if (!input.evaluationNotes || input.evaluationNotes.trim().length < 5) {
    throw new ValidationError("Checkpoint evaluation requires a brief note on what was checked.");
  }

  const updated = await prisma.checkpoint.update({
    where: { id: checkpointId },
    data: { status: input.status, evaluationNotes: input.evaluationNotes },
  });

  await recordAuditEvent({
    actorId,
    action: "CHECKPOINT_UPDATED",
    entityType: "Checkpoint",
    entityId: checkpointId,
    before: { status: checkpoint.status },
    after: { status: input.status },
  });
  return updated;
}

export async function assignDeliverable(input: {
  studentId: string;
  templateId: string;
  track: "A2" | "B";
  checkpointId?: string;
  dueAt?: Date;
  actorId: string;
}) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new NotFoundError("Student", input.studentId);

  const template = await prisma.deliverableTemplate.findUnique({ where: { id: input.templateId } });
  if (!template) throw new NotFoundError("DeliverableTemplate", input.templateId);

  const activeEnrollment = await prisma.cohortEnrollment.findFirst({
    where: { studentId: input.studentId, isActive: true },
  });

  const assignment = await prisma.deliverableAssignment.create({
    data: {
      studentId: input.studentId,
      cohortEnrollmentId: activeEnrollment?.id ?? null,
      templateId: template.id,
      templateSnapshot: JSON.stringify(template),
      track: input.track,
      checkpointId: input.checkpointId ?? null,
      dueAt: input.dueAt ?? null,
      submissionType: template.submissionType,
      createdById: input.actorId,
    },
  });

  await recordAuditEvent({
    actorId: input.actorId,
    action: "DELIVERABLE_ASSIGNED",
    entityType: "DeliverableAssignment",
    entityId: assignment.id,
    after: { studentId: input.studentId, templateKey: template.key },
  });
  return assignment;
}

export async function recordDeliverableSubmission(
  assignmentId: string,
  input: { submissionFromStudent: string },
  actorId: string,
) {
  const assignment = await prisma.deliverableAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new NotFoundError("DeliverableAssignment", assignmentId);
  if (!input.submissionFromStudent || input.submissionFromStudent.trim().length === 0) {
    throw new ValidationError("A submission reference is required.");
  }

  const updated = await prisma.deliverableAssignment.update({
    where: { id: assignmentId },
    data: { submissionFromStudent: input.submissionFromStudent, submittedAt: new Date(), status: "SUBMITTED" },
  });

  await recordAuditEvent({
    actorId,
    action: "DELIVERABLE_SUBMITTED",
    entityType: "DeliverableAssignment",
    entityId: assignmentId,
  });
  return updated;
}

export async function verifyDeliverable(
  assignmentId: string,
  input: { verificationStatus: VerificationStatus; feedback: string },
  actorId: string,
) {
  const assignment = await prisma.deliverableAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new NotFoundError("DeliverableAssignment", assignmentId);
  if (!input.feedback || input.feedback.trim().length < 5) {
    throw new ValidationError("Verification feedback is required.");
  }

  const updated = await prisma.deliverableAssignment.update({
    where: { id: assignmentId },
    data: {
      verificationStatus: input.verificationStatus,
      verifiedAt: new Date(),
      verifiedById: actorId,
      feedback: input.feedback,
      status: input.verificationStatus === "VERIFIED" ? "VERIFIED" : "REJECTED",
    },
  });

  await recordAuditEvent({
    actorId,
    action: "DELIVERABLE_VERIFIED",
    entityType: "DeliverableAssignment",
    entityId: assignmentId,
    after: { verificationStatus: input.verificationStatus },
  });
  return updated;
}

export async function recordGrowthCoachEvaluation(input: {
  studentId: string;
  track: "A2" | "B";
  completion?: number;
  quality?: number;
  evidence?: string;
  demonstratedImprovement?: number;
  understanding?: number;
  ownership?: number;
  abilityToExplain?: number;
  foundationalGapsAddressed?: boolean;
  decision: GrowthCoachDecision;
  feedback: string;
  evaluatorGrowthCoachId?: string;
  actorId: string;
}) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new NotFoundError("Student", input.studentId);
  if (student.currentTrack !== input.track) {
    throw new BusinessRuleError(
      `Student is currently Track ${student.currentTrack}, not ${input.track}. Refresh before recording this evaluation.`,
    );
  }
  if (!input.feedback || input.feedback.trim().length < 10) {
    throw new ValidationError("Growth Coach feedback must be specific and evidence-based (at least 10 characters).");
  }

  const activeEnrollment = await prisma.cohortEnrollment.findFirst({
    where: { studentId: input.studentId, isActive: true },
  });

  const evaluation = await prisma.growthCoachEvaluation.create({
    data: {
      studentId: input.studentId,
      cohortEnrollmentId: activeEnrollment?.id ?? null,
      track: input.track,
      completion: input.completion ?? null,
      quality: input.quality ?? null,
      evidence: input.evidence ?? null,
      demonstratedImprovement: input.demonstratedImprovement ?? null,
      understanding: input.understanding ?? null,
      ownership: input.ownership ?? null,
      abilityToExplain: input.abilityToExplain ?? null,
      foundationalGapsAddressed: input.foundationalGapsAddressed ?? null,
      decision: input.decision,
      feedback: input.feedback,
      evaluatorId: input.evaluatorGrowthCoachId ?? student.growthCoachId ?? null,
      recordedById: input.actorId,
    },
  });

  // The A2 vs Track B distinction that must never be collapsed:
  //   A2 -> A1 (sufficient) skips video entirely.
  //   B  -> A  (sufficient) re-enters Track A at Orientation/Video.
  const sufficient = input.decision === "SUFFICIENT";
  const toTrack = sufficient ? (input.track === "A2" ? "A1" : "A") : input.track;
  const toStage = sufficient
    ? input.track === "A2"
      ? "A1_INTENSIVE"
      : "VIDEO_ASSESSMENT"
    : input.track === "A2"
      ? "A2_DEVELOPMENT"
      : "B_DEVELOPMENT";

  await recordTrackTransition({
    studentId: input.studentId,
    toTrack,
    toStage,
    toProgramStatus: "ACTIVE",
    reason: input.feedback,
    sourceType: "AUTOMATIC",
    relatedEvaluationType: "GROWTH_COACH_EVALUATION",
    relatedEvaluationId: evaluation.id,
    actorId: input.actorId,
  });

  await recordAuditEvent({
    actorId: input.actorId,
    action: "GROWTH_COACH_DECISION_RECORDED",
    entityType: "GrowthCoachEvaluation",
    entityId: evaluation.id,
    after: { decision: input.decision, track: input.track },
  });

  return evaluation;
}

export async function listDeliverablesForStudent(studentId: string) {
  return prisma.deliverableAssignment.findMany({
    where: { studentId },
    include: { template: true, checkpoint: true },
    orderBy: { assignedAt: "asc" },
  });
}

export async function listCheckpointsForStudent(studentId: string) {
  return prisma.checkpoint.findMany({
    where: { studentId },
    include: { deliverables: true },
    orderBy: { sequence: "asc" },
  });
}

export async function listGrowthCoachEvaluationsForStudent(studentId: string) {
  return prisma.growthCoachEvaluation.findMany({
    where: { studentId },
    orderBy: { evaluatedAt: "desc" },
  });
}
