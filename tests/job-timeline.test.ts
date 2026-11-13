import { describe, expect, it } from "vitest";
import { formatEventTime } from "@/lib/business-time";
import { eventAuthor, toTimelineEntry } from "@/lib/jobs/timeline";
import type { JobEvent } from "@/lib/jobs/queries";

function event(overrides: Partial<JobEvent>): JobEvent {
  return {
    id: "e1",
    old_status: "scheduled",
    new_status: "on_site",
    created_at: "2026-11-12T22:14:00Z",
    changed_by_profile: { name: "Marco Lindqvist" },
    ...overrides,
  };
}

describe("formatEventTime", () => {
  it("shows the day and time on the business clock (UTC-8 in November)", () => {
    expect(formatEventTime("2026-11-12T22:14:00Z")).toBe("Thu, Nov 12 · 2:14 PM");
  });

  it("uses the business day, not the UTC day, late in the evening", () => {
    // 05:30 UTC on Nov 13 is still 9:30 PM on Nov 12 in Tijuana.
    expect(formatEventTime("2026-11-13T05:30:00Z")).toBe("Thu, Nov 12 · 9:30 PM");
  });
});

describe("eventAuthor", () => {
  it("names the person who made the change", () => {
    expect(eventAuthor({ name: "Marco Lindqvist" })).toBe("Marco Lindqvist");
  });

  it("says System for a change made with no login", () => {
    expect(eventAuthor(null)).toBe("System");
  });

  it("says Unknown user for a profile with no name", () => {
    expect(eventAuthor({ name: "  " })).toBe("Unknown user");
  });
});

describe("toTimelineEntry", () => {
  it("turns a status change into from and to", () => {
    expect(toTimelineEntry(event({}))).toEqual({
      id: "e1",
      who: "Marco Lindqvist",
      change: { kind: "status", from: "scheduled", to: "on_site" },
      at: "2026-11-12T22:14:00Z",
      when: "Thu, Nov 12 · 2:14 PM",
    });
  });

  it("turns an event with no old status into a created entry", () => {
    const entry = toTimelineEntry(event({ old_status: null, new_status: "scheduled", changed_by_profile: null }));

    expect(entry.change).toEqual({ kind: "created", status: "scheduled" });
    expect(entry.who).toBe("System");
  });
});
