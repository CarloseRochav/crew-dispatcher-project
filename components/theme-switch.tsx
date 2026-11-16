"use client";

import { Monitor, Moon, Sun, SunMoon, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { THEME_LABELS, nextThemeChoice, type ThemeChoice } from "@/lib/theme";
import { getThemeChoice, setThemeChoice, subscribeToTheme } from "@/lib/theme-store";

const ICONS: Record<ThemeChoice, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };

// The server cannot read localStorage, so it renders a neutral "Theme" button
// and the real choice appears right after hydration (no mismatch warning).
function getServerChoice(): ThemeChoice | null {
  return null;
}

export function ThemeSwitch() {
  const choice = useSyncExternalStore(subscribeToTheme, getThemeChoice, getServerChoice);
  const Icon = choice ? ICONS[choice] : SunMoon;
  const label = choice ? THEME_LABELS[choice] : "Theme";
  const next = nextThemeChoice(choice ?? "system");

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 min-w-11 px-3"
      onClick={() => setThemeChoice(next)}
      aria-label={`Theme: ${label}. Switch to ${THEME_LABELS[next]}`}
      title={`Theme: ${label}`}
    >
      <Icon aria-hidden />
      {/* Icon only on phones to save header room; the aria-label names it there. */}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}
