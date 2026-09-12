import { prisma } from "../../lib/prisma";
import { BusinessRuleError, NotFoundError, ValidationError } from "../../lib/errors";
import { recordTrackTransition } from "./trackTransition.service";
import { recordAuditEvent } from "./audit.service";
import type {
  BreakCauseCategory,
  GrowthCoachConfirmationStatus,
  InterviewResult,
  InterviewType,
} from "../constants/enums";

const MIN_RUNG = 1;
const MAX_RUNG = 4;

export async function scheduleInterview(input: {
  studentId: string;
  interviewType: InterviewType;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  timezone?: string;
  interviewerId?: string;
  chosenProject?: string;
  growthCoachConfirmationStatus?: GrowthCoachConfirmationStatus;
  actorId: string;
}) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new NotFoundError("Student", input.studentId);

  const activeEnrollment = await prisma.cohortEnrollment.findFirst({
    where: { studentId: input.studentId, isActive: true },
  });
  const existingCount = await prisma.interview.count({ where: { studentId: input.studentId } });

  const interview = await prisma.interview.create({
    data: {
      studentId: input.studentId,
      cohortEnrollmentId: activeEnrollment?.id ?? null,
      interviewType: input.interviewType,
      sequenceNumber: existingCount + 1,
      scheduledStart: input.scheduledStart ?? null,
      scheduledEnd: input.scheduledEnd ?? null,
      timezone: input.timezone ?? "Asia/Kolkata",
      interviewerId: input.interviewerId ?? null,
      chosenProject: input.chosenProject ?? student.chosenProject ?? null,
      growthCoachConfirmationStatus: input.growthCoachConfirmationStatus ?? "NOT_REQUIRED",
      createdById: input.actorId,
    },
  });

  if (student.currentTrack === "A1" && student.currentStage !== "INTERVIEW") {
    await recordTrackTransition({
      studentId: input.studentId,
      toTrack: "A1",
      toStage: "INTERVIEW",
      toProgramStatus: "ACTIVE",
      reason: `Interview #${interview.sequenceNumber} (${input.interviewType}) scheduled`,
      sourceType: "AUTOMATIC",
      relatedEvaluationType: "INTERVIEW",
      relatedEvaluationId: interview.id,
      actorId: input.actorId,
    });
  }

  await recordAuditEvent({
    actorId: input.actorId,
    action: "INTERVIEW_SCHEDULED",
    entityType: "Interview",
    entityId: interview.id,
    after: { studentId: input.studentId, sequenceNumber: interview.sequenceNumber },
  });

  return interview;
}

export async function updateInterviewSchedule(
  interviewId: string,
  input: {
    scheduledStart?: Date;
    scheduledEnd?: Date;
    timezone?: string;
    interviewerId?: string;
    growthCoachConfirmationStatus?: GrowthCoachConfirmationStatus;
    status?: "SCHEDULED" | "CANCELLED" | "RESCHEDULED";
  },
  actorId: string,
) {
  const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
  if (!interview) throw new NotFoundError("Interview", interviewId);

  const updated = await prisma.interview.update({
    where: { id: interviewId },
    data: {
      scheduledStart: input.scheduledStart ?? undefined,
      scheduledEnd: input.scheduledEnd ?? undefined,
      timezone: input.timezone ?? undefined,
      interviewerId: input.interviewerId ?? undefined,
      growthCoachConfirmationStatus: input.growthCoachConfirmationStatus ?? undefined,
      status: input.status ?? undefined,
    },
  });

  await recordAuditEvent({
    actorId,
    action: "INTERVIEW_RESCHEDULED",
    entityType: "Interview",
    entityId: interviewId,
    before: { scheduledStart: interview.scheduledStart, status: interview.status },
    after: { scheduledStart: updated.scheduledStart, status: updated.status },
  });

  return updated;
}

