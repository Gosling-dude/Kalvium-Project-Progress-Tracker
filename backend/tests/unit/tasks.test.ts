import { describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { listMyTasks } from "../../src/domain/services/task.service";
import { assignDeliverable } from "../../src/domain/services/developmentTrack.service";
import { scheduleInterview } from "../../src/domain/services/interview.service";
import { recordTrackTransition } from "../../src/domain/services/trackTransition.service";
import { createCampusCohortStudent, createUser } from "../helpers";
import { testAdminId } from "../setup";

async function makeCoachWithStudent() {
  const coachUser = await createUser("GROWTH_COACH", `coach-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@kalvium.example`);
  const coach = await prisma.growthCoach.create({
    data: { name: "Test Coach", email: `coach-profile-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@kalvium.example`, userId: coachUser.id },
  });
  const { student } = await createCampusCohortStudent(testAdminId);
  await prisma.student.update({ where: { id: student.id }, data: { growthCoachId: coach.id, currentTrack: "A2", currentStage: "A2_DEVELOPMENT", programStatus: "ACTIVE" } });
  return { coachUser, coach, student };
}

const DIRECT_FIELDS = {
  title: "Rebuild the auth module",
  gapAddressed: "Could not explain the login flow under questioning.",
  whatStudentMustDo: "Rebuild the module from scratch without referring to the original.",
  expectedOutcome: "Can explain every line unaided.",
  submissionType: "REPOSITORY" as const,
  submissionRequired: "A GitHub link to the rebuilt module.",
  verificationCriteria: "Live walkthrough with Growth Coach.",
};

describe("Growth Coach task feed — assignments should never have to be discovered manually", () => {
  it("surfaces a newly-assigned deliverable that the student hasn't submitted yet", async () => {
    const { coachUser, student } = await makeCoachWithStudent();

    await assignDeliverable({
      studentId: student.id,
      track: "A2",
      actorId: testAdminId,
      direct: { ...DIRECT_FIELDS, estimatedTimeValue: 6, estimatedTimeUnit: "HOURS" },
    });

    const tasks = await listMyTasks(coachUser.id, "GROWTH_COACH");
    expect(tasks.some((t) => t.type === "DELIVERABLE_ASSIGNED" && t.studentId === student.id)).toBe(true);
  });

  it("surfaces an interview scheduled for the coach's student, even though the coach is never the interviewer", async () => {
    const { coachUser, student } = await makeCoachWithStudent();

    await scheduleInterview({
      studentId: student.id,
      interviewType: "MOCK",
      scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
      interviewerId: testAdminId,
      actorId: testAdminId,
    });

    const tasks = await listMyTasks(coachUser.id, "GROWTH_COACH");
    expect(tasks.some((t) => t.type === "INTERVIEW_UPCOMING" && t.studentId === student.id)).toBe(true);
  });

  it("surfaces a recent track transition as recent activity, but not one outside the window", async () => {
    const { coachUser, student } = await makeCoachWithStudent();

    const recent = await recordTrackTransition({
      studentId: student.id,
      toTrack: "A2",
      toStage: "A2_DEVELOPMENT",
      toProgramStatus: "ACTIVE",
      reason: "Recent manual note for regression coverage.",
      sourceType: "MANUAL",
      actorId: testAdminId,
    });
    // Backdate a second transition well outside the recent-activity window.
    const old = await recordTrackTransition({
      studentId: student.id,
      toTrack: "A2",
      toStage: "A2_DEVELOPMENT",
      toProgramStatus: "ACTIVE",
      reason: "Old manual note that should have aged out by now.",
      sourceType: "MANUAL",
      actorId: testAdminId,
    });
    await prisma.trackTransition.update({
      where: { id: old.id },
      data: { effectiveAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
    });

    const tasks = await listMyTasks(coachUser.id, "GROWTH_COACH");
    const timelineTasks = tasks.filter((t) => t.type === "STUDENT_TIMELINE_UPDATE" && t.entityType === "TrackTransition");
    expect(timelineTasks.some((t) => t.entityId === recent.id)).toBe(true);
    expect(timelineTasks.some((t) => t.entityId === old.id)).toBe(false);
  });

  it("never surfaces another coach's student's activity", async () => {
    const { coachUser } = await makeCoachWithStudent();
    const other = await makeCoachWithStudent();

    await assignDeliverable({
      studentId: other.student.id,
      track: "A2",
      actorId: testAdminId,
      direct: { ...DIRECT_FIELDS, estimatedTimeValue: 6, estimatedTimeUnit: "HOURS" },
    });

    const tasks = await listMyTasks(coachUser.id, "GROWTH_COACH");
    expect(tasks.some((t) => t.studentId === other.student.id)).toBe(false);
  });
});
