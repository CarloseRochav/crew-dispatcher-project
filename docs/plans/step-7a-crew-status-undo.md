# Step 7a: Crews can undo one status step

Approved 2026-10-26. Step 7 is split: 7a changes the database function, 7b builds the crew day view.

## Goal

A crew can undo a mistaken status tap, one step back, through `update_job_status`.

## Decisions and why

| Decision | Why |
| --- | --- |
| One step forward or back: `scheduled` ↔ `on_site` ↔ `done`; jumps (`scheduled` ↔ `done`) still refused | Step 7 decision (1b). One step at a time keeps the history readable. |
| Everything else in the function unchanged (crew check, "Job not found", appended notes, 1000-character limit) | Only the status rule was decided. |
| `create or replace` in a new migration, same signature, grants restated | A migration that has run is never edited. Same signature: generated types unchanged. |
| No time limit, no "today only" rule | Decided in planning: not now. The day view only shows today's jobs; a limit would also change the forward rule. |
| Crew with no crew assigned sees a message, no jobs (Step 7 decision 2a) | Recorded in the spec now, built in 7b. |

## Files

| File | Purpose |
| --- | --- |
| `supabase/migrations/20261027015601_allow_crew_status_undo.sql` | The new function |
| `tests/rls/jobs.rls.test.ts`, `tests/rls/helpers.ts` | Undo works, jumps refused, other crews' jobs untouched; seed statuses restored after each test |
| `docs/spec.md` | New status rule, both Step 7 questions decided |

## Proof the tests catch it

Before `db push`: 2 failed, 18 passed in `tests/rls` — both undo tests got `22023` from the old function. After `db push`: all 82 tests passed.

## How to verify

1. `npx supabase migration list`: local and remote both have `20261027015601`.
2. `npm test`: all pass.
3. In the SQL Editor, the seeded jobs still have their seed statuses (the tests restore them).
