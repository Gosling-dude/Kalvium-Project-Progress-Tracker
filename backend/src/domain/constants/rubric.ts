// Default Project/Resume Review rubric — PR_RUBRIC_V1.
// Values below are the program's source-of-truth policy (Project Defence Plan)
// and must not be changed here casually: this is the *default* seeded into
// RubricVersion.dimensions as JSON. Future policy changes should create a new
// RubricVersion row rather than mutating this file's meaning retroactively.

export interface RubricDimensionDef {
  key: string;
  label: string;
  maxScore: number;
  mandatory: boolean;
  mandatoryMin: number | null;
  order: number;
}

export const PROJECT_REVIEW_RUBRIC_V1: {
  key: string;
  name: string;
  totalMax: number;
  threshold: number;
  dimensions: RubricDimensionDef[];
} = {
  key: "PR_RUBRIC_V1",
  name: "Project / Resume Review Rubric v1",
  totalMax: 50,
  threshold: 25,
  dimensions: [
    { key: "RESUME_QUALITY", label: "Resume Quality", maxScore: 5, mandatory: false, mandatoryMin: null, order: 1 },
    { key: "PROJECT_PRESENCE", label: "Project Presence", maxScore: 5, mandatory: true, mandatoryMin: 3, order: 2 },
    { key: "PROJECT_DEPTH", label: "Project Depth", maxScore: 5, mandatory: true, mandatoryMin: 3, order: 3 },
    { key: "TECHNICAL_STACK", label: "Technical Stack", maxScore: 5, mandatory: false, mandatoryMin: null, order: 4 },
    { key: "PROJECT_OWNERSHIP", label: "Project Ownership", maxScore: 5, mandatory: true, mandatoryMin: 3, order: 5 },
    { key: "CLAIMS", label: "Claims", maxScore: 5, mandatory: true, mandatoryMin: 3, order: 6 },
    { key: "GITHUB_EVIDENCE", label: "GitHub / Evidence", maxScore: 5, mandatory: true, mandatoryMin: 3, order: 7 },
    { key: "DEPLOYMENT", label: "Deployment", maxScore: 5, mandatory: true, mandatoryMin: 2, order: 8 },
    { key: "ROLE_READINESS", label: "Role Readiness", maxScore: 5, mandatory: false, mandatoryMin: null, order: 9 },
    { key: "IMMEDIATE_CONCERNS", label: "Immediate Concerns", maxScore: 5, mandatory: true, mandatoryMin: 3, order: 10 },
  ],
};

// Default Track A video question bank — TRACK_A_BASE v1.
// Full question text captures what the reviewer must actually listen for
// (per the source plan's emphasis on evidence-based, non-assumption scoring).

export interface VideoQuestionDef {
  key: string;
  questionNumber: number;
  title: string;
  questionText: string;
  marks: number;
  minTimeSeconds: number;
  listeningCriteria: string;
  isMandatory: boolean;
  order: number;
}

