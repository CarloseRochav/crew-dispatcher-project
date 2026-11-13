import type { Metadata } from "next";
import { Suspense } from "react";
import { SignedInHeader } from "@/components/signed-in-header";
import { requireRole } from "@/lib/auth";
import { addDays, formatDayLabel, todayInBusinessZone } from "@/lib/business-time";
import { NEW_JOB, parseBoardFilters, parseOpenJobId } from "@/lib/jobs/board-filters";
import { getBoardJobs, getCrews, getJob, getJobEvents } from "@/lib/jobs/queries";
import { toTimelineEntry } from "@/lib/jobs/timeline";
import { JOB_STATUSES } from "@/lib/jobs/status";
import { BoardColumn } from "./board-column";
import { BoardFiltersBar } from "./board-filters";
import { JobDrawer, type DrawerContent } from "./job-drawer";
import { LiveBoardUpdates } from "./live-board-updates";

export const metadata: Metadata = {
  title: "Dispatch board · Crew Dispatch",
};

export default function BoardPage({ searchParams }: PageProps<"/board">) {
  return (
    <Suspense fallback={<p className="p-4 text-muted-foreground">Loading…</p>}>
      <DispatcherBoard searchParams={searchParams} />
    </Suspense>
  );
}

async function DispatcherBoard({ searchParams }: Pick<PageProps<"/board">, "searchParams">) {
  // requireRole awaits connection(), so reading the clock below uses the request's time.
  const dispatcher = await requireRole("dispatcher");
  const today = todayInBusinessZone();
  const params = await searchParams;
  const filters = parseBoardFilters(params, today);
  const openJobId = parseOpenJobId(params);
  const editingJobId = openJobId && openJobId !== NEW_JOB ? openJobId : null;
  const [jobs, crews, editingJob, editingJobEvents] = await Promise.all([
    getBoardJobs(filters),
    getCrews(),
    editingJobId ? getJob(editingJobId) : null,
    editingJobId ? getJobEvents(editingJobId) : [],
  ]);
  const drawer: DrawerContent | null =
    openJobId === NEW_JOB
      ? { mode: "create" }
      : editingJobId
        ? { mode: "edit", job: editingJob, history: editingJobEvents.map(toTimelineEntry) }
        : null;

  return (
    <>
      <SignedInHeader title="Dispatch board" name={dispatcher.name} />
      <BoardFiltersBar
        filters={filters}
        crews={crews}
        today={today}
        previousDate={addDays(filters.date, -1)}
        nextDate={addDays(filters.date, 1)}
        dayLabel={formatDayLabel(filters.date)}
      >
        <LiveBoardUpdates />
      </BoardFiltersBar>
      <main className="flex-1 p-4">
        {jobs.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface p-6 text-center text-muted-foreground">
            No jobs for this day and crew. Try another date or crew.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {JOB_STATUSES.map((status) => (
              <BoardColumn
                key={status}
                status={status}
                jobs={jobs.filter((job) => job.status === status)}
                filters={filters}
              />
            ))}
          </div>
        )}
      </main>
      {drawer && <JobDrawer content={drawer} crews={crews} filters={filters} />}
    </>
  );
}
