import { CalendarClock, CircleCheck, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "cn";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/jobs/status";

// Full class names so Tailwind finds them; status is never shown by color alone.
const STATUS_STYLES: Record<JobStatus, { icon: LucideIcon; className: string }> = {
  scheduled: { icon: CalendarClock, className: "bg-status-scheduled-bg text-status-scheduled" },
  on_site: { icon: Wrench, className: "bg-status-on-site-bg text-status-on-site" },
  done: { icon: CircleCheck, className: "bg-status-done-bg text-status-done" },
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  const { icon: Icon, className } = STATUS_STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      {JOB_STATUS_LABELS[status]}
    </span>
  );
}
