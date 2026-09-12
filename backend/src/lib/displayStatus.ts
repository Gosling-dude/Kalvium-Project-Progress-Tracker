// Simplified display status for cohort/roster views (spec section 2) —
// always derived from the cached currentTrack/programStatus, never stored,
// so it can never drift from the actual state-vs-history projection. A
// standalone module (not inside student.service.ts) so cohort.service.ts can
// use it without a circular import between the two services.
export function deriveDisplayStatus(student: { currentTrack: string | null; programStatus: string }): "Onboarded" | "Track A" | "Track B" | "Graduated" {
  if (student.programStatus === "GRADUATED") return "Graduated";
  if (student.currentTrack === null) return "Onboarded";
  if (student.currentTrack === "B") return "Track B";
  return "Track A";
}
