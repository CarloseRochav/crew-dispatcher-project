import { formatEventTime } from "@/lib/business-time";
import type { JobEvent } from "./queries";
import type { JobStatus } from "./status";

export type TimelineChange =
  | { kind: "created"; status: JobStatus }
  | { kind: "status"; from: JobStatus; to: JobStatus };

export type TimelineEntry = {
  id: string;
  who: string;
  change: TimelineChange;
  at: string;
  when: string;
};

// No profile: the change was made with no login (SQL Editor, seed), per the Step 10a decision.
export function eventAuthor(profile: JobEvent["changed_by_profile"]) {
  if (!profile) return "System";
  return profile.name.trim() || "Unknown user";
}

export function toTimelineEntry(event: JobEvent): TimelineEntry {
  return {
    id: event.id,
    who: eventAuthor(event.changed_by_profile),
    change:
      event.old_status === null
        ? { kind: "created", status: event.new_status }
        : { kind: "status", from: event.old_status, to: event.new_status },
    at: event.created_at,
    when: formatEventTime(event.created_at),
  };
}
