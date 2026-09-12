import { describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma";
import { getProgramWideTrackSummary } from "../../src/domain/services/dashboard.service";

let seq = 0;
async function makeStudent(currentTrack: string | null, programStatus: string) {
  seq += 1;
  return prisma.student.create({
    data: {
      fullName: `Student ${seq}`,
      email: `prog-summary-${Date.now()}-${seq}@student.example`,
      currentTrack,
      programStatus,
    },
  });
}

describe("Program-wide track summary — the Students page's since-inception totals", () => {
  it("rolls Track A's sub-tracks up into one Track A count while still reporting A1/A2 separately", async () => {
    await makeStudent("A", "ACTIVE");
    await makeStudent("A1", "ACTIVE");
    await makeStudent("A1", "ACTIVE");
    await makeStudent("A2", "ACTIVE");

    const summary = await getProgramWideTrackSummary();

    expect(summary.trackACount).toBe(4);
    expect(summary.trackABreakdown).toEqual({ unassignedSubTrack: 1, a1: 2, a2: 1 });
  });

  it("counts a graduated student only under Graduated, never also under the track they left", async () => {
    await makeStudent("A1", "GRADUATED");
    await makeStudent("B", "GRADUATED");
    await makeStudent("A1", "ACTIVE");

    const summary = await getProgramWideTrackSummary();

    expect(summary.graduatedCount).toBe(2);
    expect(summary.trackACount).toBe(1);
    expect(summary.trackBCount).toBe(0);
    // Every student lands in exactly one bucket, so the buckets must total.
    expect(
      summary.graduatedCount + summary.trackACount + summary.trackBCount + summary.notOnTrackCount,
    ).toBe(summary.totalStudents);
  });

  it("treats a student with no track yet as not-on-a-track rather than dropping them", async () => {
    await makeStudent(null, "ONBOARDING");
    await makeStudent(null, "FUTURE_PIPELINE");
    await makeStudent("B", "ACTIVE");

    const summary = await getProgramWideTrackSummary();

    expect(summary.notOnTrackCount).toBe(2);
    expect(summary.trackBCount).toBe(1);
    expect(summary.totalStudents).toBe(3);
  });

  it("spans every cohort and every status — it is a since-inception total, not a snapshot of the active intake", async () => {
    const archived = await prisma.cohort.create({
      data: { name: "Archived Cohort", code: `ARCH-${Date.now()}`, status: "ARCHIVED" },
    });
    const active = await prisma.cohort.create({
      data: { name: "Active Cohort", code: `ACT-${Date.now()}`, status: "ACTIVE" },
    });

    // An inactive enrollment in an archived cohort: long gone from every
    // per-cohort dashboard, but still part of the program's history.
    const alumnus = await makeStudent("A2", "GRADUATED");
    await prisma.cohortEnrollment.create({
      data: { cohortId: archived.id, studentId: alumnus.id, isActive: false, endedAt: new Date() },
    });

    const current = await makeStudent("B", "ACTIVE");
    await prisma.cohortEnrollment.create({
      data: { cohortId: active.id, studentId: current.id, isActive: true },
    });

    // Never enrolled anywhere yet — still counted.
    await makeStudent("A1", "ACTIVE");

    const summary = await getProgramWideTrackSummary();

    expect(summary.totalStudents).toBe(3);
    expect(summary.graduatedCount).toBe(1);
    expect(summary.trackBCount).toBe(1);
    expect(summary.trackACount).toBe(1);
  });

  it("reports zeroes rather than throwing when no students exist yet", async () => {
    const summary = await getProgramWideTrackSummary();

    expect(summary).toEqual({
      graduatedCount: 0,
      trackACount: 0,
      trackABreakdown: { unassignedSubTrack: 0, a1: 0, a2: 0 },
      trackBCount: 0,
      notOnTrackCount: 0,
      totalStudents: 0,
    });
  });
});
