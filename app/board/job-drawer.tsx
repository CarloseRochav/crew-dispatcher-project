"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { JobSummary } from "./job-summary";
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
            {/* Keyed by job so another job opens on Details with no leftover edit state. */}
            <JobEditTabs
              key={content.job.id}
              job={content.job}
              history={content.history}
              crews={crews}
              filters={filters}
              onClose={close}
            />
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

type JobEditTabsProps = {
  job: JobDetails;
  history: TimelineEntry[];
  crews: Crew[];
  filters: BoardFilters;
  onClose: () => void;
};

// Not in the URL: date, crew and job are enough to share.
function JobEditTabs({ job, history, crews, filters, onClose }: JobEditTabsProps) {
  const [hasUnsavedEdits, setHasUnsavedEdits] = useState(false);
  // The version the form was built from. While the form is untouched it follows
  // live changes (a crew's tap, a new summary), so its save check stays current;
  // once the dispatcher edits, it keeps their version and their typing.
  const [formVersion, setFormVersion] = useState(job.updated_at);
  if (!hasUnsavedEdits && job.updated_at !== formVersion) setFormVersion(job.updated_at);

  return (
    <Tabs defaultValue="details" className="flex-1">
      <TabsList className="mx-4 h-10 w-auto">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      {/* forceMount keeps the form alive on the other tabs, so switching never loses unsaved edits;
          the inactive panel is only hidden. */}
      <TabsContent value="details" forceMount className="flex flex-col data-[state=inactive]:hidden">
        {/* A save closes the drawer, so the next open starts from the saved values. */}
        <JobForm
          key={formVersion}
          job={job}
          crews={crews}
          filters={filters}
          onCancel={onClose}
          onEdit={() => setHasUnsavedEdits(true)}
        />
      </TabsContent>
      <TabsContent value="summary" className="px-4 pb-4">
        <JobSummary jobId={job.id} summary={job.summary} hasUnsavedEdits={hasUnsavedEdits} />
      </TabsContent>
      <TabsContent value="history" className="px-4 pb-4">
        <JobTimeline entries={history} />
      </TabsContent>
    </Tabs>
  );
}
