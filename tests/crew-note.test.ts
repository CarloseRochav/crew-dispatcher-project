import { describe, expect, it } from "vitest";
import { CREW_NOTE_MAX_LENGTH, crewNoteSchema } from "@/lib/jobs/crew-note";

const jobId = "a0000000-0000-4000-8000-000000000002";

describe("crewNoteSchema", () => {
  it("accepts a job id, the card's status and a note, trimmed", () => {
    expect(crewNoteSchema.parse({ jobId, status: "on_site", note: "  Gate code changed to 4411 \n" })).toEqual({
      jobId,
      status: "on_site",
      note: "Gate code changed to 4411",
    });
  });

  it("accepts a note at the limit", () => {
    const note = "a".repeat(CREW_NOTE_MAX_LENGTH);
    expect(crewNoteSchema.parse({ jobId, status: "done", note }).note).toBe(note);
  });

  it.each([
    ["an empty note", { jobId, status: "on_site", note: "" }],
    ["a note of only spaces and new lines", { jobId, status: "on_site", note: "  \n\t " }],
    ["a note over the limit", { jobId, status: "on_site", note: "a".repeat(CREW_NOTE_MAX_LENGTH + 1) }],
    ["a malformed job id", { jobId: "2", status: "on_site", note: "ok" }],
    ["an unknown status", { jobId, status: "cancelled", note: "ok" }],
    ["a missing status", { jobId, note: "ok" }],
  ])("rejects %s", (_case, input) => {
    expect(crewNoteSchema.safeParse(input).success).toBe(false);
  });

  // Only id, status and note reach update_job_status; anything else a tampered form sends is dropped.
  it("drops extra fields", () => {
    expect(crewNoteSchema.parse({ jobId, status: "done", note: "ok", crew_id: "x", summary: "y" })).toEqual({
      jobId,
      status: "done",
      note: "ok",
    });
  });
});
