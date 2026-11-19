"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { CREW_NOTE_MAX_LENGTH, crewNoteSchema } from "@/lib/jobs/crew-note";
import { statusChangeSchema } from "@/lib/jobs/status-change";
import { createClient } from "@/lib/supabase/server";

export type StatusChangeState = { error: string | null };

// update_job_status error codes (see the migrations) in words for a crew member.
const STATUS_ERRORS: Record<string, string> = {
  P0002: "This job is no longer on your crew's list. Refresh the page.",
  "22023": "This job's status changed. Refresh to see it.",
  "42501": "You're not on a crew yet. Ask the dispatcher to add you.",
};

const NOTE_ERRORS: Record<string, string> = {
  ...STATUS_ERRORS,
  "22023": "This job's status changed. Refresh, then add your note again.",
  "22001": `Keep the note under ${CREW_NOTE_MAX_LENGTH} characters.`,
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

export type CrewNoteState = { error: string | null; saved: boolean };

export async function addCrewNote(_previous: CrewNoteState, formData: FormData): Promise<CrewNoteState> {
  await requireRole("crew");

  const parsed = crewNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const noteError = parsed.error.issues.find((issue) => issue.path[0] === "note");
    return { error: noteError?.message ?? "Something is off with this form. Refresh the page.", saved: false };
  }

  const supabase = await createClient();

  // update_job_status always sets a status. If the dispatcher moved the job after this card
  // loaded, re-sending the card's status would quietly move it back, so refuse instead.
  // A change landing between this read and the call below is not caught (see the Step 16 plan).
  const { data: job, error: readError } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", parsed.data.jobId)
    .maybeSingle();

  if (readError) {
    return { error: "Could not save the note right now. Try again in a minute.", saved: false };
  }
  if (!job) {
    return { error: STATUS_ERRORS.P0002, saved: false };
  }
  if (job.status !== parsed.data.status) {
    return { error: "This job's status changed. Refresh, then add your note again.", saved: false };
  }

  const { error } = await supabase.rpc("update_job_status", {
    p_job_id: parsed.data.jobId,
    p_new_status: parsed.data.status,
    p_note: parsed.data.note,
  });

  if (error) {
    return {
      error: NOTE_ERRORS[error.code] ?? "Could not save the note right now. Try again in a minute.",
      saved: false,
    };
  }

  revalidatePath("/crew");
  return { error: null, saved: true };
}
