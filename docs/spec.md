# Spec: Crew Dispatch Board

## Goal

Ship a deployed, authenticated, real-time dispatch app in one weekend. A finished small app beats an ambitious half-built one.

All data is fictional. Seed data only.

## Users and roles

| Role | Device | Can do |
| --- | --- | --- |
| dispatcher | desktop | Read and write all jobs, crews and profiles |
| crew | phone | Read only their own crew's jobs; change only status and notes |

Nobody reads anything without a login.

## Must ship

1. Email login with Supabase Auth, two roles
2. Dispatcher board: three columns (Scheduled, On site, Done), filter by crew and date
3. Create and edit a job: customer name, address, job type, scheduled date and time, assigned crew, notes
4. Crew day view (phone first): only that crew's jobs for today, one-tap status change, address opens in the phone's maps
5. Live updates: when a crew changes a status, the dispatcher board updates with no refresh
6. Row-level security so a crew only sees and updates its own jobs
7. Seed script with fictional data
8. Deployed on Vercel, README with decisions and "What I verified"

## Optional stretch (only after all of the above works)

- Job notes timeline: who changed what and when (`job_events`, written by a trigger)
- A button that turns a crew's rough note into a clean job summary using the Claude API

## Cut on purpose

Payments, maps embeds, photo uploads, invoicing, notifications, a custom design system.

## Data model

| Table | Columns | Notes |
| --- | --- | --- |
| profiles | id (references auth.users), name, role (`dispatcher` or `crew`), crew_id (nullable) | One row per login, created by a trigger on signup |
| crews | id, name | 2 to 3 seed crews |
| jobs | id, customer_name, address, job_type, scheduled_for (timestamptz), status, crew_id, notes, updated_at | `status` is a Postgres enum: `scheduled`, `on_site`, `done` |
| job_events (stretch) | id, job_id, changed_by, old_status, new_status, created_at | Written by a trigger |

Time zone: the business runs on `America/Tijuana`. "Today" (crew day view, board date filter, seed data) means today in that zone. `scheduled_for` stays `timestamptz`, stored in UTC.

Data rules (enforced in the database):

- A job may have no crew yet (`crew_id` null). Only the dispatcher sees unassigned jobs.
- A crew that still has jobs cannot be deleted. Reassign or delete its jobs first.
- Only crew members belong to a crew. A dispatcher's `crew_id` is always null.
- `notes` is never null. An empty note is `''`.
- `updated_at` is set by a trigger on every change to a job.

## Access rules (row-level security)

- Dispatcher: select, insert, update, delete on all jobs, crews and profiles.
- Crew: select only jobs where `crew_id` equals their own `crew_id`, and only their own crew's row in `crews`.
- Crew cannot update the jobs table directly. They change status and notes only through one Postgres function (for example `update_job_status(job_id, new_status, note)`), which checks that the job belongs to their crew and touches no other column.
- Profiles: a user can read their own profile. A user cannot change their own role or crew (enforced by a trigger, for dispatchers too).
- New signups start as `crew` with no crew, so they see no jobs until a dispatcher assigns them. The role is never taken from signup data.
- Logged-out visitors (`anon`) have no access to any table.
- Tests must prove: a crew cannot read another crew's jobs, cannot edit another crew's job, and cannot change a job's customer, address or crew.

Crew status changes through `update_job_status`:

- One step at a time, forward or back: `scheduled` ↔ `on_site` ↔ `done`, so a crew can undo a mistaken tap. No jumps (`scheduled` ↔ `done`). No time limit. Sending the current status again is allowed, to add a note without moving the job.
- A crew note is appended to the job's notes on a new line. It never replaces what the dispatcher wrote. Max 1000 characters.
- A job that doesn't exist and a job from another crew return the same "Job not found" error, so a crew cannot discover other crews' job ids.

## Database workflow

- Schema changes are migration files in `supabase/migrations/`, created with `npx supabase migration new <name>` and applied with `npx supabase db push` (project linked with the Supabase CLI).
- A migration that has run is never edited. Every change, including a fix or an undo, is a new migration file.
- `supabase/seed.sql` holds fictional demo data only. It is safe to re-run, and re-running resets the demo jobs to today. It is run in the SQL Editor.
- Demo logins are created in Authentication > Users, with "Auto Confirm User": `dispatcher@example.com`, `north.crew@example.com`, `south.crew@example.com`. Passwords are never committed.
- Guide: "Migrations and Seeds: A Guide for SQL-First Developers" (Claude doc, also in the personal knowledge base).

## Open questions

Decide these before the step that needs them. Until then, do not build either behavior.

