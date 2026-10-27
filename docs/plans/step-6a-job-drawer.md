# Step 6a: Job drawer (edit a job)

Approved 2026-10-26. Step 6 is split: 6a edits a job from a drawer, 6b adds "New job" with the same form.

## Goal

Clicking a card on `/board` opens a side panel with the job's editable fields. Saving updates the job and the board; the dispatcher stays on the board.

## Decisions and why

| Decision | Why |
| --- | --- |
| The open drawer lives in the URL (`?date=…&crew=…&job=<id>`) | Same as the Step 5 filters: a refresh or a link reopens the same job, and the server loads it. |
| `job` validated with zod (uuid); an invalid value is ignored; a valid id with no job shows "Job not found. It may have been deleted." | The URL is user input. Every view says what to do next. |
| Each card is a link that keeps the current filters | Keyboard and screen-reader friendly, no client state. |
| Fields: customer, address, job type, date, time, crew (with "Unassigned"), status, notes | The spec's edit list, plus status from the Step 6 decision. |
| The status select allows any status, backwards included | Spec decision (Step 6): the dispatcher fixes mistakes. Crews stay forward-only through `update_job_status`. |
| The dispatcher edits notes as a whole, crew lines included | The dispatcher has full write access; only crews are append-only. |
| Save only if `updated_at` still matches the value loaded with the drawer; otherwise "This job changed since you opened it. Close and open it again." | Without it a save would undo a crew's status change or erase a note added while the drawer was open. Uses the existing trigger; no database change. |
| Date and time entered on the Tijuana clock, converted to UTC on the server | Spec time zone rule; `Intl`, no date library. |
| A time that does not exist on a spring-forward night (2:00–2:59) is rejected; a time that happens twice on a fall-back night takes the first one | Moving a job silently to 3:00 would hide the problem. |
| Server action `updateJob` with a zod schema: trimmed, required fields non-empty, max length customer 200, address 300, job type 100, notes 5000 | Matches the database checks; every boundary is validated. |
| The action calls `requireRole("dispatcher")` and checks with `.select()` that a row changed | RLS already blocks crews, but silently; this turns it into a clear error. |
| After saving: revalidate `/board` and redirect to the board without `job` | The board shows the change at once. The return filters are validated like any URL. |
| shadcn Sheet and Textarea; native `<select>` as in Step 5 | Sheet is built on `radix-ui`, already installed; the CLI adds files only. Its overlay color was switched to the `ink` token. |
| No database change | The dispatcher's RLS policy already allows updates. |

## Files

| File | Purpose |
| --- | --- |
| `docs/spec.md` | Records the Step 6 decision |
| `components/ui/sheet.tsx`, `components/ui/textarea.tsx` | From the shadcn CLI |
| `lib/business-time.ts` | `businessInstant(date, time)` and `businessDateTimeOf(instant)` |
| `lib/jobs/job-form.ts` | zod schema for the form |
| `lib/jobs/queries.ts` | `getJob(id)` |
| `lib/jobs/board-filters.ts` | `parseOpenJobId`, `boardHref` with an optional job |
| `app/board/actions.ts` | Server action `updateJob` |
| `app/board/job-drawer.tsx`, `app/board/job-form.tsx` | The drawer and the form |
| `app/board/job-card.tsx`, `app/board/board-column.tsx`, `app/board/page.tsx` | Card becomes a link; page renders the drawer |
| `tests/job-form.test.ts`, `tests/business-time.test.ts`, `tests/board-filters.test.ts` | Schema rules, time conversion on both clock changes, job id parsing |

## Out of scope

- New job (6b), deleting a job, live updates (Step 8)
- No new RLS test: existing tests prove a crew cannot update jobs; a dispatcher test would change seed data.

## How to verify

1. Re-run `supabase/seed.sql`.
2. As the dispatcher, click a card: the drawer opens and the URL gets `&job=…`. Refresh: it reopens.
3. Edit each field and save: the drawer closes, the card shows the change. Change the date: the card moves to that day.
4. Set a Done job back to On site: it moves columns.
5. Clear the customer name: field error, other edits kept.
6. Conflict: open a job in two tabs, save in one, then save in the other: "This job changed…".
7. `/board?job=not-a-uuid` shows the board; a random valid uuid shows "Job not found".
8. `npm test`, `npm run build`, `next dev` with the console open.
