import type { Metadata } from "next";
import { Suspense } from "react";
import { SignedInHeader } from "@/components/signed-in-header";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Dispatch board · Crew Dispatch",
};

export default function BoardPage() {
  return (
    <Suspense fallback={<p className="p-4 text-muted-foreground">Loading…</p>}>
      <DispatcherBoard />
    </Suspense>
  );
}

async function DispatcherBoard() {
  const dispatcher = await requireRole("dispatcher");

  return (
    <>
      <SignedInHeader title="Dispatch board" name={dispatcher.name} />
      <main className="p-4">
        <p className="text-muted-foreground">The board with today&apos;s jobs comes in Step 5.</p>
      </main>
    </>
  );
}
