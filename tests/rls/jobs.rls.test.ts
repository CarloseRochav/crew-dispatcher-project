import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { JobStatus } from "@/lib/jobs/status";
import {
  anonClient,
  crewIds,
  jobIds,
  seedJobIds,
  signInAs,
  type JobUpdate,
  type TestClient,
} from "./helpers";

// North Crew plays the attacker, South Crew's jobs are the target.
let dispatcher: TestClient;
let northCrew: TestClient;

beforeAll(async () => {
  [dispatcher, northCrew] = await Promise.all([signInAs("dispatcher"), signInAs("northCrew")]);
});

// A refused write must be proven by the data, not just by a missing error:
// RLS silently skips rows on update and delete.
async function readJobAsDispatcher(id: string) {
  const { data, error } = await dispatcher.from("jobs").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

// Without these, a broken login would return nothing and every "cannot" test would pass.
describe("baseline: the rules still let people work", () => {
  it("dispatcher reads every seeded job", async () => {
    const { data, error } = await dispatcher.from("jobs").select("id").in("id", seedJobIds);

    expect(error).toBeNull();
    expect(data).toHaveLength(seedJobIds.length);
  });

  it("crew reads its own jobs", async () => {
    const { data, error } = await northCrew.from("jobs").select("id").eq("id", jobIds.northScheduled);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });
});

describe("a crew cannot read another crew's jobs", () => {
  it("lists only its own crew's jobs", async () => {
    const { data, error } = await northCrew.from("jobs").select("crew_id");

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.every((job) => job.crew_id === crewIds.north)).toBe(true);
  });

  it("gets nothing when filtering by the other crew", async () => {
    const { data, error } = await northCrew.from("jobs").select("id").eq("crew_id", crewIds.south);

    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it("gets nothing when asking for the other crew's job by id", async () => {
    const { data, error } = await northCrew
      .from("jobs")
      .select("id")
      .eq("id", jobIds.southScheduled)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();
  });

  it("sees only its own crew in the crews table", async () => {
    const { data, error } = await northCrew.from("crews").select("id");

    expect(error).toBeNull();
    expect(data).toEqual([{ id: crewIds.north }]);
  });
});

describe("a crew cannot edit another crew's job", () => {
  it("changes nothing with a direct update", async () => {
    const before = await readJobAsDispatcher(jobIds.southScheduled);

    const { data } = await northCrew
      .from("jobs")
      .update({ notes: "rls-test: written by North Crew" })
      .eq("id", jobIds.southScheduled)
      .select();

    expect(data ?? []).toEqual([]);
    expect(await readJobAsDispatcher(jobIds.southScheduled)).toEqual(before);
  });

  it("gets 'Job not found' from update_job_status", async () => {
    const before = await readJobAsDispatcher(jobIds.southScheduled);

    const { error } = await northCrew.rpc("update_job_status", {
      p_job_id: jobIds.southScheduled,
      p_new_status: "on_site",
      p_note: "rls-test: written by North Crew",
    });

    expect(error?.code).toBe("P0002");
    expect(error?.message).toBe("Job not found");
    expect(await readJobAsDispatcher(jobIds.southScheduled)).toEqual(before);
  });
});

describe("a crew can undo one status step on its own job (Step 7 decision)", () => {
  const seedStatuses: [string, JobStatus][] = [
    [jobIds.northDone, "done"],
    [jobIds.northOnSite, "on_site"],
    [jobIds.northScheduled, "scheduled"],
    [jobIds.southOnSite, "on_site"],
  ];

  async function resetSeedStatuses() {
    const results = await Promise.all(
      seedStatuses.map(([id, status]) =>
        dispatcher.from("jobs").update({ status }).eq("id", id).neq("status", status),
      ),
    );
    for (const { error } of results) if (error) throw error;
  }

  // Before: clicking through the app moves seeded jobs, and these tests start from the seed.
  // After: so other tests and the demo see the seed again.
  beforeEach(resetSeedStatuses);
  afterEach(resetSeedStatuses);

  async function moveAsNorthCrew(id: string, status: JobStatus) {
    return northCrew.rpc("update_job_status", { p_job_id: id, p_new_status: status });
  }

  it("moves an on-site job back to scheduled, then forward again", async () => {
    const back = await moveAsNorthCrew(jobIds.northOnSite, "scheduled");
    expect(back.error).toBeNull();
    expect(back.data?.status).toBe("scheduled");

    const forward = await moveAsNorthCrew(jobIds.northOnSite, "on_site");
    expect(forward.error).toBeNull();
    expect(forward.data?.status).toBe("on_site");
  });

  it("moves a done job back to on site", async () => {
    const { data, error } = await moveAsNorthCrew(jobIds.northDone, "on_site");

    expect(error).toBeNull();
    expect(data?.status).toBe("on_site");
  });

  it.each<[JobStatus, JobStatus, string]>([
    ["done", "scheduled", jobIds.northDone],
    ["scheduled", "done", jobIds.northScheduled],
  ])("refuses a jump from %s to %s", async (_from, to, id) => {
    const before = await readJobAsDispatcher(id);

    const { error } = await moveAsNorthCrew(id, to);

    expect(error?.code).toBe("22023");
    expect(await readJobAsDispatcher(id)).toEqual(before);
  });

  it("cannot undo another crew's job", async () => {
    const before = await readJobAsDispatcher(jobIds.southOnSite);

    const { error } = await moveAsNorthCrew(jobIds.southOnSite, "scheduled");

    expect(error?.code).toBe("P0002");
    expect(error?.message).toBe("Job not found");
    expect(await readJobAsDispatcher(jobIds.southOnSite)).toEqual(before);
  });
});

describe("a crew note with no status keeps the job's status (Step 17)", () => {
  const touchedIds = [jobIds.northOnSite, jobIds.northDone];
  let snapshots: { id: string; status: JobStatus; notes: string }[] = [];

  // Notes are appended, so each test puts back the exact status and notes it found.
  beforeEach(async () => {
    snapshots = await Promise.all(
      touchedIds.map(async (id) => {
        const { status, notes } = await readJobAsDispatcher(id);
        return { id, status, notes };
      }),
    );
  });

  afterEach(async () => {
    const results = await Promise.all(
      snapshots.map(({ id, status, notes }) => dispatcher.from("jobs").update({ status, notes }).eq("id", id)),
    );
    for (const { error } of results) if (error) throw error;
  });

  function noteAsNorthCrew(id: string, note: string | undefined) {
    return northCrew.rpc("update_job_status", { p_job_id: id, p_note: note });
  }

  it("adds the note and leaves the status as it was", async () => {
    const before = await readJobAsDispatcher(jobIds.northOnSite);
    const note = "rls-test: note with no status";

    const { data, error } = await noteAsNorthCrew(jobIds.northOnSite, note);

    expect(error).toBeNull();
    expect(data?.status).toBe(before.status);
    expect(data?.notes).toBe(before.notes === "" ? note : `${before.notes}\n${note}`);
  });

  // The Step 16 race: the dispatcher moves the job, then a crew sends a note from a stale card.
  it("keeps a status the dispatcher just set", async () => {
    const moved = await dispatcher.from("jobs").update({ status: "done" }).eq("id", jobIds.northOnSite);
    expect(moved.error).toBeNull();

    const { data, error } = await noteAsNorthCrew(jobIds.northOnSite, "rls-test: note after the dispatcher's move");

    expect(error).toBeNull();
    expect(data?.status).toBe("done");
  });

  it.each([
    ["no note", undefined],
    ["a note of only spaces", "   "],
  ])("refuses a call with no status and %s", async (_case, note) => {
    const before = await readJobAsDispatcher(jobIds.northDone);

    const { error } = await noteAsNorthCrew(jobIds.northDone, note);

    expect(error?.code).toBe("22004");
    expect(await readJobAsDispatcher(jobIds.northDone)).toEqual(before);
  });

  it("gets 'Job not found' on another crew's job", async () => {
    const before = await readJobAsDispatcher(jobIds.southOnSite);

    const { error } = await noteAsNorthCrew(jobIds.southOnSite, "rls-test: written by North Crew");

    expect(error?.code).toBe("P0002");
    expect(error?.message).toBe("Job not found");
    expect(await readJobAsDispatcher(jobIds.southOnSite)).toEqual(before);
  });
});

describe("a crew cannot change customer, address or crew on its own job", () => {
  it.each<[string, JobUpdate]>([
    ["customer", { customer_name: "rls-test customer" }],
    ["address", { address: "rls-test address" }],
    ["crew", { crew_id: crewIds.south }],
  ])("%s stays the same after a direct update", async (_field, patch) => {
    const before = await readJobAsDispatcher(jobIds.northScheduled);

    const { data } = await northCrew
      .from("jobs")
      .update(patch)
      .eq("id", jobIds.northScheduled)
      .select();

    expect(data ?? []).toEqual([]);
    expect(await readJobAsDispatcher(jobIds.northScheduled)).toEqual(before);
  });
});

describe("extra guards from the migration", () => {
  it("a logged-out client reads no jobs", async () => {
    const { data } = await anonClient().from("jobs").select("id");

    expect(data ?? []).toEqual([]);
  });

  it("a crew cannot create a job", async () => {
    const { data, error } = await northCrew
      .from("jobs")
      .insert({
        customer_name: "rls-test customer",
        address: "rls-test address",
        job_type: "rls-test",
        scheduled_for: new Date().toISOString(),
        crew_id: crewIds.north,
      })
      .select();

    expect(error).not.toBeNull();
    expect(data).toBeNull();
  });

  it("a crew cannot delete its own job", async () => {
    const { data } = await northCrew.from("jobs").delete().eq("id", jobIds.northOnSite).select();

    expect(data ?? []).toEqual([]);
    expect(await readJobAsDispatcher(jobIds.northOnSite)).toMatchObject({ id: jobIds.northOnSite });
  });

  it("a crew cannot promote itself or switch crews", async () => {
    const { data: auth } = await northCrew.auth.getUser();
    const userId = auth.user?.id ?? "";

    await northCrew
      .from("profiles")
      .update({ role: "dispatcher", crew_id: crewIds.south })
      .eq("id", userId);

    const { data: profile, error } = await northCrew
      .from("profiles")
      .select("role, crew_id")
      .eq("id", userId)
      .single();

    expect(error).toBeNull();
    expect(profile).toEqual({ role: "crew", crew_id: crewIds.north });
  });
});
