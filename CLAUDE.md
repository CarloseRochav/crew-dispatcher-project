# Crew Dispatch Board

A portfolio project: a live dispatch board for a fictional field-service company. The office schedules jobs and assigns crews, crews update job status from their phones, and the dispatcher sees changes without refreshing.

Read `docs/spec.md` before doing anything. It is the source of truth for scope, data model and access rules.

## Stack (do not add to it without asking)

- Next.js (App Router) + TypeScript (strict)
- Supabase: Postgres, Auth, Realtime. Use `@supabase/ssr` for auth in Next.js.
- Tailwind CSS + shadcn/ui
- zod for validation at every boundary (forms, route handlers, server actions)
- Vitest for tests
- Deploy on Vercel

## How we work

1. **Plan first.** For every task, propose a short plan (files to touch, approach) and wait for my approval before writing code.
2. **One small step at a time.** One feature or one migration per task. Never build several features in one go.
3. **Show before you change the database.** Write SQL as migration files in `supabase/migrations/`. Do not run anything against the database until I approve the SQL.
4. **After each step**, list: what changed, how to verify it, and anything you are unsure about.
5. **No new dependencies** without telling me why.
6. **Stop and ask** when the spec is ambiguous. Do not guess.

## Security rules (non-negotiable)

- Never put the Supabase service role key in client code or in the repo. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public. Everything else goes in `.env.local` (git-ignored) and Vercel environment variables.
- Every table has row-level security enabled. No table is ever readable without a login.
- Row-level security rules need tests that prove a crew cannot read or change another crew's jobs. Write them with me, and make them fail once on purpose.
- Validate all input with zod, including values coming from our own forms.

## Design rules

- All colors, radius and fonts come from the tokens in `docs/spec.md` (section Design), defined once as CSS variables and used through Tailwind. Never hard-code a color in a component.
- Status is shown by color, label and icon together, never color alone.
- Touch targets on the phone view are at least 44px.
- Every list has an empty state that says what to do next.

## Code rules

- Strict TypeScript, no `any`. Use generated Supabase types.
- Small components and small functions. Name things after the domain: job, crew, dispatcher.
- Comments explain why, not what.

## AI log

Whenever Claude Code gets something wrong and I catch it (a missing policy, a secret on the client, missing validation, a wrong assumption), add one line to `docs/ai-log.md`: what it did, how I noticed, what I changed. This becomes the README section "What I verified".
