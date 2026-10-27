# Step 6b: New job

Approved 2026-10-26. Reuses the Step 6a drawer and form.

## Goal

A "New job" button on `/board` opens the drawer with an empty form. Creating the job shows the board on the job's day.

## Decisions and why

| Decision | Why |
| --- | --- |
| "New job" in the top bar opens the drawer with `?job=new` | Same pattern as editing: the URL decides what is open, a refresh keeps it. |
| Starts with the board's date, and the crew filter's crew when one crew is selected (otherwise Unassigned) | The dispatcher usually adds jobs for the day and crew on screen. |
| The time starts empty; saving without one says "Pick a time" | Chosen in planning: no job gets booked at a time nobody picked. |
| No status field; a new job starts as `scheduled` (column default) | The spec's create list has no status; a new job has not started. A status sent anyway is dropped by the schema. |
| One set of field rules shared by `jobCreateSchema` and `jobUpdateSchema` | Create and edit check the same things, written once. |
| Server action `createJob`: `requireRole("dispatcher")`, insert, then the board on the new job's date | On the old date the new job would seem to vanish. |
| After creating, a one-crew or "Unassigned" filter switches to the new job's crew (or "Unassigned"); "All crews" stays (`boardAfterCreate`) | Changed after review: with the old filter, a job for another crew was hidden right after creating it. "All crews" already shows it. |
| No database change, no new dependency | The dispatcher's RLS policy already allows inserts. |

## Files

| File | Purpose |
| --- | --- |
| `lib/jobs/job-form.ts` | Shared fields, `jobCreateSchema`, `jobUpdateSchema` |
| `lib/jobs/board-filters.ts` | `NEW_JOB`; `parseOpenJobId` accepts `new` |
| `app/board/actions.ts` | `createJob` |
| `app/board/job-form.tsx` | Create mode: starting values, no status, no hidden version |
| `app/board/job-drawer.tsx`, `app/board/page.tsx` | "New job" drawer content |
| `app/board/board-filters.tsx` | The button |
| `tests/job-form.test.ts`, `tests/board-filters.test.ts` | Create schema, `job=new` parsing |

## Out of scope

Deleting a job, live updates (Step 8).

## How to verify

1. As the dispatcher, click "New job": the URL gets `&job=new`, the form shows the board's date, an empty time, no status field.
2. With the crew filter on North Crew, the crew starts as North Crew; on "All crews" it starts as Unassigned.
3. Save without a time: "Pick a time". Other fields keep what you typed.
4. Fill everything and create: the drawer closes, the job is in Scheduled on its day.
5. Create a job for another day: the board switches to that day.
6. With the filter on North Crew, create a job for South Crew: the filter switches to South Crew. On "All crews" it stays on "All crews".
7. Cancel, Esc, X and clicking outside close it and keep the filters.
8. `npm test`, `npm run build`, `next dev` with the console open.
