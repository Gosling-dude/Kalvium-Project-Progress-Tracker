import jwt from "jsonwebtoken";
import { env } from "../src/config/env";
import { prisma } from "../src/lib/prisma";

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);
}

export async function createUser(role: "ADMIN" | "TEACHING_NINJA" | "GROWTH_COACH", email: string) {
  return prisma.user.create({
    data: { email, passwordHash: "unused-in-tests", name: email.split("@")[0], role },
  });
}

export async function createCampusCohortStudent(actorId: string) {
  const campus = await prisma.campus.create({ data: { name: "Test Campus", code: `TC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` } });
  const cohort = await prisma.cohort.create({ data: { name: "Test Cohort", code: `TCH-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, status: "ACTIVE" } });
  const student = await prisma.student.create({
    data: { fullName: "Test Student", email: `student-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@student.example`, campusId: campus.id, createdById: actorId },
  });
  return { campus, cohort, student };
}

export const FULL_RUBRIC_PASS_SCORES = (dimensionKeys: string[]) =>
  dimensionKeys.map((key) => ({ dimensionKey: key, score: 4, reason: "Strong, specific evidence observed." }));
