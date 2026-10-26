import { describe, expect, it } from "vitest";
import { addDays, businessDateOf, businessDayRange, formatJobTime } from "@/lib/business-time";

describe("businessDayRange", () => {
  it("covers a normal daylight-saving day (UTC-7)", () => {
    const { start, end } = businessDayRange("2026-10-22");

    expect(start.toISOString()).toBe("2026-10-22T07:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-23T07:00:00.000Z");
  });

  it("is 25 hours on the day clocks fall back (Nov 1, 2026)", () => {
    const { start, end } = businessDayRange("2026-11-01");

    expect(start.toISOString()).toBe("2026-11-01T07:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-02T08:00:00.000Z");
  });

  it("is 23 hours on the day clocks spring forward (Mar 8, 2026)", () => {
    const { start, end } = businessDayRange("2026-03-08");

    expect(start.toISOString()).toBe("2026-03-08T08:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-09T07:00:00.000Z");
  });
});

describe("businessDateOf", () => {
  // 03:00 UTC on Oct 23 is still the evening of Oct 22 in Tijuana.
  it("uses the business clock, not UTC", () => {
    expect(businessDateOf(new Date("2026-10-23T03:00:00Z"))).toBe("2026-10-22");
  });
});

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });
});

describe("formatJobTime", () => {
  it("shows the time on the business clock", () => {
    expect(formatJobTime("2026-10-22T21:30:00Z")).toBe("2:30 PM");
  });
});
