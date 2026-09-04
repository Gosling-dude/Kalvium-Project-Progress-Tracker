-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Campus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GrowthCoach" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "campusId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GrowthCoach_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "campusId" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Cohort_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "campusId" TEXT,
    "growthCoachId" TEXT,
    "currentTrack" TEXT NOT NULL DEFAULT 'A',
    "currentStage" TEXT NOT NULL DEFAULT 'PROJECT_REVIEW',
    "programStatus" TEXT NOT NULL DEFAULT 'ONBOARDING',
    "chosenProject" TEXT,
    "resumeReference" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_growthCoachId_fkey" FOREIGN KEY ("growthCoachId") REFERENCES "GrowthCoach" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Student_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CohortEnrollment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CohortEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CohortEnrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CohortEnrollment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrackTransition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "fromTrack" TEXT,
    "toTrack" TEXT NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "fromProgramStatus" TEXT,
    "toProgramStatus" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "overrideReason" TEXT,
    "relatedEvaluationType" TEXT,
    "relatedEvaluationId" TEXT,
    "notes" TEXT,
    "actorId" TEXT NOT NULL,
    "effectiveAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrackTransition_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrackTransition_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TrackTransition_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RubricVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "totalMax" INTEGER NOT NULL DEFAULT 50,
    "threshold" INTEGER NOT NULL DEFAULT 25,
    "dimensions" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ProjectReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "rubricVersionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "thresholdPassed" BOOLEAN,
    "mandatoryPassed" BOOLEAN,
    "outcome" TEXT,
    "outcomeReason" TEXT,
    "triggeredMandatoryFailures" TEXT,
    "reviewedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProjectReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectReview_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProjectReview_rubricVersionId_fkey" FOREIGN KEY ("rubricVersionId") REFERENCES "RubricVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProjectReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProjectReviewScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectReviewId" TEXT NOT NULL,
    "dimensionKey" TEXT NOT NULL,
    "dimensionLabel" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL DEFAULT 5,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "mandatoryMin" INTEGER,
    "mandatoryPass" BOOLEAN,
    "reason" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProjectReviewScore_projectReviewId_fkey" FOREIGN KEY ("projectReviewId") REFERENCES "ProjectReview" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoQuestionSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "VideoQuestionSetVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionSetId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "totalMax" INTEGER NOT NULL DEFAULT 50,
    "threshold" INTEGER NOT NULL DEFAULT 25,
    "mandatoryQuestionKeys" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VideoQuestionSetVersion_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "VideoQuestionSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionSetVersionId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "questionNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "marks" INTEGER NOT NULL DEFAULT 5,
    "minTimeSeconds" INTEGER,
    "listeningCriteria" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "VideoQuestion_questionSetVersionId_fkey" FOREIGN KEY ("questionSetVersionId") REFERENCES "VideoQuestionSetVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "questionSetVersionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" DATETIME,
    "totalScore" INTEGER,
    "mandatoryPassed" BOOLEAN,
    "outcome" TEXT,
    "outcomeReason" TEXT,
    "finalizedAt" DATETIME,
    "finalizedById" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VideoAssignment_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "VideoAssignment_questionSetVersionId_fkey" FOREIGN KEY ("questionSetVersionId") REFERENCES "VideoQuestionSetVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VideoQuestionEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "videoAssignmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" DATETIME,
    "submissionReference" TEXT,
    "evaluated" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "reviewerId" TEXT,
    "notes" TEXT,
    "reviewedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "VideoQuestionEvaluation_videoAssignmentId_fkey" FOREIGN KEY ("videoAssignmentId") REFERENCES "VideoAssignment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VideoQuestionEvaluation_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "VideoQuestion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VideoQuestionEvaluation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RungLevel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "level" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "interviewType" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL DEFAULT 1,
    "scheduledStart" DATETIME,
    "scheduledEnd" DATETIME,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "interviewerId" TEXT,
    "growthCoachConfirmationStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "chosenProject" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "actualStart" DATETIME,
    "actualEnd" DATETIME,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Interview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Interview_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Interview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InterviewEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "interviewId" TEXT NOT NULL,
    "highestRungHeld" INTEGER,
    "breakRung" INTEGER,
    "breakCauseCategory" TEXT,
    "breakCauseNotes" TEXT,
    "evidence" TEXT,
    "communicationRating" INTEGER,
    "prescription" TEXT,
    "strengths" TEXT,
    "weaknesses" TEXT,
    "overallFeedback" TEXT NOT NULL,
    "result" TEXT,
    "evaluatorId" TEXT NOT NULL,
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "InterviewEvaluation_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "InterviewEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliverableTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "gapAddressed" TEXT NOT NULL,
    "whatStudentMustDo" TEXT NOT NULL,
    "expectedOutcome" TEXT NOT NULL,
    "submissionType" TEXT NOT NULL,
    "submissionRequired" BOOLEAN NOT NULL DEFAULT true,
    "submissionDetails" TEXT,
    "verificationCriteria" TEXT NOT NULL,
    "estimatedTime" TEXT,
    "track" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DeliverableAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "templateId" TEXT NOT NULL,
    "templateSnapshot" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "checkpointId" TEXT,
    "assignedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" DATETIME,
    "submissionType" TEXT NOT NULL,
    "submissionFromStudent" TEXT,
    "submittedAt" DATETIME,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedAt" DATETIME,
    "verifiedById" TEXT,
    "feedback" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeliverableAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliverableAssignment_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliverableAssignment_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DeliverableTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliverableAssignment_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "Checkpoint" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliverableAssignment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "DeliverableAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "track" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "dueAt" DATETIME,
    "expectedEvidence" TEXT,
    "whatWillBeChecked" TEXT,
    "expectedProgress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "evaluationNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Checkpoint_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Checkpoint_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GrowthCoachEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "track" TEXT NOT NULL,
    "completion" INTEGER,
    "quality" INTEGER,
    "evidence" TEXT,
    "demonstratedImprovement" INTEGER,
    "understanding" INTEGER,
    "ownership" INTEGER,
    "abilityToExplain" INTEGER,
    "foundationalGapsAddressed" BOOLEAN,
    "decision" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "evaluatorId" TEXT,
    "recordedById" TEXT NOT NULL,
    "evaluatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GrowthCoachEvaluation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GrowthCoachEvaluation_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GrowthCoachEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "GrowthCoach" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GrowthCoachEvaluation_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GraduationDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "decision" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "relatedInterviewIds" TEXT,
    "resultingProgramStatus" TEXT NOT NULL,
    "decidedById" TEXT NOT NULL,
    "decidedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GraduationDecision_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "GraduationDecision_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "GraduationDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Flag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "resolutionNote" TEXT,
    CONSTRAINT "Flag_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Flag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Flag_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "variables" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT,
    "templateKeySnapshot" TEXT NOT NULL,
    "subjectRendered" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "triggeredById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailEvent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailEvent_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailRecipient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailEventId" TEXT NOT NULL,
    "studentId" TEXT,
    "emailAddress" TEXT NOT NULL,
    "bodyRendered" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" DATETIME,
    "videoAssignmentId" TEXT,
    "interviewId" TEXT,
    CONSTRAINT "EmailRecipient_emailEventId_fkey" FOREIGN KEY ("emailEventId") REFERENCES "EmailEvent" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "EmailRecipient_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailRecipient_videoAssignmentId_fkey" FOREIGN KEY ("videoAssignmentId") REFERENCES "VideoAssignment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EmailRecipient_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailDeliveryAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailRecipientId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "attemptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailDeliveryAttempt_emailRecipientId_fkey" FOREIGN KEY ("emailRecipientId") REFERENCES "EmailRecipient" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Campus_code_key" ON "Campus"("code");

