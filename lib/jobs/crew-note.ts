import { z } from "zod";
import { JOB_STATUSES } from "@/lib/jobs/status";

// Same limit as update_job_status, so a crew sees our message before the database's.
export const CREW_NOTE_MAX_LENGTH = 1000;

export const crewNoteSchema = z.object({
  jobId: z.uuid(),
  // The status the card showed. update_job_status needs a status, and sending a stale one
  // would move the job, so the action refuses the note if the job has moved since.
  status: z.enum(JOB_STATUSES),
  note: z
    .string()
    .trim()
    .min(1, "Write a note first.")
    .max(CREW_NOTE_MAX_LENGTH, `Keep the note under ${CREW_NOTE_MAX_LENGTH} characters.`),
});
