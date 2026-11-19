# Step 17: a crew note keeps the job's status

Approved 2026-11-19: the plan, then the SQL of each migration before it ran. Closes the known gap from Step 16.

## Goal

A crew note can never move a job. `update_job_status` takes no status to mean "keep the current one", decided inside the function's row lock instead of by a read in the app.

## Decisions and why

| Decision | Why |
| --- | --- |
| `p_new_status` gets `default null`; null means the job's current status, read after `for update` | The Step 16 read-then-save check left a few milliseconds where a dispatcher's change could be undone. The lock closes it. |
| Same argument types, `create or replace` | Replaces the function instead of adding an overload; grants stay on the same target; existing callers (status buttons, tests) are unchanged. |
| No status and no note is refused with `22004` | An empty call would otherwise update the row and bump `updated_at` for nothing. |
| The note action sends no status and drops its read | The database now decides; one call instead of two. |
| `crewNoteSchema` drops its status field | A tampered form that adds a status is dropped by zod, so the note action can never move a job. |

## Migrations

| File | What |
| --- | --- |
| `20261119202623_crew_note_keeps_status.sql` | The change |
| `20261119202650_break_crew_note_keeps_status_on_purpose.sql` | Null status becomes `scheduled`, to prove the tests catch it |
| `20261119202657_restore_crew_note_keeps_status.sql` | The function from the first file again |

Applied one at a time with `db push --remote` after a dry run each; the second and third files were held outside `supabase/migrations/` until their turn.

## Other files

| File | Change |
| --- | --- |
| `lib/database.types.ts` | Regenerated: `p_new_status` optional |
| `tests/rls/jobs.rls.test.ts` | 4 tests (5 cases): note keeps status, keeps a status the dispatcher just set, `22004` for no status and an empty or spaces-only note, "Job not found" on another crew's job |
| `lib/jobs/crew-note.ts`, `tests/crew-note.test.ts` | No status field; a tampered status is dropped |
| `app/crew/actions.ts`, `app/crew/crew-note-form.tsx`, `app/crew/crew-job-card.tsx` | No status sent, read-then-save check removed, `22004` message |

## Verified (2026-11-19)

1. After the first migration, the new RLS tests passed (25 of 25 in the file).
2. After the break: "adds the note and leaves the status as it was" failed (`scheduled` instead of `on_site`) and "keeps a status the dispatcher just set" failed (`22023`, a refused jump from Done).
3. After the restore: full `npm test`, 169 of 169. `tsc`, `eslint` and `npm run build` pass.
4. The broken run left real `job_events` rows for North's 10:30 job (accepted, as in Step 10); re-running the seed clears them.

## Still to check

- In the browser: add a note as North Crew, and the stale-card case (dispatcher moves the job to Done, crew saves a note without refreshing). The job should stay Done and the note should be saved, where Step 16 refused it.
