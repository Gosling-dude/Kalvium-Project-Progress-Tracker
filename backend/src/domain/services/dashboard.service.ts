import { prisma } from "../../lib/prisma";

const STUCK_DAYS_THRESHOLD = 14;

// This is the operational dashboard's data source: every number here answers
// a specific "what needs my attention" question rather than being decorative.
// See spec section 6/68.
export async function getDashboardSummary() {
  const now = new Date();
  const stuckSince = new Date(now.getTime() - STUCK_DAYS_THRESHOLD * 24 * 60 * 60 * 1000);

  const [
    byTrack,
    byProgramStatus,
    cohortCounts,
    upcomingInterviews,
    pendingInterviews,
    incompleteVideoEvaluations,
    pendingDeliverables,
    overdueDeliverables,
    activeFlags,
    recentTrackChanges,
    stuckStudents,
    pendingGrowthCoachDecisions,
    pendingGraduationDecisions,
  ] = await Promise.all([
    prisma.student.groupBy({ by: ["currentTrack"], _count: true }),
    prisma.student.groupBy({ by: ["programStatus"], _count: true }),
    prisma.cohort.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, _count: { select: { enrollments: { where: { isActive: true } } } } },
    }),
    prisma.interview.count({ where: { status: "SCHEDULED", scheduledStart: { gte: now } } }),
    prisma.interview.count({ where: { status: { in: ["SCHEDULED", "IN_PROGRESS"] }, scheduledStart: { lt: now } } }),
    prisma.videoAssignment.count({ where: { finalizedAt: null } }),
    prisma.deliverableAssignment.count({ where: { status: { in: ["NOT_STARTED", "IN_PROGRESS", "SUBMITTED"] } } }),
    prisma.deliverableAssignment.count({
      where: { status: { notIn: ["VERIFIED"] }, dueAt: { lt: now } },
    }),
    prisma.flag.count({ where: { status: "OPEN" } }),
    prisma.trackTransition.count({ where: { effectiveAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } } }),
    prisma.student.findMany({
      where: { programStatus: "ACTIVE", updatedAt: { lt: stuckSince } },
      select: { id: true, fullName: true, currentTrack: true, currentStage: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
      take: 20,
    }),
    prisma.student.count({ where: { currentTrack: { in: ["A2", "B"] }, programStatus: "ACTIVE" } }),
    prisma.student.count({ where: { currentTrack: "A1", currentStage: "INTERVIEW", programStatus: "ACTIVE" } }),
  ]);

  const trackCounts = Object.fromEntries(byTrack.map((t) => [t.currentTrack, t._count]));
  const statusCounts = Object.fromEntries(byProgramStatus.map((s) => [s.programStatus, s._count]));

  return {
    tracks: { A: trackCounts.A ?? 0, A1: trackCounts.A1 ?? 0, A2: trackCounts.A2 ?? 0, B: trackCounts.B ?? 0 },
    programStatus: {
      ONBOARDING: statusCounts.ONBOARDING ?? 0,
      ACTIVE: statusCounts.ACTIVE ?? 0,
      GRADUATED: statusCounts.GRADUATED ?? 0,
      FUTURE_PIPELINE: statusCounts.FUTURE_PIPELINE ?? 0,
      INACTIVE: statusCounts.INACTIVE ?? 0,
    },
    cohorts: cohortCounts.map((c) => ({ id: c.id, name: c.name, activeStudentCount: c._count.enrollments })),
    actionQueue: {
      interviewsUpcoming: upcomingInterviews,
      interviewsPendingCompletion: pendingInterviews,
      incompleteVideoEvaluations,
      pendingDeliverables,
      overdueDeliverables,
      activeFlags,
      recentTrackChanges7d: recentTrackChanges,
      studentsInDevelopmentLoop: pendingGrowthCoachDecisions,
      studentsAwaitingGraduationDecision: pendingGraduationDecisions,
    },
    stuckStudents: stuckStudents.map((s) => ({
      ...s,
      daysSinceUpdate: Math.floor((now.getTime() - s.updatedAt.getTime()) / (24 * 60 * 60 * 1000)),
    })),
  };
}

// Program-wide track distribution for the Students page: every student ever
// taken through the Project Defence track, across every cohort (active and
// archived), with no date window — deliberately unfiltered so the numbers are
// a since-inception total rather than a snapshot of the current intake.
//
// The grouping rules mirror getCohortDashboard exactly: Track A rolls its
// sub-tracks up (A + A1 + A2), and GRADUATED wins over whatever track the
// student last held so nobody is counted twice. Keeping the two in step is the
// point — these totals should reconcile against the sum of the per-cohort
// dashboards, and they silently wouldn't if either side changed its mind about
// where a graduated Track A student belongs.
export async function getProgramWideTrackSummary() {
  const grouped = await prisma.student.groupBy({
    by: ["currentTrack", "programStatus"],
    _count: true,
  });

  let trackA = 0;
  let trackA1 = 0;
  let trackA2 = 0;
  let trackB = 0;
  let graduated = 0;
  let notOnTrack = 0;
  let total = 0;

  for (const row of grouped) {
    total += row._count;
    if (row.programStatus === "GRADUATED") {
      graduated += row._count;
      continue;
    }
    if (row.currentTrack === null) notOnTrack += row._count;
    else if (row.currentTrack === "A") trackA += row._count;
    else if (row.currentTrack === "A1") trackA1 += row._count;
    else if (row.currentTrack === "A2") trackA2 += row._count;
    else if (row.currentTrack === "B") trackB += row._count;
  }

  return {
    graduatedCount: graduated,
    trackACount: trackA + trackA1 + trackA2,
    trackABreakdown: { unassignedSubTrack: trackA, a1: trackA1, a2: trackA2 },
    trackBCount: trackB,
    notOnTrackCount: notOnTrack,
    totalStudents: total,
  };
}
