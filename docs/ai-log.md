# AI log

One line each time Claude Code got something wrong and I caught it. This feeds the README section "What I verified".

Format: **Step N** | what it did | how I noticed | what I changed

- **Step 1** | Flagged the `cn` package in `lib/utils.ts` as an unexplained third-party dependency and proposed replacing it with `clsx` + `tailwind-merge`, based on outdated knowledge of the shadcn setup | While planning the cleanup, Claude read `node_modules/cn/package.json` and `npm ls`: `cn` is shadcn's own package (repo `shadcn-ui/cn`) and the shadcn CLI depends on it | Cancelled the cleanup; kept `cn` and `shadcn` as installed. Lesson: check the installed package before calling a dependency suspicious
- **Step 4** | Read the Supabase session in Server Components without `await connection()`, and reported the step as verified after `npm run build` and scripted requests passed. With `partialPrefetching` on, `cookies()` resolves during prerender and `getClaims()` calls `Date.now()`, which Next.js rejects | Logged in with the three demo accounts in the browser and saw "encountered the unstable value `Date.now()` while prerendering" for `/board` and `/crew` in the console | Added `await connection()` at the start of `getCurrentProfile()` (`lib/auth.ts`). Lesson: `npm run build` and requests against `next start` don't run this dev-only prerender check; test in `next dev` with a real browser before calling a step verified
