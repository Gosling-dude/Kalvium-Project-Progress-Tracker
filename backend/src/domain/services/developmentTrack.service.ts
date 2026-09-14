// Shared A2 / Track B "development loop" logic: deliverable assignment and
// the Growth Coach evaluation gate that decides whether a student advances
// (A2 -> A1, or B -> A) or continues the loop. A2 and Track B share the same
// mechanics but differ in one critical rule enforced here: promoting out of
// A2 goes straight to A1 (video is never repeated), while promoting out of
// Track B always re-enters Track A at Orientation/Video.
import { prisma } from "../../lib/prisma";
import { BusinessRuleError, NotFoundError, ValidationError } from "../../lib/errors";
import { recordTrackTransition } from "./trackTransition.service";
import { recordAuditEvent } from "./audit.service";
import type { GrowthCoachDecision, SubmissionType, VerificationStatus } from "../constants/enums";

export interface DirectDeliverableInput {
  title: string;
  gapAddressed: string;
  whatStudentMustDo: string;
  expectedOutcome: string;
  submissionType: SubmissionType;
  submissionRequired: string;
  submissionDetails?: string;
  verificationCriteria: string;
  estimatedTimeValue: number;
  estimatedTimeUnit: "HOURS" | "DAYS";
}

// A2 is always estimated in hours; Track B always in days, in half-day steps
// (0.5, 1, 1.5, ...) — the actual operational granularity the estimate is
// talked about in, and the only way sumEstimatedTime never has to mix units
// or fractions of a half-day within one student's total.
function assertValidEstimate(track: "A2" | "B", value: number, unit: string) {
  const expectedUnit = track === "A2" ? "HOURS" : "DAYS";
  if (unit !== expectedUnit) {
    throw new ValidationError(
      `Estimated time is in ${unit.toLowerCase()}, but Track ${track} deliverables must be estimated in ${expectedUnit.toLowerCase()}.`,
    );
  }
  if (track === "B") {
    const steps = value / 0.5;
    if (value < 0.5 || Math.abs(steps - Math.round(steps)) > 1e-9) {
      throw new ValidationError("Track B estimated time must be at least 0.5 days, in half-day steps (0.5, 1, 1.5, ...).");
    }
  } else if (value <= 0) {
    throw new ValidationError("Estimated time must be greater than zero.");
  }
}

// Every deliverable is written directly for this one student — there is no
// template library, so the caller always supplies the deliverable's own
// content (spec: every deliverable is unique to the gap it addresses).
export async function assignDeliverable(input: {
  studentId: string;
  track: "A2" | "B";
  dueAt?: Date;
  actorId: string;
  direct: DirectDeliverableInput;
}) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new NotFoundError("Student", input.studentId);

  // Only one deliverable set per A2/Track B stay: once the set has been
  // emailed (see markDeliverableSetEmailed), no more deliverables can be
  // added to it. This is cleared automatically when the student's track
  // actually changes (see recordTrackTransition), so a later stay in A2/B
  // starts a fresh, unlocked set.
  if (student.deliverableEmailSentAt) {
    throw new BusinessRuleError(
      `A deliverable set has already been emailed to this student for Track ${input.track} on ${student.deliverableEmailSentAt.toLocaleDateString()}. ` +
        "Another set can only be assigned once the student moves to a new track stage.",
    );
  }

  assertValidEstimate(input.track, input.direct.estimatedTimeValue, input.direct.estimatedTimeUnit);

  const activeEnrollment = await prisma.cohortEnrollment.findFirst({
    where: { studentId: input.studentId, isActive: true },
  });

  const assignment = await prisma.deliverableAssignment.create({
    data: {
      studentId: input.studentId,
      cohortEnrollmentId: activeEnrollment?.id ?? null,
      title: input.direct.title,
      gapAddressed: input.direct.gapAddressed,
      whatStudentMustDo: input.direct.whatStudentMustDo,
      expectedOutcome: input.direct.expectedOutcome,
      submissionRequired: input.direct.submissionRequired,
      submissionDetails: input.direct.submissionDetails ?? null,
      verificationCriteria: input.direct.verificationCriteria,
      estimatedTimeValue: input.direct.estimatedTimeValue,
      estimatedTimeUnit: input.direct.estimatedTimeUnit,
      track: input.track,
      dueAt: input.dueAt ?? null,
      submissionType: input.direct.submissionType,
      createdById: input.actorId,
    },
  });

  await recordAuditEvent({
    actorId: input.actorId,
    action: "DELIVERABLE_ASSIGNED",
    entityType: "DeliverableAssignment",
    entityId: assignment.id,
    after: { studentId: input.studentId, title: input.direct.title },
  });
  return assignment;
}

