# Step 13b: theme switch (System / Light / Dark)

Approved 2026-11-12 (System default). No database or dependency changes; no `next-themes`.

## Changes

- `lib/theme.ts`: choices, zod parsing of the stored value (unknown → System), cycle order, `resolveTheme`, and `themeInitScript`, the inline script that sets `.dark` before the first paint. If storage is blocked it acts as System.
- `lib/theme-store.ts`: browser store for `useSyncExternalStore`; saves to `localStorage`, follows OS changes live and other tabs' changes.
- `components/theme-switch.tsx`: header button, icon + label (icon only under 640px, named by `aria-label`), 44px. The server renders a neutral "Theme" button; the real choice appears after hydration.
- `components/signed-in-header.tsx`: switch beside Sign out (board and crew view).
- `app/layout.tsx`: the inline script in `<head>`, `suppressHydrationWarning` on `<html>`.
- `tests/theme.test.ts`: 11 tests, including the inline script run against `resolveTheme` with fake browser globals.
- README: decision and test count.

## Verified

| Check | Result |
| --- | --- |
| `tsc`, lint, build, `npm test` | Pass; 134/134 |
| Production build, headless Chrome, class recorded at DOMContentLoaded (before paint and before React) | 12/12: fresh visitor follows the OS from first paint (dark and light); Light overrides a dark OS and survives reload with no flash; Dark overrides a light OS from first paint; System follows OS changes live both ways; phone switch 44x44, icon only, labelled; 0 console errors or warnings (no hydration warning) |

## Notes

- First version of the inline script gave up entirely when storage was blocked, leaving a dark-OS visitor on light. Caught by its own unit test; now only the storage read is guarded.
- The login page has no header, so no switch; it uses the saved choice or the OS.
