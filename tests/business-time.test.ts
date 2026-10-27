import { describe, expect, it } from "vitest";
import {
  addDays,
  businessDateOf,
  businessDateTimeOf,
  businessDayRange,
  businessInstant,
  formatJobTime,
} from "@/lib/business-time";

describe("businessInstant", () => {
  it("converts a daylight-saving time (UTC-7)", () => {
    expect(businessInstant("2026-10-22", "14:30")?.toISOString()).toBe("2026-10-22T21:30:00.000Z");
  });

  it("converts a winter time (UTC-8)", () => {
    expect(businessInstant("2026-12-15", "09:00")?.toISOString()).toBe("2026-12-15T17:00:00.000Z");
  });

  it("converts midnight to 07:00 UTC the same day", () => {
    expect(businessInstant("2026-10-22", "00:00")?.toISOString()).toBe("2026-10-22T07:00:00.000Z");
  });

  it("returns null for a time skipped when clocks spring forward (Mar 8, 2026)", () => {
    expect(businessInstant("2026-03-08", "02:30")).toBeNull();
  });

  it("converts the times on either side of the spring-forward gap", () => {
    expect(businessInstant("2026-03-08", "01:59")?.toISOString()).toBe("2026-03-08T09:59:00.000Z");
    expect(businessInstant("2026-03-08", "03:00")?.toISOString()).toBe("2026-03-08T10:00:00.000Z");
  });

  it("takes the first 1:30 when clocks fall back (Nov 1, 2026)", () => {
    expect(businessInstant("2026-11-01", "01:30")?.toISOString()).toBe("2026-11-01T08:30:00.000Z");
  });
});

describe("businessDateTimeOf", () => {
  it("gives the date and 24-hour time on the business clock", () => {
    expect(businessDateTimeOf(new Date("2026-10-23T03:15:00Z"))).toEqual({
      date: "2026-10-22",
      time: "20:15",
    });
  });

  it("round-trips with businessInstant", () => {
    const instant = new Date("2026-12-15T17:45:00Z");
    const { date, time } = businessDateTimeOf(instant);
    expect(businessInstant(date, time)?.toISOString()).toBe(instant.toISOString());
  });
});

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
