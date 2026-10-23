import { describe, expect, it } from "vitest";
import { loginSchema } from "@/app/login/schema";
import { homePathFor } from "@/lib/home-path";

describe("loginSchema", () => {
  it("accepts an email and a password", () => {
    const result = loginSchema.safeParse({ email: "north.crew@example.com", password: "secret" });

    expect(result.success).toBe(true);
  });

  it.each([
    ["a malformed email", { email: "north.crew", password: "secret" }],
    ["an empty password", { email: "north.crew@example.com", password: "" }],
    // FormData.get returns null for a missing field.
    ["missing fields", { email: null, password: null }],
  ])("rejects %s", (_case, input) => {
    expect(loginSchema.safeParse(input).success).toBe(false);
  });
});

describe("homePathFor", () => {
  it("sends the dispatcher to the board", () => {
    expect(homePathFor("dispatcher")).toBe("/board");
  });

  it("sends a crew member to the day view", () => {
    expect(homePathFor("crew")).toBe("/crew");
  });
});
