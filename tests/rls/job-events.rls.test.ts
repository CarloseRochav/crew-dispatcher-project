import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { JobStatus } from "@/lib/jobs/status";
import { anonClient, crewIds, jobIds, signInAs, type TestClient } from "./helpers";

// Step 10a decisions (docs/spec.md, Job timeline): events for creation and status
// changes only, written only by the trigger, readable only by the dispatcher.
let dispatcher: TestClient;
let northCrew: TestClient;
let dispatcherId: string;
let northCrewId: string;

beforeAll(async () => {
  [dispatcher, northCrew] = await Promise.all([signInAs("dispatcher"), signInAs("northCrew")]);
  [dispatcherId, northCrewId] = await Promise.all([userId(dispatcher), userId(northCrew)]);
});

async function userId(client: TestClient) {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw error ?? new Error("No user");
  return data.user.id;
}

// The database is shared and keeps every past event, so each test only looks at
// events newer than the job's latest one before it acted. Uses the database's
// clock, never this machine's.
async function latestEventAt(jobId: string) {
  const { data, error } = await dispatcher
    .from("job_events")
    .select("created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data[0]?.created_at ?? "1970-01-01T00:00:00Z";
}

async function eventsSince(jobId: string, since: string) {
  const { data, error } = await dispatcher
    .from("job_events")
    .select("changed_by, old_status, new_status")
    .eq("job_id", jobId)
    .gt("created_at", since)
    .order("created_at");
  if (error) throw error;
  return data;
}

async function setStatusAsDispatcher(id: string, status: JobStatus) {
  const { error } = await dispatcher.from("jobs").update({ status }).eq("id", id).neq("status", status);
  if (error) throw error;
}

describe("the trigger writes the timeline", () => {
  // Tests start and end with North's 2:00 PM job on Scheduled, as in the seed.
  beforeEach(() => setStatusAsDispatcher(jobIds.northScheduled, "scheduled"));
  afterEach(() => setStatusAsDispatcher(jobIds.northScheduled, "scheduled"));

  it("logs a crew tap with the crew member as the one who changed it", async () => {
    const since = await latestEventAt(jobIds.northScheduled);

    const { error } = await northCrew.rpc("update_job_status", {
      p_job_id: jobIds.northScheduled,
      p_new_status: "on_site",
    });

    expect(error).toBeNull();
    expect(await eventsSince(jobIds.northScheduled, since)).toEqual([
      { changed_by: northCrewId, old_status: "scheduled", new_status: "on_site" },
    ]);
  });

  it("logs a crew undo as its own event", async () => {
    await setStatusAsDispatcher(jobIds.northScheduled, "on_site");
    const since = await latestEventAt(jobIds.northScheduled);

    const { error } = await northCrew.rpc("update_job_status", {
      p_job_id: jobIds.northScheduled,
      p_new_status: "scheduled",
    });

    expect(error).toBeNull();
    expect(await eventsSince(jobIds.northScheduled, since)).toEqual([
      { changed_by: northCrewId, old_status: "on_site", new_status: "scheduled" },
    ]);
  });

  it("logs a dispatcher status fix with the dispatcher as the one who changed it", async () => {
    const since = await latestEventAt(jobIds.northScheduled);

    await setStatusAsDispatcher(jobIds.northScheduled, "done");

    expect(await eventsSince(jobIds.northScheduled, since)).toEqual([
      { changed_by: dispatcherId, old_status: "scheduled", new_status: "done" },
    ]);
  });

  it("logs nothing when an edit leaves the status alone", async () => {
    const since = await latestEventAt(jobIds.northScheduled);
    const { data: job, error: readError } = await dispatcher
      .from("jobs")
      .select("notes")
      .eq("id", jobIds.northScheduled)
      .single();
    if (readError) throw readError;

    const edit = await dispatcher
      .from("jobs")
      .update({ notes: `${job.notes} (timeline test)` })
      .eq("id", jobIds.northScheduled);
    const sameStatus = await dispatcher
      .from("jobs")
      .update({ status: "scheduled" })
      .eq("id", jobIds.northScheduled);
    const restore = await dispatcher.from("jobs").update({ notes: job.notes }).eq("id", jobIds.northScheduled);

    expect(edit.error).toBeNull();
    expect(sameStatus.error).toBeNull();
    expect(restore.error).toBeNull();
    expect(await eventsSince(jobIds.northScheduled, since)).toEqual([]);
  });

  it("logs a new job as created, and deleting the job deletes its history", async () => {
    const { data: job, error } = await dispatcher
      .from("jobs")
      .insert({
        customer_name: "Timeline Test Customer",
        address: "1 Test Street, Brookvale",
        job_type: "Test",
        scheduled_for: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        crew_id: crewIds.north,
      })
      .select("id")
      .single();
    if (error) throw error;

    try {
      expect(await eventsSince(job.id, "1970-01-01T00:00:00Z")).toEqual([
        { changed_by: dispatcherId, old_status: null, new_status: "scheduled" },
      ]);
    } finally {
      const { error: deleteError } = await dispatcher.from("jobs").delete().eq("id", job.id);
      if (deleteError) throw deleteError;
    }

    expect(await eventsSince(job.id, "1970-01-01T00:00:00Z")).toEqual([]);
  });
});

describe("only the dispatcher reads the timeline", () => {
  // Proves the reads below return nothing because of the policy, not because there is nothing.
  it("dispatcher reads events for any crew's job", async () => {
    await setStatusAsDispatcher(jobIds.southScheduled, "on_site");
    await setStatusAsDispatcher(jobIds.southScheduled, "scheduled");

    const { data, error } = await dispatcher.from("job_events").select("id").eq("job_id", jobIds.southScheduled);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
  });

  it("a crew cannot read another crew's job events", async () => {
    const { data, error } = await northCrew.from("job_events").select("id").eq("job_id", jobIds.southScheduled);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("a crew cannot read its own job events either", async () => {
    const { data, error } = await northCrew.from("job_events").select("id");

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("a logged-out visitor cannot read events", async () => {
    const { data, error } = await anonClient().from("job_events").select("id");

    expect(data).toBeNull();
    expect(error?.code).toBe("42501");
  });
});

describe("nobody can write the timeline directly", () => {
  const fakeEvent = { job_id: jobIds.northScheduled, old_status: "done", new_status: "scheduled" } as const;

  it("dispatcher cannot insert an event", async () => {
    const { error } = await dispatcher.from("job_events").insert(fakeEvent);
    expect(error?.code).toBe("42501");
  });

  it("crew cannot insert an event", async () => {
    const { error } = await northCrew.from("job_events").insert(fakeEvent);
    expect(error?.code).toBe("42501");
  });

  it("dispatcher cannot change an event", async () => {
    const { error } = await dispatcher
      .from("job_events")
      .update({ changed_by: null })
      .eq("job_id", jobIds.northScheduled);
    expect(error?.code).toBe("42501");
  });

  it("dispatcher cannot delete an event", async () => {
    const { error } = await dispatcher.from("job_events").delete().eq("job_id", jobIds.northScheduled);
    expect(error?.code).toBe("42501");
  });
});
