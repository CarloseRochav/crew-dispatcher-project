"use client";

import { CircleAlert, CircleCheck } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CREW_NOTE_MAX_LENGTH } from "@/lib/jobs/crew-note";
import type { JobStatus } from "@/lib/jobs/status";
import { addCrewNote, type CrewNoteState } from "./actions";

const initialState: CrewNoteState = { error: null, saved: false };

type CrewNoteFormProps = {
  jobId: string;
  status: JobStatus;
};

export function CrewNoteForm({ jobId, status }: CrewNoteFormProps) {
  // Controlled, so a failed save keeps what the crew typed; cleared only after a save.
  const [note, setNote] = useState("");
  const [state, formAction, pending] = useActionState(async (previous: CrewNoteState, formData: FormData) => {
    const result = await addCrewNote(previous, formData);
    if (result.saved) setNote("");
    return result;
  }, initialState);
  const fieldId = useId();
  const messageId = `${fieldId}-message`;

  return (
    <details className="rounded-lg border border-border px-3">
      <summary className="flex min-h-11 cursor-pointer items-center font-medium text-ink">Add a note</summary>
      <form action={formAction} className="flex flex-col gap-2 pb-3">
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="status" value={status} />
        <Label htmlFor={fieldId} className="text-muted-foreground">
          The dispatcher sees it on the job. It is added under the existing notes.
        </Label>
        <Textarea
          id={fieldId}
          name="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={CREW_NOTE_MAX_LENGTH}
          rows={3}
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error || state.saved ? messageId : undefined}
          className="text-base md:text-base"
        />
        <Button type="submit" variant="outline" disabled={pending} className="h-11 w-full text-base">
          {pending ? "Saving…" : "Save note"}
        </Button>
        {state.error && (
          <p id={messageId} role="alert" className="flex items-center gap-2 text-sm text-destructive">
            <CircleAlert aria-hidden className="size-4 shrink-0" />
            {state.error}
          </p>
        )}
        {state.saved && !state.error && (
          <p id={messageId} role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheck aria-hidden className="size-4 shrink-0" />
            Note added.
          </p>
        )}
      </form>
    </details>
  );
}