// Verbatim from the source Project Defence Plan's "Track A — Video
// Assessment Question Bank": exact question text, "what we're listening for"
// points, and per-question minimum times (converted to seconds).
export const TRACK_A_VIDEO_QUESTION_SET_V1: {
  key: string;
  name: string;
  totalMax: number;
  threshold: number;
  mandatoryQuestionKeys: string[];
  questions: VideoQuestionDef[];
} = {
  key: "TRACK_A_BASE",
  name: "Track A Base Video Question Set v1",
  totalMax: 50,
  threshold: 25,
  mandatoryQuestionKeys: ["Q1", "Q2", "Q4", "Q7", "Q9"],
  questions: [
    {
      key: "Q1",
      questionNumber: 1,
      title: "Project Explanation",
      questionText:
        "Explain, in simple terms, the problem this project solves, who it is built for, and the specific contribution made to it.",
      marks: 5,
      minTimeSeconds: 300,
      listeningCriteria:
        "States the problem/purpose clearly; identifies who the project is for (the user/use case); names their own specific contribution — not just \"I worked on it\".",
      isMandatory: true,
      order: 1,
    },
    {
      key: "Q2",
      questionNumber: 2,
      title: "Architecture",
      questionText:
        "Describe the overall structure of the project — the main components (frontend, backend, database, etc.) and how they connect with one another.",
      marks: 5,
      minTimeSeconds: 300,
      listeningCriteria:
        "Names the main components/layers of the system; explains at a basic level how they connect or communicate; uses correct, consistent terminology for the stack used.",
      isMandatory: true,
      order: 2,
    },
    {
      key: "Q3",
      questionNumber: 3,
      title: "Implementation",
      questionText:
        "Select one core feature of the project and explain how it technically works, including the API, database operation, or code logic involved.",
      marks: 5,
      minTimeSeconds: 300,
      listeningCriteria:
        "Names the specific API/endpoint or database operation involved; explains the basic logic or flow behind that feature; shows exactly where this lives in their own codebase.",
      isMandatory: false,
      order: 3,
    },
    {
      key: "Q4",
      questionNumber: 4,
      title: "Technology Decisions",
      questionText: "Justify the choice of the main technologies or frameworks used in this project.",
      marks: 5,
      minTimeSeconds: 240,
      listeningCriteria:
        "Gives at least one concrete reason — not just \"it's popular\" or \"I know it\"; the reason connects to an actual project need; shows the choice was deliberate, not arbitrary.",
      isMandatory: true,
      order: 4,
    },
    {
      key: "Q5",
      questionNumber: 5,
      title: "Trade-offs",
      questionText:
        "Identify one alternative technology or approach that could have been used instead, and explain why it was not chosen.",
      marks: 5,
      minTimeSeconds: 240,
      listeningCriteria:
        "Names a real, relevant alternative; gives at least one basic trade-off (a pro or con) between the two options; shows an actual choice was weighed, not just one way of doing things.",
      isMandatory: false,
      order: 5,
    },
    {
      key: "Q6",
      questionNumber: 6,
      title: "Project Ownership",
      questionText:
        "State the specific part of the project that was personally built (if it was a team project), and identify exactly where it exists in the codebase.",
      marks: 5,
      minTimeSeconds: 300,
      listeningCriteria:
        "Clearly separates their own contribution from the rest of the team's; can point to specific files, modules, or features personally written; what is said lines up with what's claimed on the resume.",
      isMandatory: false,
      order: 6,
    },
    {
      key: "Q7",
      questionNumber: 7,
      title: "Technical Fundamentals",
      questionText:
        "Select one core technical concept used in the project — such as authentication, APIs, or databases — and explain what it is and why it is needed, in your own words.",
      marks: 5,
      minTimeSeconds: 300,
      listeningCriteria:
        "Explains the concept accurately at a basic level; connects the explanation to the project itself, not just a textbook definition; doesn't lean on buzzwords without being able to explain them.",
      isMandatory: true,
      order: 7,
    },
    {
      key: "Q8",
      questionNumber: 8,
      title: "Scale / Failure",
      questionText:
        "Identify one part of the project that might break or slow down if 1,000 users accessed it at the same time, and explain why.",
      marks: 5,
      minTimeSeconds: 180,
      listeningCriteria:
        "Names one plausible bottleneck or failure point; gives a basic, sensible reason it would be a problem; shows some awareness that things behave differently under real load.",
      isMandatory: false,
      order: 8,
    },
    {
      key: "Q9",
      questionNumber: 9,
      title: "Resume Claims",
      questionText:
        "Select one specific claim or number from the resume related to this project, and explain how it was arrived at.",
      marks: 5,
      minTimeSeconds: 300,
      listeningCriteria:
        "Restates the claim clearly and precisely; explains the basis or method behind the number, even if it's a rough estimate; the explanation is defensible, not just repeated or asserted.",
      isMandatory: true,
      order: 9,
    },
    {
      key: "Q10",
      questionNumber: 10,
      title: "Communication",
      questionText:
        "Summarize the project and the role played in it, as if explaining it to a non-technical interviewer.",
      marks: 5,
      minTimeSeconds: 240,
      listeningCriteria:
        "Stays on topic and reasonably concise; uses simple, clear language with minimal jargon; sounds natural — not like a memorized script being recited.",
      isMandatory: false,
      order: 10,
    },
  ],
};

// Interview rung scale — R1..R4 = Explain, Justify, Tradeoff, Scale & Failure.
// This is the actual scale used in the program's live scoring workbook
// ("Database Ninja Interface" source doc, Interview sheet footnote: "[1]
// Highest rung FULLY held before the break. 1 Explain - 2 Justify - 3
// Tradeoff - 4 Scale & Failure. Target >= 3."), which takes precedence over
// the 5-level R1-R5 ladder described narratively in the program plan doc —
// the workbook is the actual field used to score real interviews.
export const RUNG_LEVELS = [
  { level: 1, key: "R1", label: "Explain", order: 1 },
  { level: 2, key: "R2", label: "Justify", order: 2 },
  { level: 3, key: "R3", label: "Tradeoff", order: 3 },
  { level: 4, key: "R4", label: "Scale & Failure", order: 4 },
] as const;
