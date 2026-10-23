import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same "@/..." imports as the app (tsconfig paths).
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/setup-env.ts"],
    // Every test talks to the live Supabase project over the network.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    // One file at a time keeps sign-ins well under Supabase Auth rate limits.
    fileParallelism: false,
  },
});
