import { ArrowRight, History } from "lucide-react";
import { JobStatusBadge } from "@/components/job-status-badge";
import type { TimelineChange, TimelineEntry } from "@/lib/jobs/timeline";

// Newest first, as loaded; the drawer reloads it on every live update.
export function JobTimeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="flex gap-2 rounded-lg border border-border bg-surface p-4 text-muted-foreground">
        <History aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>No changes yet. Status changes from the board or a crew&apos;s phone show up here.</span>
      </p>
    );
  }

  return (
    <ol className="flex flex-col">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-1.5 border-b border-border py-3 last:border-b-0">
          <span className="font-medium text-ink">{entry.who}</span>
          <ChangeLine change={entry.change} />
          <time dateTime={entry.at} className="text-muted-foreground">
            {entry.when}
          </time>
        </li>
      ))}
    </ol>
  );
}

function ChangeLine({ change }: { change: TimelineChange }) {
  if (change.kind === "created") {
    return (
      <span className="flex flex-wrap items-center gap-2">
        Created as <JobStatusBadge status={change.status} />
      </span>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2">
      <JobStatusBadge status={change.from} />
      <ArrowRight aria-hidden className="size-4 text-muted-foreground" />
      <span className="sr-only">to</span>
      <JobStatusBadge status={change.to} />
    </span>
  );
}
