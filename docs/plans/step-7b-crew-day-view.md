# Step 7b: Crew day view

Approved 2026-10-26. Uses the Step 7a status rule (one step forward or back).

## Goal

`/crew` shows the crew's jobs for today (Tijuana) in one column. Each card has one big status button, an undo button, and an address that opens the phone's maps.

## Decisions and why

| Decision | Why |
| --- | --- |
| Today's jobs filtered by the member's `crew_id`, sorted by time | RLS already limits a crew to its own jobs; the filter makes the query say so. Same Tijuana day as the board. |
| Big button: "Start job" (scheduled → on site), "Mark done" (on site → done); none on a done job | Spec screen description. |
| Undo button, smaller and outlined: "Back to Scheduled" (on site), "Reopen" (done); no confirmation | Step 7 decision (1b). An undo is itself one tap. |
| Badge with color, label and icon; buttons at least 44px; 16px text | Design rules. |
| Address links to `https://www.google.com/maps/search/?api=1&query=…` | Chosen in planning: one link that opens Maps on Android and iPhone. Map embeds are cut. |
| Notes folded under "Notes" | Crews need them (gate codes); the four-line card rule and no drawer on the phone. |
| Server action `changeJobStatus`: zod (`jobId`, `status`), then `update_job_status` | Every boundary validated; crews never write to `jobs` directly; the database has the final say. |
| Database errors in crew words (`P0002`, `22023`, `42501`) | The raw messages are right but not written for a crew. |
| Button mapping is a pure, tested function | Easy to get wrong, easy to test. |
| No crew: "You're not on a crew yet. Ask the dispatcher to add you." No jobs, no buttons | Step 7 decision (2a). |
| No jobs: "No jobs for today. New jobs from the dispatcher show up here." | Every list has an empty state. |
| No database change, no new dependency | 7a did the database work. |

## Files

| File | Purpose |
| --- | --- |
| `lib/jobs/crew-actions.ts` | Status → big button and undo button |
| `lib/jobs/status-change.ts` | zod schema for the action |
| `lib/jobs/maps.ts` | Maps link |
| `lib/jobs/queries.ts` | `getCrewDayJobs(crewId, date)` |
| `app/crew/actions.ts` | `changeJobStatus` |
| `app/crew/page.tsx` | Page, no-crew message, empty state |
| `app/crew/crew-job-card.tsx`, `app/crew/status-buttons.tsx` | Card (server) and buttons (client) |
| `tests/crew-actions.test.ts`, `tests/status-change.test.ts`, `tests/maps.test.ts` | Mapping, schema, link encoding |

## Out of scope

- Adding a note from the phone (possible 7c)
- Live updates on either screen (Step 8)

## How to verify

1. Re-run `supabase/seed.sql`.
2. In the browser's device toolbar (a phone size), sign in as `north.crew@example.com`: Done 8:00, On site 10:30, Scheduled 2:00, in time order. Tomorrow's leak inspection is not shown.
3. Scheduled job: "Start job" → On site, now with "Mark done" and "Back to Scheduled".
4. "Mark done" → Done with only "Reopen". "Reopen" → On site.
5. The address opens Google Maps in a new tab; "Notes" opens the gate code.
6. As the dispatcher, the board shows the new statuses after a refresh (live updates are Step 8).
7. Create a fourth user in Authentication > Users (no crew): `/crew` shows "You're not on a crew yet…". Delete the user afterwards.
8. `npm test`, `npm run build`, `next dev` with the console open.
