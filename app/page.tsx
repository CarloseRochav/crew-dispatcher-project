import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentProfile } from "@/lib/auth";
import { homePathFor } from "@/lib/home-path";

export default function Home() {
  return (
    <Suspense fallback={<p className="p-4 text-muted-foreground">Loading…</p>}>
      <RedirectHome />
    </Suspense>
  );
}

async function RedirectHome(): Promise<never> {
  const profile = await getCurrentProfile();
  redirect(profile ? homePathFor(profile.role) : "/login");
}