export async function completeInterview(
  interviewId: string,
  input: { actualStart?: Date; actualEnd?: Date; notes?: string },
  actorId: string,
) {
  const interview = await prisma.interview.findUnique({ where: { id: interviewId } });
  if (!interview) throw new NotFoundError("Interview", interviewId);

  const updated = await prisma.interview.update({
    where: { id: interviewId },
    data: {
      status: "COMPLETED",
      actualStart: input.actualStart ?? new Date(),
      actualEnd: input.actualEnd ?? new Date(),
      notes: input.notes ?? interview.notes,
    },
  });

  await recordAuditEvent({
    actorId,
    action: "INTERVIEW_COMPLETED",
    entityType: "Interview",
    entityId: interviewId,
  });

  return updated;
}

export async function recordInterviewEvaluation(input: {
  interviewId: string;
  highestRungHeld?: number;
  breakRung?: number;
  breakCauseCategory?: BreakCauseCategory;
  breakCauseNotes?: string;
  evidence?: string;
  communicationRating?: number;
  prescription?: string;
  strengths?: string;
  weaknesses?: string;
  overallFeedback: string;
  result?: InterviewResult;
  transcriptUrl?: string;
  evaluatorId: string;
}) {
  const interview = await prisma.interview.findUnique({ where: { id: input.interviewId } });
  if (!interview) throw new NotFoundError("Interview", input.interviewId);

  if (input.transcriptUrl !== undefined) {
    await prisma.interview.update({ where: { id: input.interviewId }, data: { transcriptUrl: input.transcriptUrl } });
  }

  if (!input.overallFeedback || input.overallFeedback.trim().length < 10) {
    throw new ValidationError("Overall feedback must be specific and evidence-based (at least 10 characters).");
  }
  for (const [label, value] of [
    ["Highest rung held", input.highestRungHeld],
    ["Break rung", input.breakRung],
  ] as const) {
    if (value !== undefined && (value < MIN_RUNG || value > MAX_RUNG)) {
      throw new ValidationError(`${label} must be between ${MIN_RUNG} (R1 Explain) and ${MAX_RUNG} (R4 Scale & Failure).`);
    }
  }
  if (
    input.breakRung !== undefined &&
    input.highestRungHeld !== undefined &&
    input.breakRung <= input.highestRungHeld
  ) {
    throw new ValidationError("Break rung must be higher than the highest rung held.");
  }
  if (input.communicationRating !== undefined && (input.communicationRating < 1 || input.communicationRating > 5)) {
    throw new ValidationError("Communication rating must be between 1 and 5.");
  }

  const evaluation = await prisma.interviewEvaluation.upsert({
    where: { interviewId: input.interviewId },
    create: {
      interviewId: input.interviewId,
      highestRungHeld: input.highestRungHeld ?? null,
      breakRung: input.breakRung ?? null,
      breakCauseCategory: input.breakCauseCategory ?? null,
      breakCauseNotes: input.breakCauseNotes ?? null,
      evidence: input.evidence ?? null,
      communicationRating: input.communicationRating ?? null,
      prescription: input.prescription ?? null,
      strengths: input.strengths ?? null,
      weaknesses: input.weaknesses ?? null,
      overallFeedback: input.overallFeedback,
      result: input.result ?? null,
      evaluatorId: input.evaluatorId,
    },
    update: {
      highestRungHeld: input.highestRungHeld ?? null,
      breakRung: input.breakRung ?? null,
      breakCauseCategory: input.breakCauseCategory ?? null,
      breakCauseNotes: input.breakCauseNotes ?? null,
      evidence: input.evidence ?? null,
      communicationRating: input.communicationRating ?? null,
      prescription: input.prescription ?? null,
      strengths: input.strengths ?? null,
      weaknesses: input.weaknesses ?? null,
      overallFeedback: input.overallFeedback,
      result: input.result ?? null,
      evaluatorId: input.evaluatorId,
      evaluatedAt: new Date(),
    },
  });

  await recordAuditEvent({
    actorId: input.evaluatorId,
    action: "INTERVIEW_EVALUATION_RECORDED",
    entityType: "InterviewEvaluation",
    entityId: evaluation.id,
    after: { highestRungHeld: input.highestRungHeld, result: input.result },
  });

  return evaluation;
}

export async function listInterviewsForStudent(studentId: string) {
  return prisma.interview.findMany({
    where: { studentId },
    orderBy: { sequenceNumber: "asc" },
    include: { evaluation: true, interviewer: { select: { id: true, name: true } } },
  });
}
