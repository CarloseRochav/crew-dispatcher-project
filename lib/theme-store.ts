import {
  DARK_MEDIA_QUERY,
  THEME_STORAGE_KEY,
  parseThemeChoice,
  resolveTheme,
  type ThemeChoice,
} from "./theme";

// Browser-only store for useSyncExternalStore: the choice lives in localStorage
// (per device), the applied theme is the .dark class on <html>.

const listeners = new Set<() => void>();

function readChoice(): ThemeChoice {
  try {
    return parseThemeChoice(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function applyTheme() {
  const prefersDark = window.matchMedia(DARK_MEDIA_QUERY).matches;
  document.documentElement.classList.toggle("dark", resolveTheme(readChoice(), prefersDark) === "dark");
}

function notify() {
  for (const listener of listeners) listener();
}

export function getThemeChoice(): ThemeChoice {
  return readChoice();
}

export function setThemeChoice(choice: ThemeChoice) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
  applyTheme();
  notify();
}

export function subscribeToTheme(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia(DARK_MEDIA_QUERY);
  // System follows the OS live; another tab changing the choice applies here too.
  const onChange = () => {
    applyTheme();
    listener();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) onChange();
  };
  media.addEventListener("change", onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", onChange);
    window.removeEventListener("storage", onStorage);
  };
}
