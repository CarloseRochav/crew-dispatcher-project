import { z } from "zod";

// Server-only settings: no NEXT_PUBLIC_ prefix, so Next.js never puts them in the
// browser bundle. Read on each use, not at import, so the app builds and runs
// without them and only the summary button reports that AI is not set up.
const azureOpenAIEnvSchema = z.object({
  AZURE_OPENAI_BASE_URL: z
    .url()
    .refine((url) => url.endsWith("/openai/v1/"), "must end with /openai/v1/ (Azure's v1 API)"),
  AZURE_OPENAI_API_KEY: z.string().min(1),
  AZURE_OPENAI_DEPLOYMENT: z.string().min(1),
});

export type AzureOpenAIEnv = z.infer<typeof azureOpenAIEnvSchema>;

export function readAzureOpenAIEnv(
  env: Record<string, string | undefined> = process.env,
): AzureOpenAIEnv | null {
  const parsed = azureOpenAIEnvSchema.safeParse({
    AZURE_OPENAI_BASE_URL: env.AZURE_OPENAI_BASE_URL,
    AZURE_OPENAI_API_KEY: env.AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_DEPLOYMENT: env.AZURE_OPENAI_DEPLOYMENT,
  });
  return parsed.success ? parsed.data : null;
}
