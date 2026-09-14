// Seeds the program's baseline reference data (rubric, video question bank,
// rung levels, email templates) plus the bootstrap admin user. Shared by
// prisma/seed.ts (dev/prod bootstrap) and the test suite (tests/setup.ts) so
// both use exactly the same fixtures instead of two copies drifting apart.
import bcrypt from "bcryptjs";
import { prisma } from "../../lib/prisma";
import { PROJECT_REVIEW_RUBRIC_V1, RUNG_LEVELS, TRACK_A_VIDEO_QUESTION_SET_V1 } from "../constants/rubric";
import { EMAIL_TEMPLATE_KEY } from "../constants/enums";
import { EMAIL_TEMPLATE_SEED } from "../constants/emailTemplateSeed";

export async function seedRubric() {
  await prisma.rubricVersion.upsert({
    where: { key: PROJECT_REVIEW_RUBRIC_V1.key },
    create: {
      key: PROJECT_REVIEW_RUBRIC_V1.key,
      name: PROJECT_REVIEW_RUBRIC_V1.name,
      totalMax: PROJECT_REVIEW_RUBRIC_V1.totalMax,
      threshold: PROJECT_REVIEW_RUBRIC_V1.threshold,
      dimensions: JSON.stringify(PROJECT_REVIEW_RUBRIC_V1.dimensions),
    },
    // Dimension text (scoring guidance, criteria) is descriptive metadata for
    // this fixed version key, not a scored policy change, so it's kept in
    // sync on every seed rather than requiring a new RubricVersion row.
    update: {
      totalMax: PROJECT_REVIEW_RUBRIC_V1.totalMax,
      threshold: PROJECT_REVIEW_RUBRIC_V1.threshold,
      dimensions: JSON.stringify(PROJECT_REVIEW_RUBRIC_V1.dimensions),
    },
  });
}

export async function seedVideoQuestionBank() {
  const questionSet = await prisma.videoQuestionSet.upsert({
    where: { key: TRACK_A_VIDEO_QUESTION_SET_V1.key },
    create: { key: TRACK_A_VIDEO_QUESTION_SET_V1.key, name: TRACK_A_VIDEO_QUESTION_SET_V1.name },
    update: {},
  });

  const existingVersion = await prisma.videoQuestionSetVersion.findFirst({
    where: { questionSetId: questionSet.id, versionNumber: 1 },
  });
  if (existingVersion) return;

  await prisma.videoQuestionSetVersion.create({
    data: {
      questionSetId: questionSet.id,
      versionNumber: 1,
      totalMax: TRACK_A_VIDEO_QUESTION_SET_V1.totalMax,
      threshold: TRACK_A_VIDEO_QUESTION_SET_V1.threshold,
      mandatoryQuestionKeys: JSON.stringify(TRACK_A_VIDEO_QUESTION_SET_V1.mandatoryQuestionKeys),
      questions: {
        create: TRACK_A_VIDEO_QUESTION_SET_V1.questions.map((q) => ({
          questionKey: q.key,
          questionNumber: q.questionNumber,
          title: q.title,
          questionText: q.questionText,
          marks: q.marks,
          minTimeSeconds: q.minTimeSeconds,
          listeningCriteria: q.listeningCriteria,
          isMandatory: q.isMandatory,
          order: q.order,
        })),
      },
    },
  });
}

export async function seedRungLevels() {
  const validKeys = RUNG_LEVELS.map((r) => r.key);
  // Removes a stale R5 row left over from the corrected 1-4 rung scale (see
  // rubric.ts) — safe because RungLevel is pure reference data, never
  // referenced by foreign key from InterviewEvaluation (which stores the
  // rung as a plain Int).
  await prisma.rungLevel.deleteMany({ where: { key: { notIn: validKeys } } });
  for (const rung of RUNG_LEVELS) {
    await prisma.rungLevel.upsert({ where: { key: rung.key }, create: rung, update: rung });
  }
}

export async function seedEmailTemplates() {
  for (const key of EMAIL_TEMPLATE_KEY) {
    const def = EMAIL_TEMPLATE_SEED[key];
    await prisma.emailTemplate.upsert({
      where: { key },
      create: { key, name: def.name, subject: def.subject, bodyHtml: def.bodyHtml, variables: JSON.stringify(def.variables) },
      update: {},
    });
  }
}

export async function seedAdminUser(email: string, password: string, name = "Program Admin") {
  const passwordHash = await bcrypt.hash(password, 12);
  return prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, name, role: "ADMIN" },
    update: {},
  });
}

export async function seedBaselineReferenceData() {
  await seedRubric();
  await seedVideoQuestionBank();
  await seedRungLevels();
  await seedEmailTemplates();
}
