import { z } from "zod";

// Same limit as update_job_status, so a crew sees our message before the database's.
export const CREW_NOTE_MAX_LENGTH = 1000;

// No status field: the note goes to update_job_status without one, which keeps the
// job's current status (Step 17), so a stale card cannot move the job.
export const crewNoteSchema = z.object({
  jobId: z.uuid(),
  note: z
    .string()
    .trim()
    .min(1, "Write a note first.")
    .max(CREW_NOTE_MAX_LENGTH, `Keep the note under ${CREW_NOTE_MAX_LENGTH} characters.`),
});