-- CreateIndex
CREATE UNIQUE INDEX "GrowthCoach_email_key" ON "GrowthCoach"("email");

-- CreateIndex
CREATE INDEX "GrowthCoach_campusId_idx" ON "GrowthCoach"("campusId");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_code_key" ON "Cohort"("code");

-- CreateIndex
CREATE INDEX "Cohort_campusId_idx" ON "Cohort"("campusId");

-- CreateIndex
CREATE INDEX "Cohort_status_idx" ON "Cohort"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE INDEX "Student_campusId_idx" ON "Student"("campusId");

-- CreateIndex
CREATE INDEX "Student_growthCoachId_idx" ON "Student"("growthCoachId");

-- CreateIndex
CREATE INDEX "Student_currentTrack_idx" ON "Student"("currentTrack");

-- CreateIndex
CREATE INDEX "Student_programStatus_idx" ON "Student"("programStatus");

-- CreateIndex
CREATE INDEX "CohortEnrollment_studentId_idx" ON "CohortEnrollment"("studentId");

-- CreateIndex
CREATE INDEX "CohortEnrollment_cohortId_idx" ON "CohortEnrollment"("cohortId");

-- CreateIndex
CREATE INDEX "CohortEnrollment_studentId_isActive_idx" ON "CohortEnrollment"("studentId", "isActive");

