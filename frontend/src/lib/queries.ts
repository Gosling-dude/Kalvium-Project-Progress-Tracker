// Centralized API access — every network call the app makes lives here so
// pages/components never construct requests directly (spec: "centralized
// API handling").
import { api } from "./api";

// Deliberately typed as `any` rather than generic: each call site's
// `useQuery<T>`/`useMutation<T>` annotation supplies the real type, and an
// `any` return here is bivariantly assignable to any of those — trying to
// make `unwrap` itself generic instead produces unresolvable inference
// (axios's default response type is `any`, so T can never be inferred from
// the argument alone).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unwrap = (promise: Promise<{ data: { data: any } }>): Promise<any> => promise.then((res) => res.data.data);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const unwrapFull = (promise: Promise<{ data: any }>): Promise<any> => promise.then((res) => res.data);

// ---- Dashboard ----
export const fetchDashboard = () => unwrap(api.get("/dashboard"));

// ---- Campuses / Growth Coaches ----
export const fetchCampuses = (includeInactive = false) => unwrap(api.get(`/campuses?includeInactive=${includeInactive}`));
export const createCampus = (input: { name: string; code: string }) => unwrap(api.post("/campuses", input));
export const updateCampus = (id: string, input: Record<string, unknown>) => unwrap(api.patch(`/campuses/${id}`, input));

export const fetchGrowthCoaches = (includeInactive = false) => unwrap(api.get(`/growth-coaches?includeInactive=${includeInactive}`));
export const createGrowthCoach = (input: { name: string; email: string; campusId?: string }) => unwrap(api.post("/growth-coaches", input));
export const updateGrowthCoach = (id: string, input: Record<string, unknown>) => unwrap(api.patch(`/growth-coaches/${id}`, input));

// ---- Cohorts ----
export const fetchCohorts = (status?: string) => unwrap(api.get(`/cohorts${status ? `?status=${status}` : ""}`));
export const fetchCohort = (id: string) => unwrap(api.get(`/cohorts/${id}`));
export const createCohort = (input: Record<string, unknown>) => unwrap(api.post("/cohorts", input));
export const updateCohort = (id: string, input: Record<string, unknown>) => unwrap(api.patch(`/cohorts/${id}`, input));
export const enrollStudentInCohort = (cohortId: string, studentId: string, reason?: string) =>
  unwrap(api.post(`/cohorts/${cohortId}/enroll`, { studentId, reason }));
export const bulkEnrollStudents = (cohortId: string, studentIds: string[], reason?: string) =>
  unwrap(api.post(`/cohorts/${cohortId}/bulk-enroll`, { studentIds, reason }));

// ---- Students ----
export interface StudentListParams {
  search?: string;
  cohortId?: string;
  campusId?: string;
  growthCoachId?: string;
  track?: string;
  programStatus?: string;
  hasOpenFlags?: boolean;
  page?: number;
  pageSize?: number;
  sort?: string;
}
export const fetchStudents = (params: StudentListParams) =>
  unwrapFull(api.get("/students", { params }));
export const fetchStudentDetail = (id: string) => unwrap(api.get(`/students/${id}/detail`));
export const createStudent = (input: Record<string, unknown>) => unwrap(api.post("/students", input));
export const updateStudent = (id: string, input: Record<string, unknown>) => unwrap(api.patch(`/students/${id}`, input));

// ---- Project Review ----
export const fetchRubric = () => unwrap(api.get("/project-reviews/rubric"));
export const createProjectReview = (input: Record<string, unknown>) => unwrap(api.post("/project-reviews", input));
export const updateProjectReview = (id: string, input: Record<string, unknown>) => unwrap(api.patch(`/project-reviews/${id}`, input));
export const completeProjectReview = (id: string, input: Record<string, unknown>) => unwrap(api.post(`/project-reviews/${id}/complete`, input));

// ---- Video ----
export const fetchQuestionSets = () => unwrap(api.get("/video/question-sets"));
export const assignVideoQuestionSet = (input: Record<string, unknown>) => unwrap(api.post("/video/assignments", input));
export const fetchVideoAssignmentProgress = (id: string) => unwrap(api.get(`/video/assignments/${id}`));
export const recordVideoSubmission = (assignmentId: string, questionId: string, submissionReference: string) =>
  unwrap(api.post(`/video/assignments/${assignmentId}/questions/${questionId}/submission`, { submissionReference }));
export const recordVideoEvaluation = (assignmentId: string, questionId: string, score: number, notes: string) =>
  unwrap(api.post(`/video/assignments/${assignmentId}/questions/${questionId}/evaluation`, { score, notes }));
export const finalizeVideoAssessment = (assignmentId: string, outcomeReason: string) =>
  unwrap(api.post(`/video/assignments/${assignmentId}/finalize`, { outcomeReason }));

