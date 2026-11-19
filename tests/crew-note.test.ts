import { describe, expect, it } from "vitest";
import { CREW_NOTE_MAX_LENGTH, crewNoteSchema } from "@/lib/jobs/crew-note";

const jobId = "a0000000-0000-4000-8000-000000000002";

describe("crewNoteSchema", () => {
  it("accepts a job id and a note, trimmed", () => {
    expect(crewNoteSchema.parse({ jobId, note: "  Gate code changed to 4411 \n" })).toEqual({
      jobId,
      note: "Gate code changed to 4411",
    });
  });

  it("accepts a note at the limit", () => {
    const note = "a".repeat(CREW_NOTE_MAX_LENGTH);
    expect(crewNoteSchema.parse({ jobId, note }).note).toBe(note);
  });

  it.each([
    ["an empty note", { jobId, note: "" }],
    ["a note of only spaces and new lines", { jobId, note: "  \n\t " }],
    ["a note over the limit", { jobId, note: "a".repeat(CREW_NOTE_MAX_LENGTH + 1) }],
    ["a malformed job id", { jobId: "2", note: "ok" }],
    ["a missing note", { jobId }],
  ])("rejects %s", (_case, input) => {
    expect(crewNoteSchema.safeParse(input).success).toBe(false);
  });

  // Only id and note reach update_job_status. A tampered form that adds a status
  // must not be able to move the job through the note action.
  it("drops extra fields, including a status", () => {
    expect(crewNoteSchema.parse({ jobId, note: "ok", status: "done", crew_id: "x", summary: "y" })).toEqual({
      jobId,
      note: "ok",
    });
  });
});
