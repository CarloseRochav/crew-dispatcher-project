import type { Metadata } from "next";
import { Suspense } from "react";
import { SignedInHeader } from "@/components/signed-in-header";
import { requireRole } from "@/lib/auth";

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
  const crewMember = await requireRole("crew");

  return (
    <>
      <SignedInHeader title="Today" name={crewMember.name} />
      <main className="p-4 text-base">
        <p className="text-muted-foreground">Your jobs for today come in Step 7.</p>
      </main>
    </>
  );
}
