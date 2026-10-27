# Step 8a: Realtime on jobs

Approved 2026-10-26. Step 8 is split: 8a turns Realtime on for `jobs` and proves it respects RLS, 8b makes the board update live.

## Goal

Changes to `jobs` are sent over Supabase Realtime, and each subscriber only hears about jobs its RLS policies let it read.

## Decisions and why

| Decision | Why |
| --- | --- |
| Postgres Changes, not Broadcast from the database | The spec says the board subscribes to changes on `jobs`. Postgres Changes checks each event against the subscriber's RLS select policies, so the tested rules apply unchanged. Broadcast needs triggers, private channels and `realtime.messages` policies. |
| Migration adds `public.jobs` to `supabase_realtime`, guarded by a `pg_publication_tables` check | Safe if Realtime was already turned on for `jobs` in the dashboard. |
| Replica identity stays at the default | A delete event then carries only the job's id. |
| Accepted: delete events reach every logged-in subscriber (id only) | Postgres cannot check RLS on a deleted row. No delete feature exists yet. Recorded in `docs/spec.md`, Realtime. |
| No policy change | Realtime uses the existing select policies. |

## Files

| File | Purpose |
| --- | --- |
| `supabase/migrations/20261027030331_enable_jobs_realtime.sql` | Adds `jobs` to the publication |
| `tests/rls/jobs.realtime.test.ts` | Dispatcher hears every crew's changes; North hears its own job, never South's; anon hears nothing. Notes restored after each test. |
| `tests/rls/jobs.rls.test.ts` | Fix: the Step 7a undo tests reset seed statuses before each test, not only after |
| `docs/spec.md` | Realtime approach and the accepted delete-event limit |

## Proof the tests catch it

- Before `db push`: 2 failed, 1 passed — no events reached the dispatcher or North; anon heard nothing.
- First full run after `db push`: 2 failed.
  - Realtime "dispatcher hears every change" got no events, seconds after the push. Three runs in a row afterwards passed. I blamed Realtime not yet picking up the publication change; wrong: it failed again during Step 8b with no database change. Real cause: the listener sometimes starts streaming more than the fixed 1s after `SUBSCRIBED`. Fixed after 8b with a warm-up (see `docs/ai-log.md`).
  - The 7a undo test got `22023`: manual 7b checks had left North's 10:30 job on Done, and the tests only restored statuses after each test. Fixed by also resetting before each test; reproduced by setting that job to Done, then 20/20 passed.
- Final run: all 98 tests passed.

## How to verify

1. `npx supabase migration list`: `20261027030331` on both sides.
2. `npm test`: all pass.
3. Optional, in the SQL Editor: `select * from pg_publication_tables where pubname = 'supabase_realtime';` lists `public.jobs`.
