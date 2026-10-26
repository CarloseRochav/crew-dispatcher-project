import type { Metadata } from "next";
import { Suspense } from "react";
import { SignedInHeader } from "@/components/signed-in-header";
import { requireRole } from "@/lib/auth";
import { addDays, formatDayLabel, todayInBusinessZone } from "@/lib/business-time";
import { parseBoardFilters } from "@/lib/jobs/board-filters";
import { getBoardJobs, getCrews } from "@/lib/jobs/queries";
import { JOB_STATUSES } from "@/lib/jobs/status";
import { BoardColumn } from "./board-column";
import { BoardFiltersBar } from "./board-filters";

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
  const filters = parseBoardFilters(await searchParams, today);
  const [jobs, crews] = await Promise.all([getBoardJobs(filters), getCrews()]);

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
      />
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
              />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
