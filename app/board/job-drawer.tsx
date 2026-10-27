"use client";

import { useRouter } from "next/navigation";
import { JobStatusBadge } from "@/components/job-status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { boardHref, type BoardFilters } from "@/lib/jobs/board-filters";
import type { Crew, JobDetails } from "@/lib/jobs/queries";
import { JobForm } from "./job-form";

type JobDrawerProps = {
  // null: the URL names a job that does not exist (or is hidden by RLS).
  job: JobDetails | null;
  crews: Crew[];
  filters: BoardFilters;
};

// Open while the URL has ?job=; closing removes it and keeps the board's filters.
export function JobDrawer({ job, crews, filters }: JobDrawerProps) {
  const router = useRouter();
  const close = () => router.push(boardHref(filters), { scroll: false });

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {job ? (
          <>
            <SheetHeader className="pr-12">
              <SheetTitle className="flex items-center gap-2 text-lg text-ink">
                <span className="truncate">{job.customer_name}</span>
                <JobStatusBadge status={job.status} />
              </SheetTitle>
              <SheetDescription>Edit the job and save. Times are on the Tijuana clock.</SheetDescription>
            </SheetHeader>
            {/* A new key after every save, so the form starts from the saved values. */}
            <JobForm key={job.updated_at} job={job} crews={crews} filters={filters} onCancel={close} />
          </>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="text-lg text-ink">Job not found</SheetTitle>
              <SheetDescription>It may have been deleted. Close this panel and pick a job on the board.</SheetDescription>
            </SheetHeader>
            <div className="px-4">
              <Button variant="outline" size="lg" onClick={close}>
                Back to the board
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
