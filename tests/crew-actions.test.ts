import { describe, expect, it } from "vitest";
import { crewStatusMoves } from "@/lib/jobs/crew-actions";
import { JOB_STATUSES } from "@/lib/jobs/status";

describe("crewStatusMoves", () => {
  it("offers Start job on a scheduled job, with nothing to undo", () => {
    expect(crewStatusMoves("scheduled")).toEqual({
      next: { status: "on_site", label: "Start job" },
      undo: null,
    });
  });

  it("offers Mark done on an on-site job, and undo back to scheduled", () => {
    expect(crewStatusMoves("on_site")).toEqual({
      next: { status: "done", label: "Mark done" },
      undo: { status: "scheduled", label: "Back to Scheduled" },
    });
  });

  it("offers only Reopen on a done job", () => {
    expect(crewStatusMoves("done")).toEqual({
      next: null,
      undo: { status: "on_site", label: "Reopen" },
    });
  });

  // Same rule as update_job_status: never more than one step, so the database never refuses a button.
  it.each(JOB_STATUSES)("never offers a jump from %s", (status) => {
    const { next, undo } = crewStatusMoves(status);
    const position = JOB_STATUSES.indexOf(status);

    if (next) expect(JOB_STATUSES.indexOf(next.status)).toBe(position + 1);
    if (undo) expect(JOB_STATUSES.indexOf(undo.status)).toBe(position - 1);
  });
});
