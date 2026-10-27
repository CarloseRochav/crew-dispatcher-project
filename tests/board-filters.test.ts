import { describe, expect, it } from "vitest";
import { boardHref, parseBoardFilters, parseOpenJobId } from "@/lib/jobs/board-filters";

describe("parseOpenJobId", () => {
  const jobId = "a0000000-0000-4000-8000-000000000001";

  it("reads a job id from the URL", () => {
    expect(parseOpenJobId({ job: jobId })).toBe(jobId);
  });

  it.each([
    ["no job", {}],
    ["a malformed id", { job: "not-a-uuid" }],
  ])("opens nothing for %s", (_case, searchParams) => {
    expect(parseOpenJobId(searchParams)).toBeNull();
  });

  it("adds the open job to the board link", () => {
    expect(boardHref({ date: "2026-10-22", crew: "all" }, jobId)).toBe(
      `/board?date=2026-10-22&crew=all&job=${jobId}`,
    );
  });
});

const today = "2026-10-22";
const northCrewId = "c0000000-0000-4000-8000-000000000001";

describe("parseBoardFilters", () => {
  it("defaults to today and all crews", () => {
    expect(parseBoardFilters({}, today)).toEqual({ date: today, crew: "all" });
  });

  it("keeps a valid date and crew", () => {
    expect(parseBoardFilters({ date: "2026-10-23", crew: northCrewId }, today)).toEqual({
      date: "2026-10-23",
      crew: northCrewId,
    });
  });

  it("accepts the unassigned filter", () => {
    expect(parseBoardFilters({ crew: "unassigned" }, today).crew).toBe("unassigned");
  });

  it.each([
    ["a malformed date", { date: "22/10/2026" }],
    ["an impossible date", { date: "2026-02-30" }],
    ["an unknown crew value", { crew: "north" }],
    ["an injected filter", { crew: "all) or (true" }],
  ])("falls back to the default for %s", (_case, searchParams) => {
    expect(parseBoardFilters(searchParams, today)).toEqual({ date: today, crew: "all" });
  });

  it("uses the first value when a param repeats", () => {
    expect(parseBoardFilters({ date: ["2026-10-23", "2026-10-24"] }, today).date).toBe("2026-10-23");
  });
});

describe("boardHref", () => {
  it("builds the board URL from filters", () => {
    expect(boardHref({ date: today, crew: "unassigned" })).toBe("/board?date=2026-10-22&crew=unassigned");
  });
});
