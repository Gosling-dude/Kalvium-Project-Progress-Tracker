import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";

export interface TimelineEvent {
  at: Date;
  type: string;
  title: string;
  detail?: string;
  actor?: string | null;
  entityType: string;
  entityId: string;
}

// Assembles the Student 360 timeline entirely from persistent event tables
// (TrackTransition, CohortEnrollment, Flag, EmailRecipient, ...) — never from
// ephemeral frontend state. This is the backbone of the "where is this
// student right now and why" view (spec section 83).
export async function getStudentTimeline(studentId: string): Promise<TimelineEvent[]> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new NotFoundError("Student", studentId);

  const [
    enrollments,
    transitions,
    flags,
    projectReviews,
    videoAssignments,
    interviews,
    deliverables,
    growthCoachEvals,
    graduationDecisions,
    emailRecipients,
  ] = await Promise.all([
    prisma.cohortEnrollment.findMany({ where: { studentId }, include: { cohort: true } }),
    prisma.trackTransition.findMany({ where: { studentId }, include: { actor: true } }),
    prisma.flag.findMany({ where: { studentId }, include: { createdBy: true, resolvedBy: true } }),
    prisma.projectReview.findMany({ where: { studentId }, include: { reviewer: true } }),
    prisma.videoAssignment.findMany({ where: { studentId } }),
    prisma.interview.findMany({ where: { studentId }, include: { evaluation: true, interviewer: true } }),
    prisma.deliverableAssignment.findMany({ where: { studentId } }),
    prisma.growthCoachEvaluation.findMany({ where: { studentId }, include: { recordedBy: true } }),
    prisma.graduationDecision.findMany({ where: { studentId }, include: { decidedBy: true } }),
    prisma.emailRecipient.findMany({ where: { studentId }, include: { emailEvent: { include: { template: true } } } }),
  ]);

  const events: TimelineEvent[] = [
    {
      at: student.createdAt,
      type: "STUDENT_CREATED",
      title: "Student added",
      detail: student.resumeLink ? "Resume link on file at creation." : undefined,
      entityType: "Student",
      entityId: student.id,
    },
  ];

  for (const e of enrollments) {
    events.push({
      at: e.startedAt,
      type: "COHORT_ENROLLED",
      title: `Added to cohort ${e.cohort.name}`,
      detail: e.reason ?? undefined,
      entityType: "CohortEnrollment",
      entityId: e.id,
    });
    if (e.endedAt) {
      events.push({
        at: e.endedAt,
        type: "COHORT_ENDED",
        title: `Left cohort ${e.cohort.name}`,
        entityType: "CohortEnrollment",
        entityId: e.id,
      });
    }
  }

  for (const t of transitions) {
    events.push({
      at: t.effectiveAt,
      type: "TRACK_TRANSITION",
      title: `Moved to Track ${t.toTrack} / ${t.toStage}`,
      detail: t.reason,
      actor: t.actor.name,
      entityType: "TrackTransition",
      entityId: t.id,
    });
  }

  for (const f of flags) {
    events.push({
      at: f.createdAt,
      type: "FLAG_CREATED",
      title: `Flag raised: ${f.title}`,
      detail: `${f.category} (${f.severity})`,
      actor: f.createdBy.name,
      entityType: "Flag",
      entityId: f.id,
    });
    if (f.resolvedAt) {
      events.push({
        at: f.resolvedAt,
        type: "FLAG_RESOLVED",
        title: `Flag resolved: ${f.title}`,
        detail: f.resolutionNote ?? undefined,
        actor: f.resolvedBy?.name,
        entityType: "Flag",
        entityId: f.id,
      });
    }
  }

  for (const pr of projectReviews) {
    events.push({
      at: pr.createdAt,
      type: "PROJECT_REVIEW_STARTED",
      title: "Project/Resume Review started",
      actor: pr.reviewer.name,
      entityType: "ProjectReview",
      entityId: pr.id,
    });
    if (pr.reviewedAt) {
      events.push({
        at: pr.reviewedAt,
        type: "PROJECT_REVIEW_COMPLETED",
        title: `Project/Resume Review completed — ${pr.outcome} (${pr.totalScore}/50)`,
        detail: pr.outcomeReason ?? undefined,
        actor: pr.reviewer.name,
        entityType: "ProjectReview",
        entityId: pr.id,
      });
    }
  }

  for (const v of videoAssignments) {
    events.push({
      at: v.assignedAt,
      type: "VIDEO_QUESTIONS_ASSIGNED",
      title: "Video Questions assigned",
      entityType: "VideoAssignment",
      entityId: v.id,
    });
    if (v.finalizedAt) {
      events.push({
        at: v.finalizedAt,
        type: "VIDEO_ASSESSMENT_FINALIZED",
        title: `Video Assessment completed — ${v.outcome} (${v.totalScore}/50)`,
        detail: v.outcomeReason ?? undefined,
        entityType: "VideoAssignment",
        entityId: v.id,
      });
    }
  }

  for (const i of interviews) {
    events.push({
      // Uses updatedAt (not createdAt) so a reschedule bumps this event to
      // where it belongs in the timeline instead of staying pinned at the
      // original creation time.
      at: i.updatedAt,
      type: "INTERVIEW_SCHEDULED",
      title: `Interview #${i.sequenceNumber} (${i.interviewType}) — ${i.status.replace(/_/g, " ")}`,
      detail: i.scheduledStart
        ? `Scheduled for ${new Date(i.scheduledStart).toLocaleString()} (${i.timezone})`
        : "Not yet scheduled",
      actor: i.interviewer?.name,
      entityType: "Interview",
      entityId: i.id,
    });
    if (i.evaluation) {
      events.push({
        at: i.evaluation.evaluatedAt,
        type: "INTERVIEW_EVALUATED",
        title: `Interview #${i.sequenceNumber} feedback recorded`,
        detail: i.evaluation.overallFeedback,
        entityType: "InterviewEvaluation",
        entityId: i.evaluation.id,
      });
    }
  }

  for (const d of deliverables) {
    events.push({
      at: d.assignedAt,
      type: "DELIVERABLE_ASSIGNED",
      title: `Deliverable assigned: ${d.title}`,
      entityType: "DeliverableAssignment",
      entityId: d.id,
    });
    if (d.submittedAt) {
      events.push({
        at: d.submittedAt,
        type: "DELIVERABLE_SUBMITTED",
        title: `Deliverable submitted: ${d.title}`,
        entityType: "DeliverableAssignment",
        entityId: d.id,
      });
    }
    if (d.verifiedAt) {
      events.push({
        at: d.verifiedAt,
        type: "DELIVERABLE_VERIFIED",
        title: `Deliverable ${d.verificationStatus.toLowerCase()}: ${d.title}`,
        detail: d.feedback ?? undefined,
        entityType: "DeliverableAssignment",
        entityId: d.id,
      });
    }
  }

  for (const g of growthCoachEvals) {
    events.push({
      at: g.evaluatedAt,
      type: "GROWTH_COACH_EVALUATION",
      title: `Growth Coach evaluation (${g.track}): ${g.decision}`,
      detail: g.feedback,
      actor: g.recordedBy.name,
      entityType: "GrowthCoachEvaluation",
      entityId: g.id,
    });
  }

  for (const gd of graduationDecisions) {
    events.push({
      at: gd.decidedAt,
      type: "GRADUATION_DECISION",
      title: gd.decision === "GRADUATE" ? "Graduated" : "Not graduated — Future Pipeline / Re-evaluation",
      detail: gd.reason,
      actor: gd.decidedBy.name,
      entityType: "GraduationDecision",
      entityId: gd.id,
    });
  }

  for (const r of emailRecipients.filter((r) => r.sentAt)) {
    events.push({
      at: r.sentAt as Date,
      type: "EMAIL_SENT",
      title: `Email sent: ${r.emailEvent.template?.name ?? r.emailEvent.templateKeySnapshot}`,
      entityType: "EmailRecipient",
      entityId: r.id,
    });
  }

  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}
