# Step 10a: job_events table, trigger and RLS

Approved 2026-11-12. Database and tests only; the timeline screen is Step 10b.

## Decisions (asked before writing SQL)

- Record job creation and status changes only (the spec's data model), not notes or other fields.
- Only the dispatcher reads events.
- Changes with no login are kept with `changed_by` null, shown as "System".

## Steps

| # | What | Result |
| --- | --- | --- |
| 1 | Migration `add_job_events`: table, `security definer` trigger on insert and on real status change, RLS with dispatcher-only select, no direct writes for anyone | Applied with `db push --remote --yes` after approval |
| 2 | Regenerate `lib/database.types.ts` | Only the `job_events` block added; `tsc` passes |
| 3 | `seed.sql` clears the demo jobs' events after the reset | Done |
| 4 | `tests/rls/job-events.rls.test.ts` (13 tests) | 13/13; full suite 116/116 |
| 5 | Fail on purpose: `break_job_events_select_on_purpose` (any logged-in user reads all events), then `restore_job_events_select` | With the break: exactly the 2 crew-read tests failed (North read 6 South events, 28 in total). After restore: 116/116 |
| 6 | Record decisions in `docs/spec.md` (Job timeline) | Done |

## Notes

- `db push` sends every pending migration, so the restore file was moved out of `supabase/migrations/` while the break was pushed alone.
- `npx` fetched Supabase CLI 3.1.0, which targets a local Docker database unless given `--remote`, and asks agents for `--yes`. The spec and README commands were updated.
- Tests that change statuses leave real events on the live database; re-running the seed clears them (accepted, see spec).
