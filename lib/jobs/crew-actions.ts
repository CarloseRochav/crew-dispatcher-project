import type { JobStatus } from "@/lib/jobs/status";

export type StatusMove = { status: JobStatus; label: string };

type CrewStatusMoves = {
  // The big button: the job's next step, none once it is done.
  next: StatusMove | null;
  // One step back, for a mistaken tap (Step 7 decision).
  undo: StatusMove | null;
};

// Mirrors the rule in update_job_status; the database still has the final say.
const CREW_STATUS_MOVES: Record<JobStatus, CrewStatusMoves> = {
  scheduled: { next: { status: "on_site", label: "Start job" }, undo: null },
  on_site: {
    next: { status: "done", label: "Mark done" },
    undo: { status: "scheduled", label: "Back to Scheduled" },
  },
  done: { next: null, undo: { status: "on_site", label: "Reopen" } },
};

export function crewStatusMoves(status: JobStatus) {
  return CREW_STATUS_MOVES[status];
}
