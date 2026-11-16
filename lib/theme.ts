import { z } from "zod";

// docs/spec.md, Design tokens: System (default) follows the OS; Light and Dark override it.
export const THEME_CHOICES = ["system", "light", "dark"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];
export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const DARK_MEDIA_QUERY = "(prefers-color-scheme: dark)";

const themeChoiceSchema = z.enum(THEME_CHOICES);

// localStorage is user-editable: anything unknown falls back to the default.
export function parseThemeChoice(value: unknown): ThemeChoice {
  const parsed = themeChoiceSchema.safeParse(value);
  return parsed.success ? parsed.data : "system";
}

export function nextThemeChoice(choice: ThemeChoice): ThemeChoice {
  return THEME_CHOICES[(THEME_CHOICES.indexOf(choice) + 1) % THEME_CHOICES.length];
}

export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): Theme {
  if (choice === "system") return systemPrefersDark ? "dark" : "light";
  return choice;
}

export const THEME_LABELS: Record<ThemeChoice, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

// Runs inline in <head> before the page paints, so a dark choice never flashes white.
// It cannot import anything, so it repeats resolveTheme in plain JS (tests/theme.test.ts
// runs it against the same cases). Storage can be blocked (some private windows):
// then it acts as System, so the OS setting still applies.
export const themeInitScript = `(function(){var c=null;try{c=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}var d=c==="dark"||(c!=="light"&&window.matchMedia(${JSON.stringify(DARK_MEDIA_QUERY)}).matches);document.documentElement.classList.toggle("dark",d)})()`;
