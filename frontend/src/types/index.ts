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
  campus?: { id: string; name: string } | null;
  activeStudentCount?: number;
}

export interface Student {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  chosenProject: string | null;
  currentTrack: Track | null;
  currentStage: Stage;
  programStatus: ProgramStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  campus?: { id: string; name: string } | null;
  growthCoach?: { id: string; name: string } | null;
  currentCohort?: { id: string; name: string } | null;
  openFlagCount?: number;
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

export interface DashboardSummary {
  tracks: { A: number; A1: number; A2: number; B: number };
  programStatus: Record<ProgramStatus, number>;
  cohorts: { id: string; name: string; activeStudentCount: number }[];
  actionQueue: {
    interviewsUpcoming: number;
    interviewsPendingCompletion: number;
    incompleteVideoEvaluations: number;
    pendingDeliverables: number;
    overdueDeliverables: number;
    activeFlags: number;
    recentTrackChanges7d: number;
    studentsInDevelopmentLoop: number;
    studentsAwaitingGraduationDecision: number;
  };
  stuckStudents: { id: string; fullName: string; currentTrack: Track | null; currentStage: Stage; daysSinceUpdate: number }[];
}
