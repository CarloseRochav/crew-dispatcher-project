import { z } from "zod";
import { businessInstant } from "@/lib/business-time";
import type { TablesUpdate } from "@/lib/database.types";
import { JOB_STATUSES } from "@/lib/jobs/status";

function requiredText(label: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, { error: `Enter the ${label}` })
    .max(max, { error: `Keep the ${label} under ${max} characters` });
}

const jobFieldsSchema = z.object({
  customerName: requiredText("customer name", 200),
  address: requiredText("address", 300),
  jobType: requiredText("job type", 100),
  date: z.iso.date({ error: "Pick a date" }),
  // precision -1: hours and minutes only, as <input type="time"> sends them.
  time: z.iso.time({ precision: -1, error: "Pick a time" }),
  // "" is the "Unassigned" option.
  crewId: z.union([z.literal(""), z.uuid()], { error: "Pick a crew from the list" }),
  status: z.enum(JOB_STATUSES, { error: "Pick a status from the list" }),
  notes: z.string().trim().max(5000, { error: "Keep the notes under 5000 characters" }),
});

export type JobFormField = keyof z.input<typeof jobFieldsSchema>;

export const jobUpdateSchema = z
  .object({
    jobId: z.uuid(),
    // The version the dispatcher loaded; the save is refused if the job changed since.
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .extend(jobFieldsSchema.shape)
  .transform((input, ctx) => {
    const scheduledFor = businessInstant(input.date, input.time);
    if (!scheduledFor) {
      ctx.issues.push({
        code: "custom",
        message: "That time doesn't exist on this date (clock change). Pick another time.",
        path: ["time"],
        input: input.time,
      });
      return z.NEVER;
    }

    const update = {
      customer_name: input.customerName,
      address: input.address,
      job_type: input.jobType,
      scheduled_for: scheduledFor.toISOString(),
      crew_id: input.crewId || null,
      status: input.status,
      notes: input.notes,
    } satisfies TablesUpdate<"jobs">;

    return { jobId: input.jobId, updatedAt: input.updatedAt, update };
  });

type JobUpdateInput = z.input<typeof jobUpdateSchema>;

// zod types errors by the transformed output, but every issue path names a form field.
export function jobFormErrors(error: z.ZodError) {
  return z.flattenError(error as z.ZodError<JobUpdateInput>);
}
