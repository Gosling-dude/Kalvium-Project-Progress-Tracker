export type Track = "A" | "A1" | "A2" | "B";
export type ProgramStatus = "ONBOARDING" | "ACTIVE" | "GRADUATED" | "FUTURE_PIPELINE" | "INACTIVE";
export type Stage =
  | "PROJECT_REVIEW"
  | "VIDEO_ASSESSMENT"
  | "A2_DEVELOPMENT"
  | "B_DEVELOPMENT"
  | "A1_INTENSIVE"
  | "INTERVIEW"
  | "GRADUATION"
  | "RE_EVALUATION";

export interface Campus {
  id: string;
  name: string;
  code: string;
  active: boolean;
}

export interface GrowthCoach {
  id: string;
  name: string;
  email: string;
  campusId: string | null;
  userId: string | null;
  active: boolean;
  campus?: { id: string; name: string } | null;
}

export interface Cohort {
  id: string;
  name: string;
  code: string;
  description: string | null;
  status: "ACTIVE" | "ARCHIVED" | "INACTIVE";
  startDate: string | null;
  endDate: string | null;
  activeStudentCount?: number;
}

export type DisplayStatus = "Onboarded" | "Track A" | "Track B" | "Graduated";

export interface Student {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  batch: string | null;
  chosenProject: string | null;
  resumeLink: string | null;
  currentTrack: Track | null;
  currentStage: Stage;
  programStatus: ProgramStatus;
  displayStatus?: DisplayStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  campus?: { id: string; name: string } | null;
  growthCoach?: { id: string; name: string; email?: string } | null;
  currentCohort?: { id: string; name: string } | null;
  openFlagCount?: number;
  // Only meaningful while currentTrack is A2 or B — the current deliverable
  // set's assignment-email timestamp, combined deadline, and derived status
  // (see backend deriveDeliverableSetStatus). Null/undefined otherwise, or
  // before a set has been emailed.
  deliverableEmailSentAt?: string | null;
  deliverableDeadline?: string | null;
  deliverableSetStatus?: DeliverableSetStatus | null;
}

export type DeliverableSetStatus = "NO_DELIVERABLES" | "DRAFT" | "ON_TRACK" | "OVERDUE" | "ALL_SUBMITTED" | "COMPLETED";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "GROWTH_COACH";
  active?: boolean;
}

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
  at: string;
}

export interface CohortDashboard {
  trackACount: number;
  trackBCount: number;
  graduatedCount: number;
  unassignedCount: number;
  trackABreakdown: { unassignedSubTrack: number; a1: number; a2: number };
  totalActiveStudents: number;
}

// Same shape of question as CohortDashboard, but for the whole program: all
// cohorts, every student ever on the Project Defence track, no date window.
// Track A rolls up its sub-tracks and graduated students are excluded from the
// track counts, exactly as in CohortDashboard.
export interface ProgramTrackSummary {
  graduatedCount: number;
  trackACount: number;
  trackABreakdown: { unassignedSubTrack: number; a1: number; a2: number };
  trackBCount: number;
  notOnTrackCount: number;
  totalStudents: number;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Flag {
  id: string;
  studentId: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  status: "OPEN" | "RESOLVED";
  createdAt: string;
  createdBy?: { id: string; name: string };
  assignedTo?: { id: string; name: string } | null;
  resolvedBy?: { id: string; name: string } | null;
  resolutionNote?: string | null;
  student?: { id: string; fullName: string; email: string };
}

export interface TimelineEvent {
  at: string;
  type: string;
  title: string;
  detail?: string;
  actor?: string | null;
  entityType: string;
  entityId: string;
}

