"use client";

import { CircleAlert, Undo2 } from "lucide-react";
import { useActionState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { crewStatusMoves, type StatusMove } from "@/lib/jobs/crew-actions";
import type { JobStatus } from "@/lib/jobs/status";
import { changeJobStatus, type StatusChangeState } from "./actions";

const initialState: StatusChangeState = { error: null };

type StatusButtonsProps = {
  jobId: string;
  status: JobStatus;
};

export function StatusButtons({ jobId, status }: StatusButtonsProps) {
  const [state, formAction, pending] = useActionState(changeJobStatus, initialState);
  const { next, undo } = crewStatusMoves(status);

  // One form per button, so each sends its own target status.
  function moveForm(move: StatusMove, button: ReactNode) {
    return (
      <form action={formAction}>
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="status" value={move.status} />
        {button}
      </form>
    );
  }

  return (
    <div aria-busy={pending} className="flex flex-col gap-2">
      {next &&
        moveForm(
          next,
          <Button type="submit" disabled={pending} className="h-12 w-full text-base">
            {pending ? "Saving…" : next.label}
          </Button>,
        )}
      {undo &&
        moveForm(
          undo,
          <Button type="submit" variant="outline" disabled={pending} className="h-11 w-full text-base">
            <Undo2 aria-hidden />
            {undo.label}
          </Button>,
        )}
      {state.error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          {state.error}
        </p>
      )}
    </div>
  );
}
