import { describe, expect, it } from "vitest";
import { mapsSearchUrl } from "@/lib/jobs/maps";

describe("mapsSearchUrl", () => {
  it("builds a Google Maps search link", () => {
    expect(mapsSearchUrl("418 Juniper Lane, Brookvale")).toBe(
      "https://www.google.com/maps/search/?api=1&query=418%20Juniper%20Lane%2C%20Brookvale",
    );
  });

  // An address is typed by the dispatcher; it must stay one query value.
  it("encodes characters that would break the link", () => {
    const url = new URL(mapsSearchUrl("Unit #4 & Rear, 12/B Main St?x=1"));

    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/search/");
    expect([...url.searchParams.keys()]).toEqual(["api", "query"]);
    expect(url.searchParams.get("query")).toBe("Unit #4 & Rear, 12/B Main St?x=1");
  });
});