-- CreateIndex
CREATE INDEX "TrackTransition_studentId_idx" ON "TrackTransition"("studentId");

-- CreateIndex
CREATE INDEX "TrackTransition_cohortEnrollmentId_idx" ON "TrackTransition"("cohortEnrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "RubricVersion_key_key" ON "RubricVersion"("key");

-- CreateIndex
CREATE INDEX "ProjectReview_studentId_idx" ON "ProjectReview"("studentId");

-- CreateIndex
CREATE INDEX "ProjectReviewScore_projectReviewId_idx" ON "ProjectReviewScore"("projectReviewId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoQuestionSet_key_key" ON "VideoQuestionSet"("key");

-- CreateIndex
CREATE UNIQUE INDEX "VideoQuestionSetVersion_questionSetId_versionNumber_key" ON "VideoQuestionSetVersion"("questionSetId", "versionNumber");

-- CreateIndex
CREATE INDEX "VideoQuestion_questionSetVersionId_idx" ON "VideoQuestion"("questionSetVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoQuestion_questionSetVersionId_questionKey_key" ON "VideoQuestion"("questionSetVersionId", "questionKey");

-- CreateIndex
CREATE INDEX "VideoAssignment_studentId_idx" ON "VideoAssignment"("studentId");

-- CreateIndex
CREATE INDEX "VideoQuestionEvaluation_videoAssignmentId_idx" ON "VideoQuestionEvaluation"("videoAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoQuestionEvaluation_videoAssignmentId_questionId_key" ON "VideoQuestionEvaluation"("videoAssignmentId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "RungLevel_level_key" ON "RungLevel"("level");

-- CreateIndex
CREATE UNIQUE INDEX "RungLevel_key_key" ON "RungLevel"("key");

-- CreateIndex
CREATE INDEX "Interview_studentId_idx" ON "Interview"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewEvaluation_interviewId_key" ON "InterviewEvaluation"("interviewId");

-- CreateIndex
CREATE INDEX "InterviewEvaluation_interviewId_idx" ON "InterviewEvaluation"("interviewId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliverableTemplate_key_key" ON "DeliverableTemplate"("key");

-- CreateIndex
CREATE INDEX "DeliverableAssignment_studentId_idx" ON "DeliverableAssignment"("studentId");

-- CreateIndex
CREATE INDEX "DeliverableAssignment_checkpointId_idx" ON "DeliverableAssignment"("checkpointId");

-- CreateIndex
CREATE INDEX "Checkpoint_studentId_idx" ON "Checkpoint"("studentId");

-- CreateIndex
CREATE INDEX "GrowthCoachEvaluation_studentId_idx" ON "GrowthCoachEvaluation"("studentId");

-- CreateIndex
CREATE INDEX "GraduationDecision_studentId_idx" ON "GraduationDecision"("studentId");

-- CreateIndex
CREATE INDEX "Flag_studentId_idx" ON "Flag"("studentId");

-- CreateIndex
CREATE INDEX "Flag_status_idx" ON "Flag"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_key_key" ON "EmailTemplate"("key");

-- CreateIndex
CREATE INDEX "EmailRecipient_emailEventId_idx" ON "EmailRecipient"("emailEventId");

-- CreateIndex
CREATE INDEX "EmailRecipient_studentId_idx" ON "EmailRecipient"("studentId");

-- CreateIndex
CREATE INDEX "EmailDeliveryAttempt_emailRecipientId_idx" ON "EmailDeliveryAttempt"("emailRecipientId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");
