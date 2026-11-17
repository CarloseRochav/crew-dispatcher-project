"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readAzureOpenAIEnv } from "@/lib/ai/env";
import { createSummaryClient, SUMMARY_ERROR_MESSAGES, summarizeNotes } from "@/lib/ai/summarize-notes";
import { requireRole } from "@/lib/auth";
import { todayInBusinessZone } from "@/lib/business-time";
import { boardAfterCreate, boardHref, parseBoardFilters } from "@/lib/jobs/board-filters";
import {
  jobCreateSchema,
  jobFormErrors,
  jobUpdateSchema,
  type JobFormField,
} from "@/lib/jobs/job-form";
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

const CREW_GONE: JobFormState = {
  error: null,
  fieldErrors: { crewId: ["That crew no longer exists. Pick another."] },
};

// The return view is user input like any URL, so it goes through the same parser.
function returnFilters(formData: FormData, date: string | undefined) {
  return parseBoardFilters(
    { date, crew: formValue(formData, "returnCrew") },
    todayInBusinessZone(),
  );
}

export async function createJob(_previous: JobFormState, formData: FormData): Promise<JobFormState> {
  await requireRole("dispatcher");

  const parsed = jobCreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: null, fieldErrors: jobFormErrors(parsed.error).fieldErrors };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("jobs").insert(parsed.data.insert);

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) return CREW_GONE;
    return { error: "Could not create the job right now. Try again in a minute." };
  }

  revalidatePath("/board");
  const { date, insert } = parsed.data;
  redirect(boardHref(boardAfterCreate(returnFilters(formData, date), { date, crewId: insert.crew_id })));
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
    if (error.code === FOREIGN_KEY_VIOLATION) return CREW_GONE;
    return { error: "Could not save the job right now. Try again in a minute." };
  }

  // No row matched: a crew or another dispatcher changed it, or it was deleted.
  if (data.length === 0) {
    return { error: "This job changed since you opened it. Close the drawer and open it again." };
  }

  revalidatePath("/board");
  redirect(boardHref(returnFilters(formData, formValue(formData, "returnDate"))));
}

export type JobSummaryState = { error: string | null };

const jobIdSchema = z.uuid();

// The notes are read from the database, not sent by the browser, so the summary
// always matches what is stored and a tampered request cannot inject other text.
export async function summarizeJob(jobId: string): Promise<JobSummaryState> {
  await requireRole("dispatcher");

  const parsedId = jobIdSchema.safeParse(jobId);
  if (!parsedId.success) return { error: SUMMARY_ERROR_MESSAGES.job_gone };

  const env = readAzureOpenAIEnv();
  if (!env) return { error: SUMMARY_ERROR_MESSAGES.not_configured };

  const supabase = await createClient();
  const { data: job, error: readError } = await supabase
    .from("jobs")
    .select("notes")
    .eq("id", parsedId.data)
    .maybeSingle();
  if (readError) return { error: SUMMARY_ERROR_MESSAGES.save_failed };
  if (!job) return { error: SUMMARY_ERROR_MESSAGES.job_gone };

  const result = await summarizeNotes(job.notes, {
    createResponse: createSummaryClient(env),
    deployment: env.AZURE_OPENAI_DEPLOYMENT,
  });
  if (!result.ok) return { error: SUMMARY_ERROR_MESSAGES[result.reason] };

  const { data: saved, error: saveError } = await supabase
    .from("jobs")
    .update({ summary: result.summary })
    .eq("id", parsedId.data)
    .select("id");
  if (saveError) return { error: SUMMARY_ERROR_MESSAGES.save_failed };
  if (saved.length === 0) return { error: SUMMARY_ERROR_MESSAGES.job_gone };

  revalidatePath("/board");
  return { error: null };
}
