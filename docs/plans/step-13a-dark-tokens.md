# Step 13a: dark theme tokens (no switch yet)

Approved 2026-11-12, with System as the future default. CSS and spec only; no app code, database or dependency changes.

## Changes

- `app/globals.css`: dark values for every token under `.dark`, `color-scheme: dark` there (and `light` on `:root`) so native date/time pickers, selects and scrollbars follow the theme. Comments updated: two themes, `dark:` tied to the `.dark` class.
- `docs/spec.md`: Design tokens table gains a Dark column, the "two themes, same tokens" rule and the measured contrast.

## Verified

| Check | Result |
| --- | --- |
| Contrast script over every dark text pair | All pass WCAG AA: ink 15.0:1, muted 6.5:1 on surface (5.7:1 on columns), links 6.5:1, primary button 6.7:1, badges 7.1 to 7.7:1, errors 5.8:1 |
| Production build, `.dark` added to `<html>` in headless Chrome | Computed colors match the palette exactly: body, cards, three badges, New job / Save job / Start job, maps link, Live indicator, empty state; date input `color-scheme: dark` |
| Screenshots in dark | Login, board, drawer (Details, History), empty day, crew phone view: all readable, badges distinct |
| Light regression (no `.dark`, OS forced dark and light) | Identical computed colors in both |

## Open

- Input borders are about 1.4:1 against the surface in dark (1.3:1 in light), below the 3:1 WCAG suggests for component edges. Fields stay identifiable by label and fill; left as is pending a decision.