// Edits a deliverable's own content — the track itself is never editable
// here (it's fixed by whichever track the student was on when assigned),
// so a changed estimate is still validated against that same track's rule.
export async function updateDeliverableAssignment(
  assignmentId: string,
  input: Partial<DirectDeliverableInput> & { dueAt?: Date | null },
  actorId: string,
) {
  const assignment = await prisma.deliverableAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new NotFoundError("DeliverableAssignment", assignmentId);

  const nextValue = input.estimatedTimeValue ?? assignment.estimatedTimeValue;
  const nextUnit = input.estimatedTimeUnit ?? assignment.estimatedTimeUnit;
  if (input.estimatedTimeValue !== undefined || input.estimatedTimeUnit !== undefined) {
    assertValidEstimate(assignment.track as "A2" | "B", nextValue, nextUnit);
  }

  const updated = await prisma.deliverableAssignment.update({
    where: { id: assignmentId },
    data: {
      title: input.title,
      gapAddressed: input.gapAddressed,
      whatStudentMustDo: input.whatStudentMustDo,
      expectedOutcome: input.expectedOutcome,
      submissionType: input.submissionType,
      submissionRequired: input.submissionRequired,
      submissionDetails: input.submissionDetails,
      verificationCriteria: input.verificationCriteria,
      estimatedTimeValue: input.estimatedTimeValue,
      estimatedTimeUnit: input.estimatedTimeUnit,
      dueAt: input.dueAt,
    },
  });

  await recordAuditEvent({
    actorId,
    action: "DELIVERABLE_UPDATED",
    entityType: "DeliverableAssignment",
    entityId: assignmentId,
    before: assignment,
    after: updated,
  });
  return updated;
}

// A straightforward hard delete — a deliverable is a per-student task, not
// core progression history like a TrackTransition, so unlike Student there
// is no cascading blast radius to worry about. Kept in the audit trail via
// `before` so what existed is still recoverable from history if needed.
export async function deleteDeliverableAssignment(assignmentId: string, actorId: string) {
  const assignment = await prisma.deliverableAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment) throw new NotFoundError("DeliverableAssignment", assignmentId);

  await prisma.deliverableAssignment.delete({ where: { id: assignmentId } });

  await recordAuditEvent({
    actorId,
    action: "DELIVERABLE_DELETED",
    entityType: "DeliverableAssignment",
    entityId: assignmentId,
    before: assignment,
  });
}

// Sum of estimated time across a student's currently-assigned deliverables
// for one track, plus how many are verified — the one progress number shown
// to both Admin and Growth Coach, in the system and in the assignment email.
export async function sumEstimatedTime(studentId: string, track: "A2" | "B") {
  const assignments = await prisma.deliverableAssignment.findMany({
    where: { studentId, track },
    select: { estimatedTimeValue: true, status: true },
  });
  const unit = track === "A2" ? "HOURS" : "DAYS";
  const value = assignments.reduce((sum, a) => sum + a.estimatedTimeValue, 0);
  const verifiedCount = assignments.filter((a) => a.status === "VERIFIED").length;
  return { value, unit, count: assignments.length, verifiedCount };
}

