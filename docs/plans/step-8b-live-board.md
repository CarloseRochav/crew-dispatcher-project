# Step 8b: live board

Approved 2026-10-26. Builds on 8a (Realtime on `jobs`, proven to respect RLS).

## Goal

When a crew taps a status (or anything else changes a job), `/board` updates within about a second with no refresh, and the dispatcher can see the board is live.

## Decisions and why

| Decision | Why |
| --- | --- |
| `LiveBoardUpdates` (client) subscribes to all changes on `jobs` with the browser client and the dispatcher's session | 8a proved RLS applies to these events; the browser only has the anon key |
| Any event calls `router.refresh()`, 300ms after the first event of a burst | The server reloads with the URL filters: one source of truth, no merging events in the browser. The wait is not pushed back by later events, so a steady stream still refreshes. |
| Wait-then-refresh is a pure helper (`lib/realtime/refresh-scheduler.ts`) with fake-timer tests | Easy to get wrong, easy to test |
| Indicator at the end of the top bar: "Live" (`Radio`), "Connecting…" / "Reconnecting…" (`RefreshCw`), `role="status"` | Status by label + icon + color; screen readers hear the change |
| One refresh after a reconnect | Changes made while disconnected are never sent |
| Channel removed and timer cancelled on unmount | No leftover connections or late refreshes |
| Edit form keyed by job id and keeps the version it opened with | Keying by `updated_at` would wipe the dispatcher's typing on every live refresh, and could silently adopt the new `updated_at`, getting around the conflict check |
| Notice when the open job changes underneath | The dispatcher learns before pressing Save |
| Crew view unchanged; no database change; no new dependencies | Spec asks for live updates on the board only |

## Files

| File | Purpose |
| --- | --- |
| `lib/realtime/refresh-scheduler.ts` | Wait-then-refresh helper |
| `app/board/live-board-updates.tsx` | Subscription + indicator |
| `app/board/page.tsx`, `app/board/board-filters.tsx` | Mount it in the top bar (children slot) |
| `app/board/job-drawer.tsx`, `app/board/job-form.tsx` | Form key, loaded version, notice |
| `tests/refresh-scheduler.test.ts` | Burst → one refresh, steady stream, cancel |

## Proof the tests catch it

- Removed the "already waiting" guard on purpose: 2 of 5 scheduler tests failed (burst, steady stream). Restored: 5/5.

## How to verify

1. Two windows: dispatcher on `/board`, North Crew on `/crew` (phone-sized private window).
2. Tap Start job on the phone: the card moves to On site on the board within about a second.
3. Open a job's drawer, type in Notes, change that job's status from the phone: the typing stays and the notice appears; Save shows the "changed since you opened it" error.
4. DevTools → Network → Offline: indicator shows "Reconnecting…". Change a job from the phone, go back online: "Live" again and the board catches up.
