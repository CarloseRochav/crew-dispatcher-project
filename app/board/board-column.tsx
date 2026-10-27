import type { BoardFilters } from "@/lib/jobs/board-filters";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/jobs/status";
import type { BoardJob } from "@/lib/jobs/queries";
import { JobCard } from "./job-card";

const EMPTY_MESSAGES: Record<JobStatus, string> = {
  scheduled: "No jobs waiting. Pick another day or crew to see what's planned.",
  on_site: "No crew on site. Jobs move here when a crew taps Start job.",
  done: "Nothing finished yet. Jobs move here when a crew taps Mark done.",
};

type BoardColumnProps = {
  status: JobStatus;
  jobs: BoardJob[];
  filters: BoardFilters;
};

export function BoardColumn({ status, jobs, filters }: BoardColumnProps) {
  const headingId = `column-${status}`;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3 rounded-lg bg-secondary p-3">
      <h2 id={headingId} className="flex items-center justify-between font-semibold text-ink">
        {JOB_STATUS_LABELS[status]}
        <span className="text-sm font-normal text-muted-foreground">{jobs.length}</span>
      </h2>
      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">{EMPTY_MESSAGES[status]}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} filters={filters} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