// Called right after the deliverable-assignment email actually sends (see
// deliverable.routes.ts POST /assignments/mark-emailed). Locks in the set —
// assignDeliverable refuses to add more once deliverableEmailSentAt is set —
// and derives one combined deadline from the total estimated time of every
// deliverable currently assigned to this student for this track (not just
// whichever ones happened to be selected for the email), per spec: the
// deadline covers "all the deliverables that is assigned", counted from the
// moment they were actually notified.
export async function markDeliverableSetEmailed(studentId: string, track: "A2" | "B", actorId: string) {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new NotFoundError("Student", studentId);
  if (student.currentTrack !== track) {
    throw new BusinessRuleError(`Student is currently Track ${student.currentTrack}, not ${track}. Refresh before sending this email.`);
  }

  const { value, unit, count } = await sumEstimatedTime(studentId, track);
  if (count === 0) {
    throw new BusinessRuleError("No deliverables are assigned to this student yet — nothing to email.");
  }

  const sentAt = new Date();
  // A2 estimates are in hours; converted at 8 usable hours per day (not
  // 24) — a student can't realistically put in a full 24-hour day.
  const totalDays = unit === "HOURS" ? value / 8 : value;
  const deadline = new Date(sentAt);
  deadline.setDate(deadline.getDate() + Math.ceil(totalDays));

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: { deliverableEmailSentAt: sentAt, deliverableDeadline: deadline },
  });

  await recordAuditEvent({
    actorId,
    action: "DELIVERABLE_SET_EMAILED",
    entityType: "Student",
    entityId: studentId,
    after: { track, deliverableEmailSentAt: sentAt, deliverableDeadline: deadline, totalEstimated: `${value} ${unit.toLowerCase()}` },
  });

  return { deliverableEmailSentAt: updated.deliverableEmailSentAt, deliverableDeadline: updated.deliverableDeadline };
}

export type DeliverableSetStatus = "NO_DELIVERABLES" | "DRAFT" | "ON_TRACK" | "OVERDUE" | "ALL_SUBMITTED" | "COMPLETED";

// One combined status for a student's current A2/Track B deliverable set —
// shown on the Students list and the student's Development tab, to both
// Admin and Growth Coach. Purely derived (never stored) so it's always
// correct against "now" and against whatever the deliverables' statuses
// currently are, without a background job to keep it in sync.
export function deriveDeliverableSetStatus(
  student: { currentTrack: string | null; deliverableEmailSentAt: Date | string | null; deliverableDeadline: Date | string | null },
  allDeliverables: { track: string; status: string }[],
): DeliverableSetStatus | null {
  if (student.currentTrack !== "A2" && student.currentTrack !== "B") return null;
  const deliverables = allDeliverables.filter((d) => d.track === student.currentTrack);
  if (deliverables.length === 0) return "NO_DELIVERABLES";
  if (deliverables.every((d) => d.status === "VERIFIED")) return "COMPLETED";
  if (!student.deliverableEmailSentAt) return "DRAFT";
  if (deliverables.every((d) => d.status === "VERIFIED" || d.status === "SUBMITTED")) return "ALL_SUBMITTED";
  const deadline = student.deliverableDeadline ? new Date(student.deliverableDeadline) : null;
  if (deadline && deadline.getTime() < Date.now()) return "OVERDUE";
  return "ON_TRACK";
}

// Renders assigned deliverables as an HTML table for the assignment email —
// keeps the "table-like structure" requirement as a rendering concern of
// this workflow, not a generic templating system. Includes a total row so
// the estimated time to complete everything assigned is visible in the
// email itself, not just in the app.
export function renderDeliverablesTable(
  assignments: { title: string; gapAddressed: string; whatStudentMustDo: string; expectedOutcome: string; submissionType: string; estimatedTimeValue: number; estimatedTimeUnit: string; dueAt: Date | null }[],
): string {
  const rows = assignments
    .map(
      (a, i) => `<tr>
      <td>${i + 1}</td>
      <td>${a.title}</td>
      <td>${a.gapAddressed}</td>
      <td>${a.whatStudentMustDo}</td>
      <td>${a.expectedOutcome}</td>
      <td>${a.submissionType}</td>
      <td>${a.estimatedTimeValue} ${a.estimatedTimeUnit.toLowerCase()}</td>
      <td>${a.dueAt ? new Date(a.dueAt).toLocaleDateString() : "—"}</td>
    </tr>`,
    )
    .join("");
  const totalValue = assignments.reduce((sum, a) => sum + a.estimatedTimeValue, 0);
  const totalUnit = assignments[0]?.estimatedTimeUnit.toLowerCase() ?? "";
  const totalRow = assignments.length
    ? `<tr><td colspan="6" style="text-align:right"><strong>Total estimated time</strong></td><td colspan="2"><strong>${totalValue} ${totalUnit}</strong></td></tr>`
    : "";
  return `<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%">
    <thead><tr><th>Task No.</th><th>Task</th><th>Gap Addressed</th><th>What You Must Do</th><th>Expected Outcome</th><th>Submission Type</th><th>Estimated Time</th><th>Due</th></tr></thead>
    <tbody>${rows}${totalRow}</tbody>
  </table>`;
}

