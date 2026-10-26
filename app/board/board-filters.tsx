"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { boardHref, type BoardFilters } from "@/lib/jobs/board-filters";
import type { Crew } from "@/lib/jobs/queries";

type BoardFiltersBarProps = {
  filters: BoardFilters;
  crews: Crew[];
  // Computed on the server so the client never reads the clock.
  today: string;
  previousDate: string;
  nextDate: string;
  dayLabel: string;
};

const fieldClassName =
  "h-9 rounded-lg border border-input bg-surface px-2 text-ink outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function BoardFiltersBar({
  filters,
  crews,
  today,
  previousDate,
  nextDate,
  dayLabel,
}: BoardFiltersBarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function showBoard(next: Partial<BoardFilters>) {
    startTransition(() => router.push(boardHref({ ...filters, ...next })));
  }

  return (
    <div
      aria-busy={pending}
      className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3"
    >
      <div className="flex items-center gap-1">
        <Button asChild variant="outline" size="icon-lg" aria-label="Previous day">
          <Link href={boardHref({ ...filters, date: previousDate })}>
            <ChevronLeft aria-hidden />
          </Link>
        </Button>
        <label className="sr-only" htmlFor="board-date">
          Date
        </label>
        <input
          id="board-date"
          type="date"
          value={filters.date}
          onChange={(event) => event.target.value && showBoard({ date: event.target.value })}
          className={fieldClassName}
        />
        <Button asChild variant="outline" size="icon-lg" aria-label="Next day">
          <Link href={boardHref({ ...filters, date: nextDate })}>
            <ChevronRight aria-hidden />
          </Link>
        </Button>
        {filters.date !== today && (
          <Button asChild variant="ghost" size="lg">
            <Link href={boardHref({ ...filters, date: today })}>Today</Link>
          </Button>
        )}
      </div>

      <span className="font-medium text-ink">{dayLabel}</span>

      <div className="flex items-center gap-2 sm:ml-auto">
        <label htmlFor="board-crew" className="text-sm text-muted-foreground">
          Crew
        </label>
        <select
          id="board-crew"
          value={filters.crew}
          onChange={(event) => showBoard({ crew: event.target.value as BoardFilters["crew"] })}
          className={fieldClassName}
        >
          <option value="all">All crews</option>
          <option value="unassigned">Unassigned</option>
          {crews.map((crew) => (
            <option key={crew.id} value={crew.id}>
              {crew.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
