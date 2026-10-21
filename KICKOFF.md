# Kickoff: how to start

## Before you open Claude Code (about 20 minutes)

1. Create an empty GitHub repo named `crew-dispatch-board`.
2. Create a free Supabase project. Copy the project URL and the anon key (Project Settings, API). Do not copy the service role key into any file you will commit.
3. Create a free Vercel account and link it to your GitHub account.
4. On your computer:
   ```bash
   git clone https://github.com/CarloseRochav/crew-dispatch-board.git
   cd crew-dispatch-board
   mkdir docs
   ```
5. Copy `CLAUDE.md` to the repo root, and `docs/spec.md` and `docs/ai-log.md` into `docs/`. Commit:
   ```bash
   git add . && git commit -m "Add spec and Claude Code rules" && git push
   ```
6. Start Claude Code in the repo folder, then press Shift+Tab until it says plan mode. In plan mode it proposes and you approve before it edits.

## Prompt 1: scaffold (paste this first)

```
Read CLAUDE.md and docs/spec.md. Do not write code yet.

Give me a plan for Step 1 only: scaffold the app.
- Create the Next.js app (App Router, TypeScript strict, Tailwind) in the current folder
- Add shadcn/ui
- Add the Supabase client with @supabase/ssr, reading NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from .env.local
- Add .env.example (names only, no values) and make sure .env.local is git-ignored
- Define the design tokens from the spec as CSS variables and expose them in Tailwind
- A home page that shows "Crew Dispatch" so I can deploy it

List the exact commands and files. Wait for my approval.
```

After you approve and it finishes, deploy to Vercel (import the repo, add the two public env vars) and confirm the empty app is live. That is your first checkpoint.

## Prompt 2: database (only after the app is live)

```
Plan Step 2: the database, as SQL migration files only. Do not run anything.
- Tables: profiles, crews, jobs (status as a Postgres enum), per the spec
- A trigger that creates a profiles row on signup
- Enable row-level security on every table
- The dispatcher and crew policies from the spec
- The update_job_status function for crews
- A seed script with fictional crews, one dispatcher, two crew logins and about 8 jobs

Show me the SQL and explain each policy in one line. I will review it before anything is applied.
```

Read every policy line yourself. This is the part where a wrong AI answer exposes data.

## Prompt 3: prove the rules

```
Plan Step 3: tests for the access rules with Vitest.
Prove: a crew cannot read another crew's jobs, cannot update another crew's job, and cannot change customer, address or crew on their own job. Then show me how to make each test fail on purpose.
```

After the tests pass, break one policy on purpose, confirm the test fails, then restore it. Add what you learned to `docs/ai-log.md`.

## Later prompts (one at a time, each starting with "Plan Step N")

4. Login and role-based redirect (dispatcher to board, crew to day view)
5. Dispatcher board with the three columns, filter by crew and date
6. Create and edit a job in the drawer, validated with zod
7. Crew phone view with one-tap status change through the function
8. Realtime on the dispatcher board, checked with two browser windows
9. Polish against the mockup: tokens, empty states, phone width, contrast
10. Production deploy, README, and your two-minute walkthrough in English

## Your review checklist for every step

- Did it stay inside the step I approved?
- Did it add a dependency I did not approve?
- Are there secrets in code, in `.env.example` values, or in the Git history?
- Can I explain every new file in one sentence?
- Did it work when I tried it myself, not just when Claude said so?
- Did Claude get something wrong? Write one line in `docs/ai-log.md`.

Commit after each approved step with a message that says what the step did.
