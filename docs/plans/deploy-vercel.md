# Deploy to Vercel

Approved 2026-10-27. No app code, database or dependency changes.

## Steps

| # | Who | What | Result |
| --- | --- | --- | --- |
| 1 | Claude | Scan all git history for `.env.local` values and key patterns | None found (control search found its string) |
| 2 | Claude | `npm run build` and `npm test` locally | Build passes; 103/103 tests |
| 3 | Claude | `git push origin master` (after "push") | Pushed `c873877..3dea4a5` |
| 4 | You | Import the repo in Vercel, add the two public env vars, deploy | First deploy failed: env vars missing, `lib/env.ts` stopped the build. Redeployed after adding them: success |
| 5 | — | Function region, Supabase Site URL | Skipped (optional; password login needs no redirect URL) |
| 6 | Both | Checks on the live URL | All pass, see `docs/spec.md`, Deployment |
| 7 | Claude | Record the live URL | `docs/spec.md`, Deployment |

## Notes

- My plan first said Supabase Auth needed the Vercel URL as a redirect URL. Wrong for this app: it uses password login only, no email links.
- The browser-code check can only be done after login: `/login` does not load the Supabase client. Done in DevTools with a Console snippet that prints the key's type, never the key.