export async function recordDeliverableSubmission(
  assignmentId: string,
  input: { submissionFromStudent: string },
  actorId: string,
  actorGrowthCoachId?: string | null,
) {
  const assignment = await prisma.deliverableAssignment.findUnique({
    where: { id: assignmentId },
    include: { student: true },
  });
  if (!assignment) throw new NotFoundError("DeliverableAssignment", assignmentId);
  if (actorGrowthCoachId !== undefined && assignment.student.growthCoachId !== actorGrowthCoachId) {
    throw new BusinessRuleError("You can only record submissions for students assigned to you.");
  }
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
  actorGrowthCoachId?: string | null,
) {
  const assignment = await prisma.deliverableAssignment.findUnique({
    where: { id: assignmentId },
    include: { student: true },
  });
  if (!assignment) throw new NotFoundError("DeliverableAssignment", assignmentId);
  // A Growth Coach may only verify deliverables for students assigned to
  // them — Admin (actorGrowthCoachId undefined) is unrestricted (spec 17).
  if (actorGrowthCoachId !== undefined && assignment.student.growthCoachId !== actorGrowthCoachId) {
    throw new BusinessRuleError("You can only verify deliverables for students assigned to you.");
  }
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
  // Present when the caller is logged in as a GROWTH_COACH — forces the
  // evaluation to be recorded under their own identity and restricts them to
  // their own assigned students (spec section 17). Undefined for Admin.
  actorGrowthCoachId?: string | null;
}) {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new NotFoundError("Student", input.studentId);
  if (student.currentTrack !== input.track) {
    throw new BusinessRuleError(
      `Student is currently Track ${student.currentTrack}, not ${input.track}. Refresh before recording this evaluation.`,
    );
  }
  if (input.actorGrowthCoachId !== undefined) {
    if (student.growthCoachId !== input.actorGrowthCoachId) {
      throw new BusinessRuleError("You can only record evaluations for students assigned to you.");
    }
    input.evaluatorGrowthCoachId = input.actorGrowthCoachId ?? undefined;
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

  // Track/status movement always rests with Program Admins (spec: a Growth
  // Coach's own evaluation must never move a student by itself). When an
  // Admin records the evaluation directly, that already is the deliberate
  // Admin action, so it applies immediately as before. When a Growth Coach
  // records it, the routing is computed and stored but held pending — an
  // Admin must call confirmGrowthCoachEvaluationTransition to apply it.
  const recordedByCoach = input.actorGrowthCoachId !== undefined;
  let result = evaluation;
  if (!recordedByCoach) {
    await applyGrowthCoachEvaluationTransition(evaluation, input.actorId);
  } else if (input.decision === "SUFFICIENT") {
    result = await prisma.growthCoachEvaluation.update({
      where: { id: evaluation.id },
      data: { pendingAdminConfirmation: true },
    });
  }

  await recordAuditEvent({
    actorId: input.actorId,
    action: "GROWTH_COACH_DECISION_RECORDED",
    entityType: "GrowthCoachEvaluation",
    entityId: evaluation.id,
    after: { decision: input.decision, track: input.track, pendingAdminConfirmation: result.pendingAdminConfirmation },
  });

  return result;
}

// The A2 vs Track B distinction that must never be collapsed:
//   A2 -> A1 (sufficient) skips video entirely.
//   B  -> A  (sufficient) re-enters Track A at Orientation/Video.
function resolveGrowthCoachRouting(track: "A2" | "B", decision: GrowthCoachDecision) {
  const sufficient = decision === "SUFFICIENT";
  const toTrack = sufficient ? (track === "A2" ? "A1" : "A") : track;
  const toStage = sufficient
    ? track === "A2"
      ? "A1_INTENSIVE"
      : "VIDEO_ASSESSMENT"
    : track === "A2"
      ? "A2_DEVELOPMENT"
      : "B_DEVELOPMENT";
  return { toTrack, toStage } as const;
}

async function applyGrowthCoachEvaluationTransition(
  evaluation: { id: string; studentId: string; track: string; decision: string; feedback: string },
  actorId: string,
  sourceType: "AUTOMATIC" | "MANUAL" = "AUTOMATIC",
) {
  const { toTrack, toStage } = resolveGrowthCoachRouting(evaluation.track as "A2" | "B", evaluation.decision as GrowthCoachDecision);
  await recordTrackTransition({
    studentId: evaluation.studentId,
    toTrack,
    toStage,
    toProgramStatus: "ACTIVE",
    reason: evaluation.feedback,
    sourceType,
    relatedEvaluationType: "GROWTH_COACH_EVALUATION",
    relatedEvaluationId: evaluation.id,
    actorId,
  });
}

// A Program Admin confirming a Growth-Coach-recorded evaluation — the only
// way that evaluation's routing actually moves the student (spec: movement
// rests with Program Admins, never automatic from a Growth Coach's own
// action).
export async function confirmGrowthCoachEvaluationTransition(evaluationId: string, actorId: string) {
  const evaluation = await prisma.growthCoachEvaluation.findUnique({ where: { id: evaluationId } });
  if (!evaluation) throw new NotFoundError("GrowthCoachEvaluation", evaluationId);
  if (!evaluation.pendingAdminConfirmation) {
    throw new BusinessRuleError("This evaluation has no transition awaiting confirmation.");
  }

  await applyGrowthCoachEvaluationTransition(evaluation, actorId, "MANUAL");

  const updated = await prisma.growthCoachEvaluation.update({
    where: { id: evaluationId },
    data: { pendingAdminConfirmation: false, confirmedAt: new Date(), confirmedById: actorId },
  });

  await recordAuditEvent({
    actorId,
    action: "GROWTH_COACH_TRANSITION_CONFIRMED",
    entityType: "GrowthCoachEvaluation",
    entityId: evaluationId,
    after: { track: evaluation.track, decision: evaluation.decision },
  });

  return updated;
}

// Lets an Admin discard a pending Growth-Coach-recorded evaluation without
// moving the student — e.g. they disagree with the coach's assessment and
// will record their own, or will move the student a different way.
export async function dismissGrowthCoachEvaluationTransition(evaluationId: string, actorId: string) {
  const evaluation = await prisma.growthCoachEvaluation.findUnique({ where: { id: evaluationId } });
  if (!evaluation) throw new NotFoundError("GrowthCoachEvaluation", evaluationId);
  if (!evaluation.pendingAdminConfirmation) {
    throw new BusinessRuleError("This evaluation has no transition awaiting confirmation.");
  }

  const updated = await prisma.growthCoachEvaluation.update({
    where: { id: evaluationId },
    data: { pendingAdminConfirmation: false, confirmedAt: new Date(), confirmedById: actorId },
  });

  await recordAuditEvent({
    actorId,
    action: "GROWTH_COACH_TRANSITION_DISMISSED",
    entityType: "GrowthCoachEvaluation",
    entityId: evaluationId,
    after: { track: evaluation.track, decision: evaluation.decision },
  });

  return updated;
}

export async function listPendingGrowthCoachEvaluations() {
  return prisma.growthCoachEvaluation.findMany({
    where: { pendingAdminConfirmation: true },
    include: { student: { select: { id: true, fullName: true } } },
    orderBy: { evaluatedAt: "asc" },
  });
}

// Backs the "send deliverables by email" action — the frontend fetches this
// rendered table and passes it as the email's `deliverables` variable, so
// the table is built once, server-side, from the same data the assignment
// rows actually contain. `ids` lets the admin pick exactly which assigned
// deliverables go in this particular email instead of always sending every
// one currently assigned for the track.
export async function getDeliverablesTableHtml(studentId: string, track: "A2" | "B", ids?: string[]) {
  const assignments = await prisma.deliverableAssignment.findMany({
    where: { studentId, track, id: ids ? { in: ids } : undefined },
    orderBy: { assignedAt: "asc" },
  });
  return renderDeliverablesTable(assignments);
}

export async function listDeliverablesForStudent(studentId: string) {
  return prisma.deliverableAssignment.findMany({
    where: { studentId },
    orderBy: { assignedAt: "asc" },
  });
}

export async function listGrowthCoachEvaluationsForStudent(studentId: string) {
  return prisma.growthCoachEvaluation.findMany({
    where: { studentId },
    orderBy: { evaluatedAt: "desc" },
  });
}
