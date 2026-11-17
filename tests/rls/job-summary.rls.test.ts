import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { jobIds, signInAs, type TestClient } from "./helpers";

// Step 14a: jobs.summary is written only by the dispatcher. No new policy guards it;
// these tests prove the existing jobs rules and update_job_status already do.
let dispatcher: TestClient;
let northCrew: TestClient;

const ownJob = jobIds.northScheduled;
const otherCrewJob = jobIds.southScheduled;
const dispatcherSummary = "rls-test: summary written by the dispatcher";

beforeAll(async () => {
  [dispatcher, northCrew] = await Promise.all([signInAs("dispatcher"), signInAs("northCrew")]);
});

async function readJobAsDispatcher(id: string) {
  const { data, error } = await dispatcher.from("jobs").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function setSummaryAsDispatcher(id: string, summary: string) {
  const { error } = await dispatcher.from("jobs").update({ summary }).eq("id", id);
  if (error) throw error;
}

// Each test starts from a known summary and leaves the notes as it found them,
// because the demo and other test files share this database.
let notesBefore: Record<string, string> = {};

beforeEach(async () => {
  const [own, other] = await Promise.all([readJobAsDispatcher(ownJob), readJobAsDispatcher(otherCrewJob)]);
  notesBefore = { [ownJob]: own.notes, [otherCrewJob]: other.notes };
  await Promise.all([
    setSummaryAsDispatcher(ownJob, dispatcherSummary),
    setSummaryAsDispatcher(otherCrewJob, dispatcherSummary),
  ]);
});

afterEach(async () => {
  const results = await Promise.all(
    Object.entries(notesBefore).map(([id, notes]) =>
      dispatcher.from("jobs").update({ summary: "", notes }).eq("id", id),
    ),
  );
  for (const { error } of results) if (error) throw error;
});

describe("the dispatcher writes summaries", () => {
  it("sets and clears a summary", async () => {
    const { data, error } = await dispatcher
      .from("jobs")
      .update({ summary: "rls-test: new summary" })
      .eq("id", ownJob)
      .select("summary")
      .single();

    expect(error).toBeNull();
    expect(data?.summary).toBe("rls-test: new summary");

    await setSummaryAsDispatcher(ownJob, "");
    expect((await readJobAsDispatcher(ownJob)).summary).toBe("");
  });

  it("is refused a summary over 2000 characters", async () => {
    const { error } = await dispatcher.from("jobs").update({ summary: "x".repeat(2001) }).eq("id", ownJob);

    expect(error?.code).toBe("23514");
    expect((await readJobAsDispatcher(ownJob)).summary).toBe(dispatcherSummary);
  });
});

describe("a crew cannot write a summary", () => {
  it("changes nothing with a direct update on its own job", async () => {
    const before = await readJobAsDispatcher(ownJob);

    const { data } = await northCrew
      .from("jobs")
      .update({ summary: "rls-test: written by North Crew" })
      .eq("id", ownJob)
      .select();

    expect(data ?? []).toEqual([]);
    expect(await readJobAsDispatcher(ownJob)).toEqual(before);
  });

  it("changes nothing with a direct update on another crew's job", async () => {
    const before = await readJobAsDispatcher(otherCrewJob);

    const { data } = await northCrew
      .from("jobs")
      .update({ summary: "rls-test: written by North Crew" })
      .eq("id", otherCrewJob)
      .select();

    expect(data ?? []).toEqual([]);
    expect(await readJobAsDispatcher(otherCrewJob)).toEqual(before);
  });

  it("leaves the summary alone when adding a note through update_job_status", async () => {
    const before = await readJobAsDispatcher(ownJob);

    // Same status again: the spec allows this to add a note without moving the job.
    const { data, error } = await northCrew.rpc("update_job_status", {
      p_job_id: ownJob,
      p_new_status: before.status,
      p_note: "rls-test: note from North Crew",
    });

    expect(error).toBeNull();
    expect(data?.notes).toContain("rls-test: note from North Crew");
    expect(data?.summary).toBe(dispatcherSummary);
  });
});

describe("a crew reads summaries only on its own jobs", () => {
  it("reads the summary of its own job", async () => {
    const { data, error } = await northCrew.from("jobs").select("summary").eq("id", ownJob).single();

    expect(error).toBeNull();
    expect(data?.summary).toBe(dispatcherSummary);
  });

  it("gets nothing for another crew's job", async () => {
    const { data, error } = await northCrew
      .from("jobs")
      .select("summary")
      .eq("id", otherCrewJob)
      .maybeSingle();

    expect(error).toBeNull();
    expect(data).toBeNull();
  });
});
