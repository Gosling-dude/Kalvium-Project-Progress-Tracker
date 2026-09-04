// Default seed content for every EmailTemplate key. Kept separate from
// systemSeed.service.ts purely so the (long) copy isn't in the way of the
// seeding logic itself.
export const EMAIL_TEMPLATE_SEED: Record<string, { name: string; subject: string; bodyHtml: string; variables: string[] }> = {
  TRACK_A_VIDEO_QUESTIONS_ASSIGNED: {
    name: "Track A — Video Questions Assigned",
    subject: "Your Track A Video Questions — {{cohortName}}",
    bodyHtml:
      "<p>Hello {{studentName}},</p><p>You have been assigned the 10 Track A video questions for project <strong>{{projectName}}</strong>.</p><p>Please submit your responses by <strong>{{deadline}}</strong>.</p><p>Questions:</p><p>{{questions}}</p><p>Good luck,<br/>Kalvium Project Defence Team</p>",
    variables: ["studentName", "cohortName", "projectName", "deadline", "questions"],
  },
  TRACK_A_VIDEO_RESULT: {
    name: "Track A — Video Assessment Result",
    subject: "Your Video Assessment Result",
    bodyHtml:
      "<p>Hello {{studentName}},</p><p>Your video assessment result: <strong>{{track}}</strong>.</p><p>{{feedback}}</p><p>Next step: {{nextStep}}</p>",
    variables: ["studentName", "track", "feedback", "nextStep"],
  },
  INTERVIEW_SCHEDULED: {
    name: "Interview Scheduled",
    subject: "Your Interview is Scheduled — {{interviewDate}}",
    bodyHtml:
      "<p>Hello {{studentName}},</p><p>Your interview with {{interviewerName}} is scheduled for <strong>{{interviewDate}}</strong>.</p>",
    variables: ["studentName", "interviewerName", "interviewDate"],
  },
  INTERVIEW_FEEDBACK: {
    name: "Interview Feedback",
    subject: "Feedback from Your Interview",
    bodyHtml: "<p>Hello {{studentName}},</p><p>{{feedback}}</p><p>Next step: {{nextStep}}</p>",
    variables: ["studentName", "feedback", "nextStep"],
  },
  A2_DELIVERABLE_ASSIGNMENT: {
    name: "A2 — Deliverables Assigned",
    subject: "Your Development Plan — Track A2",
    bodyHtml: "<p>Hello {{studentName}},</p><p>Your development plan includes:</p><p>{{deliverables}}</p><p>Deadline: {{deadline}}</p>",
    variables: ["studentName", "deliverables", "deadline"],
  },
  A2_PROGRESS_RESULT: {
    name: "A2 — Progress Result",
    subject: "Your Track A2 Progress Result",
    bodyHtml: "<p>Hello {{studentName}},</p><p>{{feedback}}</p><p>Next step: {{nextStep}}</p>",
    variables: ["studentName", "feedback", "nextStep"],
  },
  TRACK_B_DELIVERABLE_ASSIGNMENT: {
    name: "Track B — Deliverables Assigned",
    subject: "Your Development Plan — Track B",
    bodyHtml: "<p>Hello {{studentName}},</p><p>Your development plan includes:</p><p>{{deliverables}}</p><p>Deadline: {{deadline}}</p>",
    variables: ["studentName", "deliverables", "deadline"],
  },
  TRACK_B_PROGRESS_RESULT: {
    name: "Track B — Progress Result",
    subject: "Your Track B Progress Result",
    bodyHtml: "<p>Hello {{studentName}},</p><p>{{feedback}}</p><p>Next step: {{nextStep}}</p>",
    variables: ["studentName", "feedback", "nextStep"],
  },
  PROMOTED_TO_TRACK_A: {
    name: "Promoted to Track A",
    subject: "You've Been Promoted to Track A",
    bodyHtml: "<p>Hello {{studentName}},</p><p>Congratulations — you have been promoted to Track A.</p><p>Next step: {{nextStep}}</p>",
    variables: ["studentName", "nextStep"],
  },
  A1_INTERVIEW_SCHEDULE: {
    name: "A1 — Interview Schedule",
    subject: "Your A1 Interview Schedule",
    bodyHtml: "<p>Hello {{studentName}},</p><p>Your interview schedule: {{interviewDate}} with {{interviewerName}}.</p>",
    variables: ["studentName", "interviewDate", "interviewerName"],
  },
  GRADUATED: {
    name: "Graduated",
    subject: "Congratulations — You've Graduated!",
    bodyHtml: "<p>Hello {{studentName}},</p><p>Congratulations on graduating the Kalvium Project Defence program!</p><p>{{feedback}}</p>",
    variables: ["studentName", "feedback"],
  },
  NOT_GRADUATED: {
    name: "Not Graduated",
    subject: "Your Project Defence Result",
    bodyHtml: "<p>Hello {{studentName}},</p><p>{{feedback}}</p><p>Next step: {{nextStep}}</p>",
    variables: ["studentName", "feedback", "nextStep"],
  },
  RE_EVALUATION: {
    name: "Re-evaluation",
    subject: "Your Re-evaluation Plan",
    bodyHtml: "<p>Hello {{studentName}},</p><p>{{feedback}}</p><p>Next step: {{nextStep}}</p>",
    variables: ["studentName", "feedback", "nextStep"],
  },
};
