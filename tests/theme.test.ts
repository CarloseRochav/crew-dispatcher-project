import { describe, expect, it } from "vitest";
import { nextThemeChoice, parseThemeChoice, resolveTheme, themeInitScript } from "@/lib/theme";

describe("parseThemeChoice", () => {
  it("keeps a known choice", () => {
    expect(parseThemeChoice("dark")).toBe("dark");
    expect(parseThemeChoice("light")).toBe("light");
  });

  it("falls back to System for nothing or anything unknown", () => {
    expect(parseThemeChoice(null)).toBe("system");
    expect(parseThemeChoice("purple")).toBe("system");
    expect(parseThemeChoice(42)).toBe("system");
  });
});

describe("nextThemeChoice", () => {
  it("cycles System, Light, Dark and back", () => {
    expect(nextThemeChoice("system")).toBe("light");
    expect(nextThemeChoice("light")).toBe("dark");
    expect(nextThemeChoice("dark")).toBe("system");
  });
});

describe("resolveTheme", () => {
  it("follows the OS only for System", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

// The inline script repeats resolveTheme in plain JS; run it with fake browser
// globals so the two can never drift apart.
function runInitScript(stored: string | null, systemPrefersDark: boolean, storageThrows = false) {
  const classes = new Set<string>();
  const fakeWindow = {
    matchMedia: () => ({ matches: systemPrefersDark }),
  };
  const fakeStorage = {
    getItem: () => {
      if (storageThrows) throw new Error("blocked");
      return stored;
    },
  };
  const fakeDocument = {
    documentElement: {
      classList: {
        toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
      },
    },
  };
  new Function("window", "localStorage", "document", themeInitScript)(fakeWindow, fakeStorage, fakeDocument);
  return classes.has("dark");
}

describe("themeInitScript", () => {
  const cases: [string | null, boolean][] = [
    [null, true],
    [null, false],
    ["system", true],
    ["light", true],
    ["dark", false],
    ["garbage", true],
  ];

  it.each(cases)("stored %s with OS dark %s matches resolveTheme", (stored, systemPrefersDark) => {
    const expected = resolveTheme(parseThemeChoice(stored), systemPrefersDark) === "dark";
    expect(runInitScript(stored, systemPrefersDark)).toBe(expected);
  });

  it("acts as System when storage is blocked", () => {
    expect(runInitScript(null, true, true)).toBe(true);
    expect(runInitScript(null, false, true)).toBe(false);
  });
});
