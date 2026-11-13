# Step 10b: job timeline in the drawer

Approved 2026-11-12. No database or dependency changes (`components/ui/tabs.tsx` comes from shadcn and uses the `radix-ui` package already installed).

## Decisions

- Tabs, **Details | History**, in edit mode only (chosen over a section below the form or a collapsible).
- The details panel stays mounted (`forceMount`, hidden when inactive), so switching tabs never loses unsaved edits.
- The tab is not in the URL; each drawer opens on Details.
- Entries always carry the date ("Thu, Nov 12 · 2:14 PM", Tijuana clock), newest first, at most 50.

## Steps

| # | What | Result |
| --- | --- | --- |
| 1 | `getJobEvents` (`lib/jobs/queries.ts`), `formatEventTime` (`lib/business-time.ts`), `toTimelineEntry` (`lib/jobs/timeline.ts`) | `tests/job-timeline.test.ts`: 7/7 |
| 2 | `npx shadcn add tabs --dry-run`, then add | Only `components/ui/tabs.tsx`; `package.json` unchanged |
| 3 | `app/board/job-timeline.tsx`, tabs in `job-drawer.tsx`, events loaded in `board/page.tsx` | `tsc`, lint and `npm run build` pass |
| 4 | Browser check in `next dev` (scripted headless Chrome) | 8/8: opens on Details; Save hidden on History; North's tap adds an entry live; unsaved Notes text kept after the tab switch and the live refresh; stale-edit warning shown; New job has no tabs; 0 console errors. Pinecrest restored to Scheduled with North's undo |
| 5 | Full suite | 123/123 |
| 6 | README: data model, access rules, drawer description, What I verified, What I'd build next | Done |

## Notes

- `app/globals.css` defines no `dark` variant, so Tailwind's `dark:` classes follow the OS setting. On a dark-mode OS, shadcn's dark styles (tabs, outline buttons) apply on top of the light theme. Found during this check; not fixed here (separate step).
