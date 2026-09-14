-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthCoach" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "campusId" TEXT,
    "userId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrowthCoach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "campusId" TEXT,
    "growthCoachId" TEXT,
    "currentTrack" TEXT,
    "currentStage" TEXT NOT NULL DEFAULT 'PROJECT_REVIEW',
    "programStatus" TEXT NOT NULL DEFAULT 'ONBOARDING',
    "batch" TEXT,
    "chosenProject" TEXT,
    "resumeLink" TEXT,
    "notes" TEXT,
    "deliverableEmailSentAt" TIMESTAMP(3),
    "deliverableDeadline" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortEnrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackTransition" (
    "id" TEXT NOT NULL,
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
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RubricVersion" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "totalMax" INTEGER NOT NULL DEFAULT 50,
    "threshold" INTEGER NOT NULL DEFAULT 25,
    "dimensions" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RubricVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectReview" (
    "id" TEXT NOT NULL,
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
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectReviewScore" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "ProjectReviewScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoQuestionSet" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoQuestionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoQuestionSetVersion" (
    "id" TEXT NOT NULL,
    "questionSetId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "totalMax" INTEGER NOT NULL DEFAULT 50,
    "threshold" INTEGER NOT NULL DEFAULT 25,
    "mandatoryQuestionKeys" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoQuestionSetVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoQuestion" (
    "id" TEXT NOT NULL,
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

    CONSTRAINT "VideoQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "questionSetVersionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3),
    "totalScore" INTEGER,
    "mandatoryPassed" BOOLEAN,
    "outcome" TEXT,
    "outcomeReason" TEXT,
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoQuestionEvaluation" (
    "id" TEXT NOT NULL,
    "videoAssignmentId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "submitted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "submissionReference" TEXT,
    "evaluated" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "reviewerId" TEXT,
    "notes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoQuestionEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RungLevel" (
    "id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "RungLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "interviewType" TEXT NOT NULL,
    "sequenceNumber" INTEGER NOT NULL DEFAULT 1,
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "interviewerId" TEXT,
    "growthCoachConfirmationStatus" TEXT NOT NULL DEFAULT 'NOT_REQUIRED',
    "chosenProject" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "notes" TEXT,
    "transcriptUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewEvaluation" (
    "id" TEXT NOT NULL,
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
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliverableAssignment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "title" TEXT NOT NULL,
    "gapAddressed" TEXT NOT NULL,
    "whatStudentMustDo" TEXT NOT NULL,
    "expectedOutcome" TEXT NOT NULL,
    "submissionRequired" TEXT NOT NULL,
    "submissionDetails" TEXT,
    "verificationCriteria" TEXT NOT NULL,
    "estimatedTimeValue" DOUBLE PRECISION NOT NULL,
    "estimatedTimeUnit" TEXT NOT NULL,
    "track" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "submissionType" TEXT NOT NULL,
    "submissionFromStudent" TEXT,
    "submittedAt" TIMESTAMP(3),
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "feedback" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliverableAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrowthCoachEvaluation" (
    "id" TEXT NOT NULL,
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
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pendingAdminConfirmation" BOOLEAN NOT NULL DEFAULT false,
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,

    CONSTRAINT "GrowthCoachEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GraduationDecision" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "cohortEnrollmentId" TEXT,
    "decision" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "relatedInterviewIds" TEXT,
    "resultingProgramStatus" TEXT NOT NULL,
    "decidedById" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GraduationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flag" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedToId" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,

    CONSTRAINT "Flag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "variables" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "templateKeySnapshot" TEXT NOT NULL,
    "subjectRendered" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "triggeredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailRecipient" (
    "id" TEXT NOT NULL,
    "emailEventId" TEXT NOT NULL,
    "studentId" TEXT,
    "emailAddress" TEXT NOT NULL,
    "bodyRendered" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "videoAssignmentId" TEXT,
    "interviewId" TEXT,

    CONSTRAINT "EmailRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailDeliveryAttempt" (
    "id" TEXT NOT NULL,
    "emailRecipientId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailDeliveryAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
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
CREATE UNIQUE INDEX "GrowthCoach_userId_key" ON "GrowthCoach"("userId");

-- CreateIndex
CREATE INDEX "GrowthCoach_campusId_idx" ON "GrowthCoach"("campusId");

-- CreateIndex
CREATE UNIQUE INDEX "Cohort_code_key" ON "Cohort"("code");

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
CREATE INDEX "DeliverableAssignment_studentId_idx" ON "DeliverableAssignment"("studentId");

-- CreateIndex
CREATE INDEX "GrowthCoachEvaluation_studentId_idx" ON "GrowthCoachEvaluation"("studentId");

-- CreateIndex
CREATE INDEX "GrowthCoachEvaluation_pendingAdminConfirmation_idx" ON "GrowthCoachEvaluation"("pendingAdminConfirmation");

-- CreateIndex
CREATE INDEX "GraduationDecision_studentId_idx" ON "GraduationDecision"("studentId");

-- CreateIndex
CREATE INDEX "Flag_studentId_idx" ON "Flag"("studentId");

-- CreateIndex
CREATE INDEX "Flag_status_idx" ON "Flag"("status");

-- CreateIndex
CREATE INDEX "Flag_assignedToId_idx" ON "Flag"("assignedToId");

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

-- AddForeignKey
ALTER TABLE "GrowthCoach" ADD CONSTRAINT "GrowthCoach_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthCoach" ADD CONSTRAINT "GrowthCoach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_growthCoachId_fkey" FOREIGN KEY ("growthCoachId") REFERENCES "GrowthCoach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortEnrollment" ADD CONSTRAINT "CohortEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortEnrollment" ADD CONSTRAINT "CohortEnrollment_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortEnrollment" ADD CONSTRAINT "CohortEnrollment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackTransition" ADD CONSTRAINT "TrackTransition_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackTransition" ADD CONSTRAINT "TrackTransition_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackTransition" ADD CONSTRAINT "TrackTransition_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_rubricVersionId_fkey" FOREIGN KEY ("rubricVersionId") REFERENCES "RubricVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReview" ADD CONSTRAINT "ProjectReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectReviewScore" ADD CONSTRAINT "ProjectReviewScore_projectReviewId_fkey" FOREIGN KEY ("projectReviewId") REFERENCES "ProjectReview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoQuestionSetVersion" ADD CONSTRAINT "VideoQuestionSetVersion_questionSetId_fkey" FOREIGN KEY ("questionSetId") REFERENCES "VideoQuestionSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoQuestion" ADD CONSTRAINT "VideoQuestion_questionSetVersionId_fkey" FOREIGN KEY ("questionSetVersionId") REFERENCES "VideoQuestionSetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAssignment" ADD CONSTRAINT "VideoAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAssignment" ADD CONSTRAINT "VideoAssignment_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAssignment" ADD CONSTRAINT "VideoAssignment_questionSetVersionId_fkey" FOREIGN KEY ("questionSetVersionId") REFERENCES "VideoQuestionSetVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoQuestionEvaluation" ADD CONSTRAINT "VideoQuestionEvaluation_videoAssignmentId_fkey" FOREIGN KEY ("videoAssignmentId") REFERENCES "VideoAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoQuestionEvaluation" ADD CONSTRAINT "VideoQuestionEvaluation_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "VideoQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoQuestionEvaluation" ADD CONSTRAINT "VideoQuestionEvaluation_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_interviewerId_fkey" FOREIGN KEY ("interviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewEvaluation" ADD CONSTRAINT "InterviewEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableAssignment" ADD CONSTRAINT "DeliverableAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableAssignment" ADD CONSTRAINT "DeliverableAssignment_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableAssignment" ADD CONSTRAINT "DeliverableAssignment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliverableAssignment" ADD CONSTRAINT "DeliverableAssignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthCoachEvaluation" ADD CONSTRAINT "GrowthCoachEvaluation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthCoachEvaluation" ADD CONSTRAINT "GrowthCoachEvaluation_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthCoachEvaluation" ADD CONSTRAINT "GrowthCoachEvaluation_evaluatorId_fkey" FOREIGN KEY ("evaluatorId") REFERENCES "GrowthCoach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthCoachEvaluation" ADD CONSTRAINT "GrowthCoachEvaluation_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrowthCoachEvaluation" ADD CONSTRAINT "GrowthCoachEvaluation_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraduationDecision" ADD CONSTRAINT "GraduationDecision_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraduationDecision" ADD CONSTRAINT "GraduationDecision_cohortEnrollmentId_fkey" FOREIGN KEY ("cohortEnrollmentId") REFERENCES "CohortEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GraduationDecision" ADD CONSTRAINT "GraduationDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flag" ADD CONSTRAINT "Flag_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailEvent" ADD CONSTRAINT "EmailEvent_triggeredById_fkey" FOREIGN KEY ("triggeredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailRecipient" ADD CONSTRAINT "EmailRecipient_emailEventId_fkey" FOREIGN KEY ("emailEventId") REFERENCES "EmailEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailRecipient" ADD CONSTRAINT "EmailRecipient_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailRecipient" ADD CONSTRAINT "EmailRecipient_videoAssignmentId_fkey" FOREIGN KEY ("videoAssignmentId") REFERENCES "VideoAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailRecipient" ADD CONSTRAINT "EmailRecipient_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailDeliveryAttempt" ADD CONSTRAINT "EmailDeliveryAttempt_emailRecipientId_fkey" FOREIGN KEY ("emailRecipientId") REFERENCES "EmailRecipient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

