// Single source of truth for every "enum-like" string field in the schema.
// SQLite (our local/dev datastore) does not support native Prisma enums, so we
// model them as validated strings instead — this file is what both zod
// validation and the domain services import, so there is exactly one place
// that defines what values are legal.

export const ROLE = ["ADMIN", "TEACHING_NINJA", "GROWTH_COACH"] as const;
export type Role = (typeof ROLE)[number];

export const PROGRAM_STATUS = [
  "ONBOARDING",
  "ACTIVE",
  "GRADUATED",
  "FUTURE_PIPELINE",
  "INACTIVE",
] as const;
export type ProgramStatus = (typeof PROGRAM_STATUS)[number];

export const TRACK = ["A", "A1", "A2", "B"] as const;
export type Track = (typeof TRACK)[number];

export const STAGE = [
  "PROJECT_REVIEW",
  "VIDEO_ASSESSMENT",
  "A2_DEVELOPMENT",
  "B_DEVELOPMENT",
  "A1_INTENSIVE",
  "INTERVIEW",
  "GRADUATION",
  "RE_EVALUATION",
] as const;
export type Stage = (typeof STAGE)[number];

export const COHORT_STATUS = ["ACTIVE", "ARCHIVED", "INACTIVE"] as const;
export type CohortStatus = (typeof COHORT_STATUS)[number];

export const TRANSITION_SOURCE = ["AUTOMATIC", "MANUAL", "OVERRIDE"] as const;
export type TransitionSource = (typeof TRANSITION_SOURCE)[number];

export const RELATED_EVALUATION_TYPE = [
  "PROJECT_REVIEW",
  "VIDEO_ASSESSMENT",
  "GROWTH_COACH_EVALUATION",
  "INTERVIEW",
  "GRADUATION_DECISION",
] as const;
export type RelatedEvaluationType = (typeof RELATED_EVALUATION_TYPE)[number];

export const PROJECT_REVIEW_STATUS = ["DRAFT", "COMPLETED"] as const;
export type ProjectReviewStatus = (typeof PROJECT_REVIEW_STATUS)[number];

export const PROJECT_REVIEW_OUTCOME = ["TRACK_A", "TRACK_B"] as const;
export type ProjectReviewOutcome = (typeof PROJECT_REVIEW_OUTCOME)[number];

export const VIDEO_ASSIGNMENT_STATUS = [
  "ASSIGNED",
  "IN_PROGRESS",
  "EVALUATION_COMPLETE",
] as const;
export type VideoAssignmentStatus = (typeof VIDEO_ASSIGNMENT_STATUS)[number];

export const VIDEO_OUTCOME = ["A1", "A2"] as const;
export type VideoOutcome = (typeof VIDEO_OUTCOME)[number];

export const INTERVIEW_TYPE = ["MOCK", "FINAL", "GAP_CLOSURE", "OTHER"] as const;
export type InterviewType = (typeof INTERVIEW_TYPE)[number];

export const INTERVIEW_STATUS = [
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUS)[number];

export const GROWTH_COACH_CONFIRMATION_STATUS = [
  "NOT_REQUIRED",
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "DECLINED",
  "RESCHEDULE_REQUIRED",
] as const;
export type GrowthCoachConfirmationStatus =
  (typeof GROWTH_COACH_CONFIRMATION_STATUS)[number];

export const INTERVIEW_RESULT = ["ADVANCE", "REPEAT", "FAIL", "INCONCLUSIVE"] as const;
export type InterviewResult = (typeof INTERVIEW_RESULT)[number];

export const BREAK_CAUSE_CATEGORY = [
  "TECHNICAL_DEPTH",
  "COMMUNICATION",
  "OWNERSHIP",
  "SCALING",
  "FAILURE_HANDLING",
  "OTHER",
] as const;
export type BreakCauseCategory = (typeof BREAK_CAUSE_CATEGORY)[number];

export const DELIVERABLE_TRACK = ["A2", "B", "BOTH"] as const;
export type DeliverableTrack = (typeof DELIVERABLE_TRACK)[number];

export const SUBMISSION_TYPE = [
  "LINK",
  "TEXT",
  "REPOSITORY",
  "DOCUMENT_URL",
  "VIDEO_URL",
  "FILE_METADATA",
  "OTHER_URL",
] as const;
export type SubmissionType = (typeof SUBMISSION_TYPE)[number];

export const VERIFICATION_STATUS = ["PENDING", "VERIFIED", "REJECTED"] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUS)[number];

export const DELIVERABLE_STATUS = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "SUBMITTED",
  "VERIFIED",
  "REJECTED",
  "OVERDUE",
] as const;
export type DeliverableStatus = (typeof DELIVERABLE_STATUS)[number];

export const CHECKPOINT_STATUS = ["PENDING", "IN_REVIEW", "PASSED", "FAILED"] as const;
export type CheckpointStatus = (typeof CHECKPOINT_STATUS)[number];

export const GROWTH_COACH_DECISION = ["SUFFICIENT", "NOT_SUFFICIENT"] as const;
export type GrowthCoachDecision = (typeof GROWTH_COACH_DECISION)[number];

export const GRADUATION_DECISION = ["GRADUATE", "NOT_GRADUATE"] as const;
export type GraduationDecisionValue = (typeof GRADUATION_DECISION)[number];

export const FLAG_CATEGORY = [
  "TRANSCRIPT_CONCERN",
  "SUSPICIOUS_SUBMISSION",
  "MANIPULATED_EVIDENCE",
  "PLAGIARISM_CONCERN",
  "OWNERSHIP_CONCERN",
  "INVALID_LINK",
  "UNEXPLAINED_DOCUMENT",
  "OTHER",
] as const;
export type FlagCategory = (typeof FLAG_CATEGORY)[number];

export const FLAG_SEVERITY = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type FlagSeverity = (typeof FLAG_SEVERITY)[number];

export const FLAG_STATUS = ["OPEN", "RESOLVED"] as const;
export type FlagStatus = (typeof FLAG_STATUS)[number];

export const EMAIL_EVENT_STATUS = ["PENDING", "SENT", "PARTIAL", "FAILED"] as const;
export type EmailEventStatus = (typeof EMAIL_EVENT_STATUS)[number];

export const EMAIL_RECIPIENT_STATUS = ["PENDING", "SENT", "FAILED"] as const;
export type EmailRecipientStatus = (typeof EMAIL_RECIPIENT_STATUS)[number];

export const EMAIL_DELIVERY_STATUS = ["SENT", "FAILED"] as const;
export type EmailDeliveryStatus = (typeof EMAIL_DELIVERY_STATUS)[number];

export const EMAIL_TEMPLATE_KEY = [
  "TRACK_A_VIDEO_QUESTIONS_ASSIGNED",
  "TRACK_A_VIDEO_RESULT",
  "INTERVIEW_SCHEDULED",
  "INTERVIEW_FEEDBACK",
  "A2_DELIVERABLE_ASSIGNMENT",
  "A2_PROGRESS_RESULT",
  "TRACK_B_DELIVERABLE_ASSIGNMENT",
  "TRACK_B_PROGRESS_RESULT",
  "PROMOTED_TO_TRACK_A",
  "A1_INTERVIEW_SCHEDULE",
  "GRADUATED",
  "NOT_GRADUATED",
  "RE_EVALUATION",
] as const;
export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEY)[number];
