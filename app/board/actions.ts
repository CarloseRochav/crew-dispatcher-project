"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { todayInBusinessZone } from "@/lib/business-time";
import { boardHref, parseBoardFilters } from "@/lib/jobs/board-filters";
import { jobFormErrors, jobUpdateSchema, type JobFormField } from "@/lib/jobs/job-form";
import { createClient } from "@/lib/supabase/server";

export type JobFormState = {
  error: string | null;
  fieldErrors?: Partial<Record<JobFormField, string[]>>;
};

const FOREIGN_KEY_VIOLATION = "23503";

function formValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

export async function updateJob(_previous: JobFormState, formData: FormData): Promise<JobFormState> {
  // RLS would block a crew anyway, but silently; this gives a real redirect.
  await requireRole("dispatcher");

  const parsed = jobUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const { fieldErrors, formErrors } = jobFormErrors(parsed.error);
    // jobId and updatedAt are hidden fields: an error there means a tampered or stale form.
    const hiddenFieldError = Boolean(fieldErrors.jobId || fieldErrors.updatedAt || formErrors.length);
    return {
      error: hiddenFieldError ? "This form is out of date. Close the drawer and open the job again." : null,
      fieldErrors,
    };
  }

  const { jobId, updatedAt, update } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .update(update)
    .eq("id", jobId)
    .eq("updated_at", updatedAt)
    .select("id");

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { error: null, fieldErrors: { crewId: ["That crew no longer exists. Pick another."] } };
    }
    return { error: "Could not save the job right now. Try again in a minute." };
  }

  // No row matched: a crew or another dispatcher changed it, or it was deleted.
  if (data.length === 0) {
    return { error: "This job changed since you opened it. Close the drawer and open it again." };
  }

  revalidatePath("/board");
  // The return view is user input like any URL, so it goes through the same parser.
  const returnTo = parseBoardFilters(
    { date: formValue(formData, "returnDate"), crew: formValue(formData, "returnCrew") },
    todayInBusinessZone(),
  );
  redirect(boardHref(returnTo));
}
