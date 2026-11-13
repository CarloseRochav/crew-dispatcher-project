# Step 11: stop shadcn's dark styles following the OS

Approved 2026-11-12. One CSS rule; no app code, database or dependency changes.

## Problem

`app/globals.css` defined no `dark` variant, so Tailwind's `dark:` used `prefers-color-scheme: dark`. On a dark-mode device, the `dark:` classes in four shadcn components (button, input, tabs, textarea) landed on top of the single light theme: grey overlays on inputs, outline buttons and the selected tab. Found while checking Step 10b.

## Fix

`@custom-variant dark (&:where(.dark, .dark *));` in `app/globals.css`. The app never sets `.dark`, so those styles stay off until a dark theme is designed.

## Verified

- Production CSS: 0 `prefers-color-scheme: dark` rules (2 before), 33 `.dark`-scoped rules.
- Production build in headless Chrome with the OS scheme forced to dark and to light: selected tab, Cancel, Sign out and inputs computed identical colors.
- The running `next dev` server kept serving the old CSS until restarted; the first check against it showed no change.
