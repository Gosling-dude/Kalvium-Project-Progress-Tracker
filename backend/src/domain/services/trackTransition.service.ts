import { prisma } from "../../lib/prisma";
import { BusinessRuleError, NotFoundError, ValidationError } from "../../lib/errors";
import { recordAuditEvent } from "./audit.service";
import type {
  ProgramStatus,
  RelatedEvaluationType,
  Stage,
  Track,
  TransitionSource,
} from "../constants/enums";

const MIN_REASON_LENGTH = 8;

// Which track moves are considered routine/expected outcomes of the program
// flow and therefore do not need an admin override reason. Every other move
// (e.g. Track A -> Track B, A1 -> A2) is exceptional and must be recorded as
// an OVERRIDE with an explicit override reason — see spec section 66.
const AUTOMATIC_ALLOWED_MOVES: Record<string, Track[]> = {
  NONE: ["A", "B"],
  A: ["A1", "A2", "A"],
  A2: ["A1", "A2"],
  B: ["A", "B"],
  A1: ["A1"],
};

export function isRoutineTrackMove(fromTrack: Track | null, toTrack: Track): boolean {
  const key = fromTrack ?? "NONE";
  return AUTOMATIC_ALLOWED_MOVES[key]?.includes(toTrack) ?? false;
}

export interface RecordTransitionInput {
  studentId: string;
  toTrack: Track;
  toStage: Stage;
  toProgramStatus: ProgramStatus;
  reason: string;
  sourceType: TransitionSource;
  overrideReason?: string;
  relatedEvaluationType?: RelatedEvaluationType;
  relatedEvaluationId?: string;
  notes?: string;
  actorId: string;
  effectiveAt?: Date;
}

function assertMeaningfulReason(reason: string | undefined, label: string) {
  if (!reason || reason.trim().length < MIN_REASON_LENGTH) {
    throw new ValidationError(
      `${label} must be a specific, evidence-based explanation (at least ${MIN_REASON_LENGTH} characters).`,
    );
  }
}

// The single place in the codebase allowed to move a student between
// track/stage/programStatus. Every call creates an immutable TrackTransition
// record and an AuditEvent — the student's row is only ever a cached "current
// state" projection of this history.
export async function recordTrackTransition(input: RecordTransitionInput) {
  assertMeaningfulReason(input.reason, "Transition reason");

  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new NotFoundError("Student", input.studentId);

  const fromTrack = student.currentTrack as Track | null;
  const routine = isRoutineTrackMove(fromTrack, input.toTrack);

  if (!routine && input.sourceType !== "OVERRIDE") {
    throw new BusinessRuleError(
      `Moving a student from Track ${fromTrack} to Track ${input.toTrack} is not a routine program move. ` +
        `Resubmit with sourceType OVERRIDE and an overrideReason to proceed deliberately.`,
      { fromTrack, toTrack: input.toTrack },
    );
  }
  if (input.sourceType === "OVERRIDE") {
    assertMeaningfulReason(input.overrideReason, "Override reason");
  }

  const activeEnrollment = await prisma.cohortEnrollment.findFirst({
    where: { studentId: input.studentId, isActive: true },
  });

  const effectiveAt = input.effectiveAt ?? new Date();

  const [transition] = await prisma.$transaction([
    prisma.trackTransition.create({
      data: {
        studentId: input.studentId,
        cohortEnrollmentId: activeEnrollment?.id ?? null,
        fromTrack: student.currentTrack,
        toTrack: input.toTrack,
        fromStage: student.currentStage,
        toStage: input.toStage,
        fromProgramStatus: student.programStatus,
        toProgramStatus: input.toProgramStatus,
        reason: input.reason,
        sourceType: input.sourceType,
        overrideReason: input.overrideReason ?? null,
        relatedEvaluationType: input.relatedEvaluationType ?? null,
        relatedEvaluationId: input.relatedEvaluationId ?? null,
        notes: input.notes ?? null,
        actorId: input.actorId,
        effectiveAt,
      },
    }),
    prisma.student.update({
      where: { id: input.studentId },
      data: {
        currentTrack: input.toTrack,
        currentStage: input.toStage,
        programStatus: input.toProgramStatus,
      },
    }),
  ]);

  await recordAuditEvent({
    actorId: input.actorId,
    action: "TRACK_TRANSITION_RECORDED",
    entityType: "Student",
    entityId: input.studentId,
    before: { track: fromTrack, stage: student.currentStage, programStatus: student.programStatus },
    after: { track: input.toTrack, stage: input.toStage, programStatus: input.toProgramStatus },
    metadata: { sourceType: input.sourceType, reason: input.reason, transitionId: transition.id },
  });

  return transition;
}

export async function getStudentTrackHistory(studentId: string) {
  return prisma.trackTransition.findMany({
    where: { studentId },
    orderBy: { effectiveAt: "asc" },
    include: { actor: { select: { id: true, name: true, role: true } } },
  });
}
