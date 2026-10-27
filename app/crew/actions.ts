"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { statusChangeSchema } from "@/lib/jobs/status-change";
import { createClient } from "@/lib/supabase/server";

export type StatusChangeState = { error: string | null };

// update_job_status error codes (see the migrations) in words for a crew member.
const STATUS_ERRORS: Record<string, string> = {
  P0002: "This job is no longer on your crew's list. Refresh the page.",
  "22023": "This job's status changed. Refresh to see it.",
  "42501": "You're not on a crew yet. Ask the dispatcher to add you.",
};

export async function changeJobStatus(
  _previous: StatusChangeState,
  formData: FormData,
): Promise<StatusChangeState> {
  await requireRole("crew");

  const parsed = statusChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Something is off with this button. Refresh the page." };
  }

  // Crews never write to jobs directly: the function checks the crew and the step.
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_job_status", {
    p_job_id: parsed.data.jobId,
    p_new_status: parsed.data.status,
  });

  if (error) {
    return { error: STATUS_ERRORS[error.code] ?? "Could not update the job right now. Try again in a minute." };
  }

  revalidatePath("/crew");
  return { error: null };
}
