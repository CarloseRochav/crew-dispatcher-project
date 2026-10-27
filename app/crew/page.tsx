import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { SignedInHeader } from "@/components/signed-in-header";
import { requireRole } from "@/lib/auth";
import { formatDayLabel, todayInBusinessZone } from "@/lib/business-time";
import { getCrewDayJobs } from "@/lib/jobs/queries";
import { CrewJobCard } from "./crew-job-card";

export const metadata: Metadata = {
  title: "Today · Crew Dispatch",
};

export default function CrewPage() {
  return (
    <Suspense fallback={<p className="p-4 text-base text-muted-foreground">Loading…</p>}>
      <CrewDay />
    </Suspense>
  );
}

async function CrewDay() {
  // requireRole awaits connection(), so reading the clock below uses the request's time.
  const crewMember = await requireRole("crew");
  const today = todayInBusinessZone();

  return (
    <>
      <SignedInHeader title="Today" name={crewMember.name} />
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 text-base">
        <p className="font-medium text-ink">{formatDayLabel(today)}</p>
        {crewMember.crew_id ? (
          <CrewJobList crewId={crewMember.crew_id} today={today} />
        ) : (
          // Spec decision (Step 7): a login without a crew sees no jobs and no buttons.
          <EmptyMessage>You&apos;re not on a crew yet. Ask the dispatcher to add you.</EmptyMessage>
        )}
      </main>
    </>
  );
}

async function CrewJobList({ crewId, today }: { crewId: string; today: string }) {
  const jobs = await getCrewDayJobs(crewId, today);

  if (jobs.length === 0) {
    return <EmptyMessage>No jobs for today. New jobs from the dispatcher show up here.</EmptyMessage>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {jobs.map((job) => (
        <li key={job.id}>
          <CrewJobCard job={job} />
        </li>
      ))}
    </ul>
  );
}

function EmptyMessage({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-border bg-surface p-6 text-center text-muted-foreground">
      {children}
    </p>
  );
}
