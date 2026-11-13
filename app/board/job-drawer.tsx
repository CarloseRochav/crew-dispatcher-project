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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Crew, JobDetails } from "@/lib/jobs/queries";
import type { TimelineEntry } from "@/lib/jobs/timeline";
import { JobForm } from "./job-form";
import { JobTimeline } from "./job-timeline";

export type DrawerContent =
  | { mode: "create" }
  // job null: the URL names a job that does not exist (or is hidden by RLS).
  | { mode: "edit"; job: JobDetails | null; history: TimelineEntry[] };

type JobDrawerProps = {
  content: DrawerContent;
  crews: Crew[];
  filters: BoardFilters;
};

// Open while the URL has ?job=; closing removes it and keeps the board's filters.
export function JobDrawer({ content, crews, filters }: JobDrawerProps) {
  const router = useRouter();
  const close = () => router.push(boardHref(filters), { scroll: false });

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {content.mode === "create" ? (
          <>
            <SheetHeader className="pr-12">
              <SheetTitle className="text-lg text-ink">New job</SheetTitle>
              <SheetDescription>
                Fill in the job and pick a time. It starts as Scheduled. Times are on the Tijuana clock.
              </SheetDescription>
            </SheetHeader>
            <JobForm key="new" job={null} crews={crews} filters={filters} onCancel={close} />
          </>
        ) : content.job ? (
          <>
            <SheetHeader className="pr-12">
              <SheetTitle className="flex items-center gap-2 text-lg text-ink">
                <span className="truncate">{content.job.customer_name}</span>
                <JobStatusBadge status={content.job.status} />
              </SheetTitle>
              <SheetDescription>Edit the job and save. Times are on the Tijuana clock.</SheetDescription>
            </SheetHeader>
            {/* Keyed by job so another job opens on Details. Not in the URL: date, crew and job are enough to share. */}
            <Tabs key={content.job.id} defaultValue="details" className="flex-1">
              <TabsList className="mx-4 h-10 w-auto">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              {/* forceMount keeps the form alive on the History tab, so switching never loses unsaved edits;
                  the inactive panel is only hidden. */}
              <TabsContent value="details" forceMount className="flex flex-col data-[state=inactive]:hidden">
                {/* Keyed by id, not updated_at: a live refresh must not wipe what the dispatcher is typing.
                    A save closes the drawer, so the next open starts from the saved values. */}
                <JobForm
                  key={content.job.id}
                  job={content.job}
                  crews={crews}
                  filters={filters}
                  onCancel={close}
                />
              </TabsContent>
              <TabsContent value="history" className="px-4 pb-4">
                <JobTimeline entries={content.history} />
              </TabsContent>
            </Tabs>
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
