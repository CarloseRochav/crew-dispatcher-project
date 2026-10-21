import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

// Each var is referenced literally: Next.js only inlines NEXT_PUBLIC_* values
// into the browser bundle for direct `process.env.NAME` access.
const parsed = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsed.success) {
  throw new Error(
    `Invalid public env vars (check .env.local against .env.example):\n${z.prettifyError(parsed.error)}`,
  );
}

export const publicEnv = parsed.data;
