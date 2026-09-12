// Aggregates "what needs this account's attention" from existing owned
// entities rather than a generic Task table — a flag has an assignee, an
// interview has an interviewer, a deliverable submission awaits its
// student's Growth Coach. This is the account owner's to-do feed: assignments
// should never have to be discovered manually.
import { prisma } from "../../lib/prisma";
import { getGrowthCoachForUserId } from "./campus.service";
import { listPendingGrowthCoachEvaluations } from "./developmentTrack.service";
import { getStudentTimeline } from "./timeline.service";
import type { Role } from "../constants/enums";

export interface TaskItem {
  type:
    | "FLAG_ASSIGNED"
    | "INTERVIEW_UPCOMING"
    | "DELIVERABLE_ASSIGNED"
    | "DELIVERABLE_AWAITING_REVIEW"
    | "GROWTH_COACH_EVALUATION_PENDING"
    | "STUDENT_TIMELINE_UPDATE";
  title: string;
  detail?: string;
  studentId: string;
  studentName: string;
  entityType: string;
  entityId: string;
  at: Date;
}

// How far back a passive "something changed for your student" notification
// stays visible — there is no "mark as read" concept anywhere in the app, so
// these age out on their own instead of accumulating forever.
const RECENT_ACTIVITY_WINDOW_DAYS = 3;

// Timeline event types surfaced as a Growth Coach's "recent activity" —
// deliberately excludes anything already covered by its own dedicated task
// above (open flags, deliverables not yet verified, upcoming interviews) so
// the feed doesn't just repeat itself; this is for the other significant
// moves in a student's history: track/stage/status changes and the
// evaluation outcomes that drive them.
const RECENT_ACTIVITY_TYPES = new Set([
  "TRACK_TRANSITION",
  "PROJECT_REVIEW_COMPLETED",
  "VIDEO_ASSESSMENT_FINALIZED",
  "INTERVIEW_EVALUATED",
  "GROWTH_COACH_EVALUATION",
  "GRADUATION_DECISION",
]);

export async function listMyTasks(userId: string, role: Role): Promise<TaskItem[]> {
  const tasks: TaskItem[] = [];

  const flags = await prisma.flag.findMany({
    where: { assignedToId: userId, status: "OPEN" },
    include: { student: { select: { id: true, fullName: true } } },
    orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
  });
  for (const f of flags) {
    tasks.push({
      type: "FLAG_ASSIGNED",
      title: `Flag: ${f.title}`,
      detail: `${f.category} · ${f.severity}`,
      studentId: f.studentId,
      studentName: f.student.fullName,
      entityType: "Flag",
      entityId: f.id,
      at: f.createdAt,
    });
  }

  const interviews = await prisma.interview.findMany({
    where: { interviewerId: userId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
    include: { student: { select: { id: true, fullName: true } } },
    orderBy: { scheduledStart: "asc" },
  });
  for (const i of interviews) {
    tasks.push({
      type: "INTERVIEW_UPCOMING",
      title: `Interview #${i.sequenceNumber} (${i.interviewType}) — ${i.student.fullName}`,
      detail: i.scheduledStart ? new Date(i.scheduledStart).toLocaleString() : "Not yet scheduled",
      studentId: i.studentId,
      studentName: i.student.fullName,
      entityType: "Interview",
      entityId: i.id,
      at: i.scheduledStart ?? i.createdAt,
    });
  }

  if (role === "ADMIN") {
    const pending = await listPendingGrowthCoachEvaluations();
    for (const g of pending) {
      tasks.push({
        type: "GROWTH_COACH_EVALUATION_PENDING",
        title: `Confirm transition: ${g.track} ${g.decision} — ${g.student.fullName}`,
        detail: g.feedback,
        studentId: g.studentId,
        studentName: g.student.fullName,
        entityType: "GrowthCoachEvaluation",
        entityId: g.id,
        at: g.evaluatedAt,
      });
    }
  }

  if (role === "GROWTH_COACH") {
    const coach = await getGrowthCoachForUserId(userId);
    if (coach) {
      const [awaitingReview, newlyAssigned, upcomingInterviews, assignedStudents] = await Promise.all([
        prisma.deliverableAssignment.findMany({
          where: { status: "SUBMITTED", student: { growthCoachId: coach.id } },
          include: { student: { select: { id: true, fullName: true } } },
          orderBy: { submittedAt: "asc" },
        }),
        // A deliverable the student hasn't even submitted yet is still
        // something the coach needs to know about — they're the one who
        // tells the student it exists (spec: assignments should never have
        // to be discovered manually, and that includes the coach's side).
        prisma.deliverableAssignment.findMany({
          where: { status: { in: ["NOT_STARTED", "IN_PROGRESS"] }, student: { growthCoachId: coach.id } },
          include: { student: { select: { id: true, fullName: true } } },
          orderBy: { assignedAt: "desc" },
        }),
        // Interviews are scheduled by Admin, not the coach — but the coach
        // still needs to know when one lands for their student, regardless
        // of who the interviewer is (they were never the interviewer).
        prisma.interview.findMany({
          where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] }, student: { growthCoachId: coach.id } },
          include: { student: { select: { id: true, fullName: true } } },
          orderBy: { scheduledStart: "asc" },
        }),
        prisma.student.findMany({ where: { growthCoachId: coach.id }, select: { id: true, fullName: true } }),
      ]);

      for (const d of awaitingReview) {
        tasks.push({
          type: "DELIVERABLE_AWAITING_REVIEW",
          title: `Review deliverable: ${d.title} — ${d.student.fullName}`,
          detail: d.submittedAt ? `Submitted ${new Date(d.submittedAt).toLocaleDateString()}` : undefined,
          studentId: d.studentId,
          studentName: d.student.fullName,
          entityType: "DeliverableAssignment",
          entityId: d.id,
          at: d.submittedAt ?? d.assignedAt,
        });
      }

      for (const d of newlyAssigned) {
        tasks.push({
          type: "DELIVERABLE_ASSIGNED",
          title: `New deliverable assigned: ${d.title} — ${d.student.fullName}`,
          detail: d.dueAt ? `Due ${new Date(d.dueAt).toLocaleDateString()}` : undefined,
          studentId: d.studentId,
          studentName: d.student.fullName,
          entityType: "DeliverableAssignment",
          entityId: d.id,
          at: d.assignedAt,
        });
      }

      for (const i of upcomingInterviews) {
        tasks.push({
          type: "INTERVIEW_UPCOMING",
          title: `Interview #${i.sequenceNumber} (${i.interviewType}) — ${i.student.fullName}`,
          detail: i.scheduledStart ? new Date(i.scheduledStart).toLocaleString() : "Not yet scheduled",
          studentId: i.studentId,
          studentName: i.student.fullName,
          entityType: "Interview",
          entityId: i.id,
          at: i.scheduledStart ?? i.createdAt,
        });
      }

      const cutoff = new Date(Date.now() - RECENT_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
      for (const student of assignedStudents) {
        const events = await getStudentTimeline(student.id);
        for (const e of events) {
          if (!RECENT_ACTIVITY_TYPES.has(e.type)) continue;
          if (new Date(e.at) < cutoff) continue;
          tasks.push({
            type: "STUDENT_TIMELINE_UPDATE",
            title: e.title,
            detail: e.detail,
            studentId: student.id,
            studentName: student.fullName,
            entityType: e.entityType,
            entityId: e.entityId,
            at: new Date(e.at),
          });
        }
      }
    }
  }

  return tasks.sort((a, b) => b.at.getTime() - a.at.getTime());
}
