import { MapPin } from "lucide-react";
import { JobStatusBadge } from "@/components/job-status-badge";
import { formatJobTime } from "@/lib/business-time";
import { mapsSearchUrl } from "@/lib/jobs/maps";
import type { CrewDayJob } from "@/lib/jobs/queries";
import { StatusButtons } from "./status-buttons";

// Four lines of job info (spec); notes stay folded so the card stays short.
export function CrewJobCard({ job }: { job: CrewDayJob }) {
  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground">
          <time dateTime={job.scheduled_for}>{formatJobTime(job.scheduled_for)}</time> · {job.job_type}
        </span>
        <JobStatusBadge status={job.status} />
      </div>
      <h2 className="text-lg font-semibold text-ink">{job.customer_name}</h2>
      <a
        href={mapsSearchUrl(job.address)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-11 items-center gap-2 text-primary underline underline-offset-4"
      >
        <MapPin aria-hidden className="size-5 shrink-0" />
        <span>
          {job.address}
          <span className="sr-only"> (opens maps)</span>
        </span>
      </a>
      {job.notes && (
        <details className="rounded-lg bg-secondary px-3">
          <summary className="flex min-h-11 cursor-pointer items-center font-medium text-ink">Notes</summary>
          <p className="pb-3 whitespace-pre-line">{job.notes}</p>
        </details>
      )}
      {/* Keyed by status: a fresh status clears an old error message. */}
      <StatusButtons key={job.status} jobId={job.id} status={job.status} />
    </article>
  );
}
