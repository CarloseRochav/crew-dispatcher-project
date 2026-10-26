import { JobStatusBadge } from "@/components/job-status-badge";
import { formatJobTime } from "@/lib/business-time";
import type { BoardJob } from "@/lib/jobs/queries";

// Four lines at most (spec); everything else belongs in the drawer (Step 6).
export function JobCard({ job }: { job: BoardJob }) {
  return (
    <article className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3">
      <h3 className="truncate font-medium text-ink">{job.customer_name}</h3>
      <p className="truncate text-muted-foreground">{job.address}</p>
      <p className="truncate">
        {job.job_type} · <time dateTime={job.scheduled_for}>{formatJobTime(job.scheduled_for)}</time>
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className={job.crew ? "truncate" : "truncate text-muted-foreground italic"}>
          {job.crew?.name ?? "Unassigned"}
        </span>
        <JobStatusBadge status={job.status} />
      </div>
    </article>
  );
}
