import { z } from "zod";

export const projectReviewScoreInput = z.object({
  dimensionKey: z.string().min(1),
  score: z.number().int().min(0),
  reason: z.string().max(2000).default(""),
});

export const createProjectReviewSchema = z.object({
  studentId: z.string().min(1),
  rubricVersionId: z.string().optional(),
  scores: z.array(projectReviewScoreInput).min(1),
});

export const updateProjectReviewSchema = z.object({
  scores: z.array(projectReviewScoreInput).min(1),
});

export const completeProjectReviewSchema = z.object({
  scores: z.array(projectReviewScoreInput).min(1).optional(),
  outcomeReason: z.string().min(10, "Provide a specific, evidence-based reason (at least 10 characters)."),
});
