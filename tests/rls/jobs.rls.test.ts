import { beforeAll, describe, expect, it } from "vitest";
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
