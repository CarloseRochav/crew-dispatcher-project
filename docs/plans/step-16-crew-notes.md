# Step 16: crew adds a note from the phone

First item of the README's "What I'd build next". Built 2026-11-19 without a plan review (asked to proceed on my own); needs a browser check before it is called verified.

## Goal

On `/crew`, each job card has an "Add a note" section. The note is appended under the job's notes through `update_job_status` and reaches the board live, like any job change.

## Decisions and why

| Decision | Why |
| --- | --- |
| No database change | `update_job_status` already takes `p_note`, appends it on a new line, trims it, caps it at 1000 characters and allows the same status again "to add a note without moving the job" (spec). |
| Folded "Add a note" section under the notes, collapsed by default | Keeps the card to four lines of job info (spec); no drawer on the phone. |
| zod schema `crewNoteSchema` (`jobId`, `status`, `note` trimmed, 1 to 1000) | Every boundary validated; our message comes before the database's. |
| The form sends the status the card showed; the action reads the job's current status first and refuses if it differs | The function always sets a status. If the dispatcher moved the job after the card loaded, re-sending the old status would quietly move it back. The crew day view has no live updates, so a stale card is likely. |
| Textarea is controlled; cleared only after a save | A failed save keeps what the crew typed. |
| Confirmation "Note added." with an icon; errors with an icon and `role="alert"` | Not color alone; screen readers hear the result. |

## Known gap

The status read and the `update_job_status` call are two steps. A dispatcher change landing in the few milliseconds between them is not caught, and the note would move the job back one step. The real fix is a migration: let `p_new_status` be null to mean "keep the current status", checked inside the function's row lock. Not done here because it changes the database and needs approval.

## Files

| File | Purpose |
| --- | --- |
| `lib/jobs/crew-note.ts` | `crewNoteSchema`, `CREW_NOTE_MAX_LENGTH` |
| `app/crew/actions.ts` | `addCrewNote` server action, note error messages (`22001`, `22023`) |
| `app/crew/crew-note-form.tsx` | Client form |
| `app/crew/crew-job-card.tsx` | Renders the form above the status buttons |
| `tests/crew-note.test.ts` | Schema: trim, limit, empty, tampered fields |

## How to verify

1. Re-run `supabase/seed.sql`.
2. `npm run dev`, phone size, sign in as `north.crew@example.com`. Open "Add a note" on the On site job, type a note, Save note: "Note added.", the field clears, the note shows under "Notes" on a new line, the status stays On site.
3. Save with only spaces: "Write a note first." and nothing is saved.
4. As the dispatcher in a second window, the note appears in the job drawer with no refresh.
5. Stale card: with the crew page open, the dispatcher moves that job to Done. Without refreshing, the crew saves a note: "This job's status changed. Refresh, then add your note again." and the job stays Done.
6. Console open in `next dev`: no errors.
7. `npm test`, `npm run build`.

## Checked so far

- `tsc --noEmit`, `eslint`, the unit tests without the database (122 of 122) and `npm run build` pass.
- Not yet done: steps 2 to 6 in a browser, and the RLS tests against the live database.
