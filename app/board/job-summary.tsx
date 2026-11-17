"use client";

import { CircleAlert, FileText, Info, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { summarizeJob } from "./actions";

type JobSummaryProps = {
  jobId: string;
  summary: string;
  // Saving a summary changes the job's updated_at, which would make unsaved
  // Details edits fail to save, so generating waits until they are saved or cancelled.
  hasUnsavedEdits: boolean;
};

export function JobSummary({ jobId, summary, hasUnsavedEdits }: JobSummaryProps) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const hasSummary = summary !== "";

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await summarizeJob(jobId);
      setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {hasSummary ? (
        <div className="flex flex-col gap-2">
          <p className="whitespace-pre-line text-ink">{summary}</p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles aria-hidden className="size-4 shrink-0" />
            Written by AI from the job notes. Check the notes before relying on it.
          </p>
        </div>
      ) : (
        <p className="flex gap-2 rounded-lg border border-border bg-muted p-3 text-sm text-ink">
          <FileText aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>No summary yet. Generate one from the job notes.</span>
        </p>
      )}

      {hasUnsavedEdits && (
        <p role="status" className="flex gap-2 text-sm text-ink">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>Save or cancel your edits in Details first.</span>
        </p>
      )}

      {error && (
        <p role="alert" className="flex items-center gap-2 text-sm text-destructive">
          <CircleAlert aria-hidden className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <Button
        type="button"
        size="lg"
        className="min-h-11 self-start"
        onClick={generate}
        disabled={pending || hasUnsavedEdits}
      >
        <Sparkles aria-hidden />
        {pending ? "Writing summary…" : hasSummary ? "Regenerate summary" : "Generate summary"}
      </Button>
    </div>
  );
}
