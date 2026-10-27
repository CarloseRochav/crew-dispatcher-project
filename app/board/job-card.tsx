import Link from "next/link";
import { JobStatusBadge } from "@/components/job-status-badge";
import { formatJobTime } from "@/lib/business-time";
import { boardHref, type BoardFilters } from "@/lib/jobs/board-filters";
import type { BoardJob } from "@/lib/jobs/queries";

type JobCardProps = {
  job: BoardJob;
  filters: BoardFilters;
};

// Four lines at most (spec); everything else belongs in the drawer.
export function JobCard({ job, filters }: JobCardProps) {
  return (
    <Link
      href={boardHref(filters, job.id)}
      scroll={false}
      className="block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <article className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-primary">
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
    </Link>
  );
}
