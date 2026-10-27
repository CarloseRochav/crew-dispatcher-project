import { z } from "zod";
import { JOB_STATUSES } from "@/lib/jobs/status";

// Hidden fields from the crew's status buttons: still user input.
export const statusChangeSchema = z.object({
  jobId: z.uuid(),
  status: z.enum(JOB_STATUSES),
});