// ---- Interviews ----
export const fetchRungLevels = () => unwrap(api.get("/interviews/rung-levels"));
export const scheduleInterview = (input: Record<string, unknown>) => unwrap(api.post("/interviews", input));
export const updateInterview = (id: string, input: Record<string, unknown>) => unwrap(api.patch(`/interviews/${id}`, input));
export const completeInterview = (id: string, input: Record<string, unknown>) => unwrap(api.post(`/interviews/${id}/complete`, input));
export const recordInterviewEvaluation = (id: string, input: Record<string, unknown>) => unwrap(api.post(`/interviews/${id}/evaluation`, input));

// ---- Deliverables ----
export const fetchDeliverableTemplates = (track?: string) => unwrap(api.get(`/deliverables/templates${track ? `?track=${track}` : ""}`));
export const createDeliverableTemplate = (input: Record<string, unknown>) => unwrap(api.post("/deliverables/templates", input));
export const updateDeliverableTemplate = (id: string, input: Record<string, unknown>) => unwrap(api.patch(`/deliverables/templates/${id}`, input));
export const duplicateDeliverableTemplate = (id: string, newKey: string) => unwrap(api.post(`/deliverables/templates/${id}/duplicate`, { newKey }));
export const archiveDeliverableTemplate = (id: string) => unwrap(api.post(`/deliverables/templates/${id}/archive`));
export const assignDeliverable = (input: Record<string, unknown>) => unwrap(api.post("/deliverables/assignments", input));
export const recordDeliverableSubmission = (id: string, submissionFromStudent: string) =>
  unwrap(api.post(`/deliverables/assignments/${id}/submission`, { submissionFromStudent }));
export const verifyDeliverable = (id: string, input: Record<string, unknown>) => unwrap(api.post(`/deliverables/assignments/${id}/verify`, input));
export const createCheckpoint = (input: Record<string, unknown>) => unwrap(api.post("/deliverables/checkpoints", input));
export const evaluateCheckpoint = (id: string, input: Record<string, unknown>) => unwrap(api.post(`/deliverables/checkpoints/${id}/evaluate`, input));

// ---- Growth Coach Evaluations ----
export const recordGrowthCoachEvaluation = (input: Record<string, unknown>) => unwrap(api.post("/growth-coach-evaluations", input));

// ---- Graduation ----
export const recordGraduationDecision = (input: Record<string, unknown>) => unwrap(api.post("/graduation-decisions", input));

// ---- Flags ----
export const fetchOpenFlags = () => unwrap(api.get("/flags"));
export const createFlag = (input: Record<string, unknown>) => unwrap(api.post("/flags", input));
export const resolveFlag = (id: string, resolutionNote: string) => unwrap(api.post(`/flags/${id}/resolve`, { resolutionNote }));

// ---- Email ----
export const fetchEmailTemplates = () => unwrap(api.get("/email/templates"));
export const updateEmailTemplate = (id: string, input: Record<string, unknown>) => unwrap(api.patch(`/email/templates/${id}`, input));
export const previewEmail = (input: Record<string, unknown>) => unwrap(api.post("/email/preview", input));
export const sendEmail = (input: Record<string, unknown>) => unwrap(api.post("/email/send", input));
export const fetchEmailEvents = (page = 1) => unwrapFull(api.get("/email/events", { params: { page } }));

// ---- Audit ----
export const fetchAudit = (params: { page?: number; entityType?: string; entityId?: string } = {}) =>
  unwrapFull(api.get("/audit", { params }));

// ---- Settings ----
export const fetchAppSettings = () => unwrap(api.get("/settings"));
export const updateAppSetting = (key: string, value: unknown, description?: string) => unwrap(api.put(`/settings/${key}`, { value, description }));
export const fetchRubricVersions = () => unwrap(api.get("/settings/versions/rubrics"));
export const fetchVideoQuestionSetVersions = () => unwrap(api.get("/settings/versions/video-question-sets"));

// ---- Import / Export ----
export const previewStudentImport = (file: File) => {
  const form = new FormData();
  form.append("file", file);
  return unwrap(api.post("/import/students/preview", form, { headers: { "Content-Type": "multipart/form-data" } }));
};
export const commitStudentImport = (rows: unknown[], cohortId?: string) => unwrap(api.post("/import/students/commit", { rows, cohortId }));

// Export endpoints require the Bearer token, so a plain <a href> can't be
// used — fetch as a blob (carrying the auth header via the shared axios
// instance) and trigger the browser's save dialog manually.
export async function downloadExport(path: string, params: Record<string, string | undefined>, filename: string) {
  const res = await api.get(path, { params, responseType: "blob" });
  const url = window.URL.createObjectURL(res.data as Blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
