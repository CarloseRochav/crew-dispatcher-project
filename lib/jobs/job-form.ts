import { z } from "zod";
import { businessInstant } from "@/lib/business-time";
import type { TablesInsert, TablesUpdate } from "@/lib/database.types";
import { JOB_STATUSES } from "@/lib/jobs/status";

function requiredText(label: string, max: number) {
  return z
    .string()
    .trim()
    .min(1, { error: `Enter the ${label}` })
    .max(max, { error: `Keep the ${label} under ${max} characters` });
}

// Fields shared by the create and edit forms.
const jobFieldsSchema = z.object({
  customerName: requiredText("customer name", 200),
  address: requiredText("address", 300),
  jobType: requiredText("job type", 100),
  date: z.iso.date({ error: "Pick a date" }),
  // precision -1: hours and minutes only, as <input type="time"> sends them.
  time: z.iso.time({ precision: -1, error: "Pick a time" }),
  // "" is the "Unassigned" option.
  crewId: z.union([z.literal(""), z.uuid()], { error: "Pick a crew from the list" }),
  notes: z.string().trim().max(5000, { error: "Keep the notes under 5000 characters" }),
});

type JobFields = z.output<typeof jobFieldsSchema>;

// Returns z.NEVER after recording the issue when the time does not exist.
function toJobColumns(input: JobFields, ctx: z.RefinementCtx) {
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

  return {
    customer_name: input.customerName,
    address: input.address,
    job_type: input.jobType,
    scheduled_for: scheduledFor.toISOString(),
    crew_id: input.crewId || null,
    notes: input.notes,
  } satisfies TablesInsert<"jobs">;
}

// No status: a new job starts as scheduled (the column default).
export const jobCreateSchema = jobFieldsSchema.transform((input, ctx) => ({
  insert: toJobColumns(input, ctx),
  // The board opens on this day after saving, so the new job is visible.
  date: input.date,
}));

export const jobUpdateSchema = z
  .object({
    jobId: z.uuid(),
    // The version the dispatcher loaded; the save is refused if the job changed since.
    updatedAt: z.iso.datetime({ offset: true }),
    status: z.enum(JOB_STATUSES, { error: "Pick a status from the list" }),
  })
  .extend(jobFieldsSchema.shape)
  .transform((input, ctx) => {
    const update = { ...toJobColumns(input, ctx), status: input.status } satisfies TablesUpdate<"jobs">;
    return { jobId: input.jobId, updatedAt: input.updatedAt, update };
  });

// The edit form has every field the create form has, plus status.
type JobUpdateInput = z.input<typeof jobUpdateSchema>;
export type JobFormField = Exclude<keyof JobUpdateInput, "jobId" | "updatedAt">;

// zod types errors by the transformed output, but every issue path names a form field.
export function jobFormErrors(error: z.ZodError) {
  return z.flattenError(error as z.ZodError<JobUpdateInput>);
}
