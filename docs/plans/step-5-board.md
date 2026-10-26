# Step 5: Dispatcher board

Approved 2026-10-22.

## Goal

`/board` shows the day's jobs in three columns (Scheduled, On site, Done) with a top bar to switch the date and filter by crew. Unassigned jobs are reachable through the crew filter.

## Decisions and why

| Decision | Why |
| --- | --- |
| Unassigned jobs are a crew filter option, not a fourth column | Keeps the three status columns from the spec. Answers the spec's open question for Step 5. |
| "All crews" includes unassigned jobs; their card says "Unassigned" | "All" should mean everything for the day. "Unassigned" narrows to just those jobs. |
| No "New job" button until Step 6 | A button that does nothing looks broken. |
| Filters live in the URL (`?date=2026-10-22&crew=all`) | A link or a refresh shows the same view, and the server reloads data when the URL changes. |
| URL values validated with zod; a bad value falls back to the default | Project rule: validate every boundary. The URL is user input. |
| Day boundaries computed for `America/Tijuana` with `Intl`, no date library | The spec defines "today" in that zone. Tijuana follows US daylight saving time (the rest of Mexico dropped it in 2022), and `Intl` knows those rules. No new dependency. |
| `connection()` before reading "today" | Lesson from Step 4: time-based values must use the request's time (see `docs/ai-log.md`). |
| One query: `jobs` joined with `crews(name)`, filtered by day range and crew, sorted by time | The dispatcher's RLS policy already allows it. No database change. |
| Card limited to four lines: customer · address · job type and time · crew and status | Spec usability rule; the rest goes in the drawer (Step 6). |
| Status badge = token colors + label + icon (`CalendarClock`, `Wrench`, `CircleCheck`) | Spec rule: never color alone. A shared component so Step 7 reuses it. |
| Native `<select>` and date input, styled with tokens | Simpler than the shadcn Select and better on touch devices. |
| Empty states per column and for an empty day | Spec rule: every list says what to do next. |

## Files

| File | Purpose |
| --- | --- |
| `lib/business-time.ts` | Today in Tijuana, a day's UTC range, display formats |
| `lib/jobs/status.ts` | Status order and labels |
| `lib/jobs/board-filters.ts` | zod schema for the URL values, with defaults |
| `lib/jobs/queries.ts` | `getBoardJobs(filters)` and `getCrews()` |
| `components/job-status-badge.tsx` | Status by color, label and icon |
| `app/board/page.tsx` | Top bar and three columns, inside `<Suspense>` |
| `app/board/board-filters.tsx` | Client component: previous/next day, date input, crew select; updates the URL |
| `app/board/board-column.tsx`, `app/board/job-card.tsx` | A column with its empty state; one job card |
| `tests/business-time.test.ts`, `tests/board-filters.test.ts` | Day range (both daylight saving switches) and URL parsing |
| `docs/spec.md` | Records the unassigned-jobs decision |

## Out of scope

- The job drawer and "New job" (Step 6)
- Live updates (Step 8)

## How to verify

1. Re-run `supabase/seed.sql` in the SQL Editor so the demo jobs are on today.
2. As the dispatcher, today, all crews: North 1 Done, 1 On site, 1 Scheduled; South 1 On site, 2 Scheduled; East 1 Scheduled.
3. Tomorrow: North's leak inspection and the unassigned sump pump repair.
4. "Unassigned": empty state today, one job tomorrow.
5. `npm test`, `npm run build`, then `next dev` in a real browser with the console open.
