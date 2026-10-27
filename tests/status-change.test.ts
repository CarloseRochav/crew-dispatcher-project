import { describe, expect, it } from "vitest";
import { statusChangeSchema } from "@/lib/jobs/status-change";

const jobId = "a0000000-0000-4000-8000-000000000002";

describe("statusChangeSchema", () => {
  it("accepts a job id and a status", () => {
    expect(statusChangeSchema.parse({ jobId, status: "done" })).toEqual({ jobId, status: "done" });
  });

  it.each([
    ["a malformed job id", { jobId: "2", status: "done" }],
    ["an unknown status", { jobId, status: "cancelled" }],
    ["a missing status", { jobId }],
  ])("rejects %s", (_case, input) => {
    expect(statusChangeSchema.safeParse(input).success).toBe(false);
  });

  // Only id and status reach update_job_status; anything else a tampered form sends is dropped.
  it("drops extra fields", () => {
    expect(statusChangeSchema.parse({ jobId, status: "done", crew_id: "x", notes: "y" })).toEqual({
      jobId,
      status: "done",
    });
  });
});
