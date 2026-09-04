import { prisma } from "../../lib/prisma";
import { BusinessRuleError, NotFoundError, ValidationError } from "../../lib/errors";
import { recordTrackTransition } from "./trackTransition.service";
import { recordAuditEvent } from "./audit.service";
import type { GraduationDecisionValue } from "../constants/enums";

// The Admin/Manager must ALWAYS explicitly decide graduation — this function
// is never invoked automatically elsewhere (e.g. just because two interviews
// exist). See spec section 19/78.
export async function recordGraduationDecision(input: {
  studentId: string;
  decision: GraduationDecisionValue;
  reason: string;
  relatedInterviewIds?: string[];
  actorId: string;
}) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new NotFoundError("Student", input.studentId);
  if (student.currentTrack !== "A1") {
    throw new BusinessRuleError(
      `Graduation decisions are recorded for Track A1 students only (student is currently Track ${student.currentTrack}).`,
    );
  }
  if (!input.reason || input.reason.trim().length < 10) {
    throw new ValidationError("Graduation decision requires a specific, evidence-based reason.");
  }
  if (input.relatedInterviewIds) {
    const count = await prisma.interview.count({
      where: { id: { in: input.relatedInterviewIds }, studentId: input.studentId },
    });
    if (count !== input.relatedInterviewIds.length) {
      throw new ValidationError("One or more related interviews do not belong to this student.");
    }
  }

  const activeEnrollment = await prisma.cohortEnrollment.findFirst({
    where: { studentId: input.studentId, isActive: true },
  });
  const resultingProgramStatus = input.decision === "GRADUATE" ? "GRADUATED" : "FUTURE_PIPELINE";

  const decisionRecord = await prisma.graduationDecision.create({
    data: {
      studentId: input.studentId,
      cohortEnrollmentId: activeEnrollment?.id ?? null,
      decision: input.decision,
      reason: input.reason,
      relatedInterviewIds: input.relatedInterviewIds ? JSON.stringify(input.relatedInterviewIds) : null,
      resultingProgramStatus,
      decidedById: input.actorId,
    },
  });

  await recordTrackTransition({
    studentId: input.studentId,
    toTrack: "A1",
    toStage: input.decision === "GRADUATE" ? "GRADUATION" : "RE_EVALUATION",
    toProgramStatus: resultingProgramStatus,
    reason: input.reason,
    sourceType: "AUTOMATIC",
    relatedEvaluationType: "GRADUATION_DECISION",
    relatedEvaluationId: decisionRecord.id,
    actorId: input.actorId,
  });

  await recordAuditEvent({
    actorId: input.actorId,
    action: "GRADUATION_DECISION_RECORDED",
    entityType: "GraduationDecision",
    entityId: decisionRecord.id,
    after: { decision: input.decision, studentId: input.studentId },
  });

  return decisionRecord;
}

export async function listGraduationDecisionsForStudent(studentId: string) {
  return prisma.graduationDecision.findMany({
    where: { studentId },
    orderBy: { decidedAt: "desc" },
    include: { decidedBy: { select: { id: true, name: true } } },
  });
}
