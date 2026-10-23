import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env";

const testEnvSchema = z.object({
  TEST_DISPATCHER_PASSWORD: z.string().min(1),
  TEST_NORTH_CREW_PASSWORD: z.string().min(1),
  TEST_SOUTH_CREW_PASSWORD: z.string().min(1),
});

const parsed = testEnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Missing test passwords (check .env.local against .env.example):\n${z.prettifyError(parsed.error)}`,
  );
}

const testEnv = parsed.data;

export type TestClient = SupabaseClient<Database>;
export type JobUpdate = Database["public"]["Tables"]["jobs"]["Update"];

// Fixed ids from supabase/seed.sql.
export const crewIds = {
  north: "c0000000-0000-4000-8000-000000000001",
  south: "c0000000-0000-4000-8000-000000000002",
} as const;

export const jobIds = {
  northOnSite: "a0000000-0000-4000-8000-000000000002",
  northScheduled: "a0000000-0000-4000-8000-000000000003",
  southOnSite: "a0000000-0000-4000-8000-000000000005",
  southScheduled: "a0000000-0000-4000-8000-000000000006",
} as const;

export const seedJobIds = Array.from(
  { length: 9 },
  (_, i) => `a0000000-0000-4000-8000-00000000000${i + 1}`,
);

const demoUsers = {
  dispatcher: { email: "dispatcher@example.com", password: testEnv.TEST_DISPATCHER_PASSWORD },
  northCrew: { email: "north.crew@example.com", password: testEnv.TEST_NORTH_CREW_PASSWORD },
  southCrew: { email: "south.crew@example.com", password: testEnv.TEST_SOUTH_CREW_PASSWORD },
} as const;

export type DemoUser = keyof typeof demoUsers;

// Anon key only: tests must see exactly what a real browser would, never bypass RLS.
export function anonClient(): TestClient {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function signInAs(user: DemoUser): Promise<TestClient> {
  const client = anonClient();
  const { email, password } = demoUsers[user];
  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(`Could not sign in as ${email}: ${error.message}`);
  }

  return client;
}
