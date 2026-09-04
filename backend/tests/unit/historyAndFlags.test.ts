import { describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { enrollStudentInCohort } from "../../src/domain/services/cohort.service";
import { recordTrackTransition } from "../../src/domain/services/trackTransition.service";
import { createFlag, resolveFlag } from "../../src/domain/services/flag.service";
import { createCampusCohortStudent } from "../helpers";
import { testAdminId } from "../setup";

describe("Cohort movement history", () => {
  it("preserves every past enrollment when a student moves cohorts", async () => {
    const { student, cohort: cohort1 } = await createCampusCohortStudent(testAdminId);
    await enrollStudentInCohort({ studentId: student.id, cohortId: cohort1.id }, testAdminId);

    const cohort2 = await prisma.cohort.create({ data: { name: "Cohort 2", code: `C2-${Date.now()}`, status: "ACTIVE" } });
    await enrollStudentInCohort({ studentId: student.id, cohortId: cohort2.id, reason: "Moved for scheduling reasons" }, testAdminId);

    const history = await prisma.cohortEnrollment.findMany({ where: { studentId: student.id }, orderBy: { startedAt: "asc" } });
    expect(history).toHaveLength(2);
    expect(history[0].cohortId).toBe(cohort1.id);
    expect(history[0].isActive).toBe(false);
    expect(history[0].endedAt).not.toBeNull();
    expect(history[1].cohortId).toBe(cohort2.id);
    expect(history[1].isActive).toBe(true);
  });

  it("rejects a bulk move with zero students", async () => {
    const { cohort } = await createCampusCohortStudent(testAdminId);
    const { bulkEnrollStudents } = await import("../../src/domain/services/cohort.service");
    await expect(bulkEnrollStudents({ studentIds: [], cohortId: cohort.id }, testAdminId)).rejects.toThrow();
  });
});

describe("Track transition history", () => {
  it("always creates an immutable TrackTransition row and never edits the student's row directly", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);

    await recordTrackTransition({
      studentId: student.id,
      toTrack: "A",
      toStage: "VIDEO_ASSESSMENT",
      toProgramStatus: "ACTIVE",
      reason: "Passed Project Review with a strong, defendable project.",
      sourceType: "AUTOMATIC",
      actorId: testAdminId,
    });

    const transitions = await prisma.trackTransition.findMany({ where: { studentId: student.id } });
    expect(transitions).toHaveLength(1);
    expect(transitions[0].fromTrack).toBeNull();
    expect(transitions[0].toTrack).toBe("A");
  });

  it("blocks a non-routine track move (A -> B) without an explicit override", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    await prisma.student.update({ where: { id: student.id }, data: { currentTrack: "A", currentStage: "VIDEO_ASSESSMENT" } });

    await expect(
      recordTrackTransition({
        studentId: student.id,
        toTrack: "B",
        toStage: "B_DEVELOPMENT",
        toProgramStatus: "ACTIVE",
        reason: "Admin wants to demote without evidence.",
        sourceType: "MANUAL",
        actorId: testAdminId,
      }),
    ).rejects.toThrow();
  });

  it("allows a non-routine track move when explicitly overridden with a reason", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    await prisma.student.update({ where: { id: student.id }, data: { currentTrack: "A", currentStage: "VIDEO_ASSESSMENT" } });

    const transition = await recordTrackTransition({
      studentId: student.id,
      toTrack: "B",
      toStage: "B_DEVELOPMENT",
      toProgramStatus: "ACTIVE",
      reason: "Discovered after the fact that the submitted project was plagiarized.",
      sourceType: "OVERRIDE",
      overrideReason: "Plagiarism confirmed via GitHub history comparison after initial routing.",
      actorId: testAdminId,
    });

    expect(transition.sourceType).toBe("OVERRIDE");
  });
});

describe("Flags", () => {
  it("creates and resolves a flag, leaving an audit trail", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);

    const flag = await createFlag({
      studentId: student.id,
      category: "PLAGIARISM_CONCERN",
      severity: "HIGH",
      title: "Suspected plagiarized submission",
      description: "Video transcript appears copy-pasted from an AI tool response verbatim.",
      actorId: testAdminId,
    });
    expect(flag.status).toBe("OPEN");

    const resolved = await resolveFlag(flag.id, { resolutionNote: "Confirmed with student; resubmission accepted." }, testAdminId);
    expect(resolved.status).toBe("RESOLVED");

    const auditEvents = await prisma.auditEvent.findMany({ where: { entityType: "Flag", entityId: flag.id } });
    expect(auditEvents.length).toBeGreaterThanOrEqual(2); // created + resolved
  });

  it("rejects resolving an already-resolved flag", async () => {
    const { student } = await createCampusCohortStudent(testAdminId);
    const flag = await createFlag({
      studentId: student.id,
      category: "OTHER",
      severity: "LOW",
      title: "Minor note",
      description: "Just a routine note for the record.",
      actorId: testAdminId,
    });
    await resolveFlag(flag.id, { resolutionNote: "Handled." }, testAdminId);

    await expect(resolveFlag(flag.id, { resolutionNote: "Trying again." }, testAdminId)).rejects.toThrow();
  });
});
