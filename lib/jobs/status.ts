import type { Database } from "@/lib/database.types";

export type JobStatus = Database["public"]["Enums"]["job_status"];

// Column order on the board follows the job's life.
export const JOB_STATUSES = ["scheduled", "on_site", "done"] as const satisfies readonly JobStatus[];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  on_site: "On site",
  done: "Done",
};
