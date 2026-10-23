import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Database } from "@/lib/database.types";
import { homePathFor, type UserRole } from "@/lib/home-path";
import { createClient } from "@/lib/supabase/server";

export type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "name" | "role" | "crew_id"
>;

export async function getCurrentProfile(): Promise<Profile | null> {
  // partialPrefetching resolves cookies() while prerendering, and getClaims
  // checks token expiry with Date.now(). A session check must use the request's time.
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims.sub;
  if (!userId) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, name, role, crew_id")
    .eq("id", userId)
    .single();

  // The signup trigger creates a profile for every login, so a miss is a real fault.
  if (error) throw error;
  return profile;
}

// The real page-level check; proxy.ts only redirects logged-out visitors.
export async function requireRole(role: UserRole): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== role) redirect(homePathFor(profile.role));
  return profile;
}
