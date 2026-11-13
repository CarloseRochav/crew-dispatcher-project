# Step 9: README screenshots

Approved 2026-11-12. No app code, database migration or dependency changes.

## Steps

| # | Who | What | Result |
| --- | --- | --- | --- |
| 1 | You | Re-run `supabase/seed.sql` so the demo jobs are dated today | Done |
| 2 | Claude | Capture from the live site | Claude in Chrome was not connected, so a throwaway Node script (kept outside the repo) drove the installed Chrome headless over the DevTools protocol. Separate cookie jars for dispatcher and North Crew; passwords read from `.env.local`, never printed |
| 3 | Claude | `board.png`, `job-drawer.png` | 1440×760, "All crews", Live showing; drawer opened on Pinecrest Dental with focus removed |
| 4 | Claude | `crew-day-view.png` | North Crew, 390×844 at 2x, scrolled so Start job shows (the header scrolls off) |
| 5 | Claude | `live-update.gif` | Board and phone side by side; North taps Start job on Pinecrest Dental and the card moves to On site. Encoded in the page with a canvas, no image tools. 1249×540, 6 frames, 72 KB |
| 6 | Claude | Restore the data | North's own "Back to Scheduled" on the same card; the job is Scheduled again |
| 7 | Claude | Check each image | Right screen, readable, only fictional data, no emails or keys; GIF decoded back frame by frame |

## Notes

- The first captures showed the date field as `12/11/2026`: headless Chrome used the system locale. `Emulation.setLocaleOverride` did not change the native date input; launching with `--lang=en-US` did.
- The drawer focuses its first field on open, which looked like a stray selection in the screenshot; blurred before capture.