- ~~Does the dispatcher board show unassigned jobs, and where? (Step 5)~~ Decided in Step 5: yes, through the crew filter. "All crews" includes them (the card says "Unassigned"); the "Unassigned" option shows only them. No fourth column.
- ~~Can the dispatcher move a job backwards, for example `done` → `on_site`? (Step 6)~~ Decided in Step 6: yes. The dispatcher can set any status from the job drawer, to fix mistakes. Crews go through `update_job_status`, one step at a time.
- ~~Can a crew undo a status tap made by mistake? (Step 7)~~ Decided in Step 7: yes, one step back (`done` → `on_site` → `scheduled`), through `update_job_status` (migration `allow_crew_status_undo`). No time limit for now: the day view only shows today's jobs.
- ~~What does the crew day view show to a crew login that has no crew assigned yet? (Step 7)~~ Decided in Step 7: a message, "You're not on a crew yet. Ask the dispatcher to add you." No jobs, no buttons.

## Realtime

The dispatcher board subscribes to changes on `jobs` with Supabase Realtime. Realtime must respect the same row-level security. Verify with two browser windows: a change in one appears in the other with no refresh.

- Postgres Changes (not Broadcast): `jobs` is in the `supabase_realtime` publication (migration `enable_jobs_realtime`). Each insert and update is checked against the subscriber's RLS select policies, so a crew only hears about its own jobs and a logged-out visitor hears nothing.
- Accepted limit (Step 8): Postgres cannot check RLS on a deleted row, so every logged-in subscriber, crews included, receives a delete event for any job. It carries only the job's id (replica identity stays at the default; never set it to `full`), no customer, address or notes. The app has no "delete job" feature yet; this only happens when a job is deleted in the dashboard.

## Deployment

Live: https://crew-dispatcher-project.vercel.app

- Vercel project imported from the GitHub repo; every push to `master` deploys.
- Vercel environment variables (Production and Preview): `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` only. The `TEST_*` passwords stay in `.env.local` for `npm test`. No service role key anywhere.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` holds a new-format publishable key (`sb_publishable_…`). Supabase accepts it in place of the old anon JWT; RLS applies the same way.
- Login is email and password only, so Supabase Auth needs no redirect URL for the Vercel domain.
- The first deploys failed because the two variables were not set in Vercel: `lib/env.ts` stops the build ("Invalid public env vars"). Reproduced locally by building with them empty.

Verified on the live URL (2026-10-27):

- Logged out, `/`, `/board` and `/crew` redirect to `/login`.
- Dispatcher sees the board with the Live indicator; North Crew (private window, phone size) sees today's North jobs.
- Start job on the phone moves the card on the board with no refresh.
- North Crew opening `/board` is redirected away.
- The board's browser code contains only the publishable key: no `service_role`, no secret key (checked in DevTools after login).
- Before the first push, all git history was scanned for the real `.env.local` values and key patterns: none found.

## Screens

1. **Dispatcher board (desktop).** Three columns with job cards. Top bar: date switcher, crew filter, "New job" button. A card shows customer, address, job type, crew, time, and a status badge.
2. **Job drawer (desktop).** Clicking a card opens a side panel with the editable fields and the notes. The dispatcher stays on the board.
3. **Crew day view (phone).** One column of today's jobs for that crew. Each card has a large status button (Start job, then Mark done) and the address opens in maps.

Visual reference: the mockup in the Design artifact (dispatcher board and crew phone view).

## Design tokens

Define as CSS variables, expose through Tailwind. Never hard-code in components.

| Token | Value | Use |
| --- | --- | --- |
| background | #F6F6F3 | Page |
| surface | #FFFFFF | Cards and panels |
| ink | #1B1F24 | Text |
| muted | #5B6470 | Secondary text |
| primary | #1F4E79 | Buttons, links, focus ring |
| status scheduled | text #345F8C on #E4ECF5 | Badge |
| status on site | text #9A5208 on #FBEBD3 | Badge |
| status done | text #276B43 on #DFF0E5 | Badge |
| radius | 8px | Cards, buttons, inputs |
| font | Inter | 14px base, 16px on phone |

Usability rules: status by color + label + icon, touch targets at least 44px, empty states everywhere, WCAG AA contrast, cards limited to four lines (anything more goes in the drawer).

## Definition of done

- Live on a Vercel URL that works from a private browser window
- Both roles tested by logging in as each
- RLS tests pass
- README: what it is and the live link, the three screens, data model and access rules, decisions and trade-offs, "What I verified" (from `docs/ai-log.md`), what I would build next
