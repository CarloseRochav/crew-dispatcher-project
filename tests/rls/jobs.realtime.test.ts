import type { RealtimeChannel } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { anonClient, jobIds, signInAs, type TestClient } from "./helpers";

// Realtime uses the same RLS select policies as queries: these tests prove a
// subscriber only hears about jobs it may read.

const MARKER = " [realtime-test]";
// After the expected event, wait this long for any event that should not come.
const STRAY_EVENT_WAIT_MS = 1500;
const EVENT_TIMEOUT_MS = 8000;

let dispatcher: TestClient;
let northCrew: TestClient;
let anon: TestClient;
const originalNotes = new Map<string, string>();

beforeAll(async () => {
  [dispatcher, northCrew] = await Promise.all([signInAs("dispatcher"), signInAs("northCrew")]);
  anon = anonClient();
});

afterAll(async () => {
  await Promise.all([dispatcher, northCrew, anon].map((client) => client.removeAllChannels()));
});

// Put back every note a test touched, so the seed stays as it was.
afterEach(async () => {
  for (const [id, notes] of originalNotes) {
    const { error } = await dispatcher.from("jobs").update({ notes }).eq("id", id);
    if (error) throw error;
  }
  originalNotes.clear();
});

type JobListener = {
  // Ids of the jobs that arrived in update events, in order.
  jobIds: string[];
  channel: RealtimeChannel;
};

// SUBSCRIBED can arrive seconds before the server starts streaming changes,
// longest on the first connection of a run. A fixed delay only guesses; this
// touches a job the listener may read until an event proves the stream works.
const WARM_UP_RETOUCH_MS = 2000;
const WARM_UP_TIMEOUT_MS = 10_000;

async function warmUp(listener: JobListener, jobId: string) {
  const deadline = Date.now() + WARM_UP_TIMEOUT_MS;
  while (!listener.jobIds.includes(jobId)) {
    if (Date.now() >= deadline) {
      throw new Error(`Warm-up: never heard the change to job ${jobId}; Realtime is not streaming.`);
    }
    await touchJobAsDispatcher(jobId);
    const retouchAt = Math.min(Date.now() + WARM_UP_RETOUCH_MS, deadline);
    while (!listener.jobIds.includes(jobId) && Date.now() < retouchAt) await delay(100);
  }
  // The tests only see events from after the warm-up.
  listener.jobIds.length = 0;
}

// warmUpJobId: a job this client may read. Omit it for a client that should hear nothing.
async function listenToJobUpdates(client: TestClient, warmUpJobId?: string): Promise<JobListener> {
  // Sends the current session token (or the anon key) before joining.
  await client.realtime.setAuth();
  const listener: JobListener = { jobIds: [], channel: client.channel(`rls-test-${crypto.randomUUID()}`) };

  listener.channel.on("postgres_changes", { event: "UPDATE", schema: "public", table: "jobs" }, (payload) => {
    const id = (payload.new as { id?: string }).id;
    if (id) listener.jobIds.push(id);
  });

  await new Promise<void>((resolve, reject) => {
    listener.channel.subscribe((status, error) => {
      if (status === "SUBSCRIBED") resolve();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") reject(error ?? new Error(status));
    });
  });
  if (warmUpJobId) await warmUp(listener, warmUpJobId);
  // Nothing can prove a stream that must stay silent is ready; give it the old fixed wait.
  else await delay(1000);
  return listener;
}

async function touchJobAsDispatcher(id: string) {
  const { data, error } = await dispatcher.from("jobs").select("notes").eq("id", id).single();
  if (error) throw error;
  if (!originalNotes.has(id)) originalNotes.set(id, data.notes);

  const { error: updateError } = await dispatcher
    .from("jobs")
    .update({ notes: data.notes + MARKER })
    .eq("id", id);
  if (updateError) throw updateError;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJob(listener: JobListener, id: string) {
  const deadline = Date.now() + EVENT_TIMEOUT_MS;
  while (!listener.jobIds.includes(id) && Date.now() < deadline) await delay(100);
}

describe("Realtime respects the jobs RLS policies", () => {
  it("the dispatcher hears changes to every crew's jobs", async () => {
    const listener = await listenToJobUpdates(dispatcher, jobIds.northScheduled);

    await touchJobAsDispatcher(jobIds.southScheduled);
    await touchJobAsDispatcher(jobIds.northScheduled);
    await waitForJob(listener, jobIds.northScheduled);

    expect(listener.jobIds).toContain(jobIds.southScheduled);
    expect(listener.jobIds).toContain(jobIds.northScheduled);
  });

  it("a crew hears changes to its own jobs only", async () => {
    const listener = await listenToJobUpdates(northCrew, jobIds.northScheduled);

    // South first: events arrive in order, so a leaked South event would come before North's.
    await touchJobAsDispatcher(jobIds.southScheduled);
    await touchJobAsDispatcher(jobIds.northScheduled);
    await waitForJob(listener, jobIds.northScheduled);
    await delay(STRAY_EVENT_WAIT_MS);

    // Without the North event, the "no South" check below would prove nothing.
    expect(listener.jobIds).toContain(jobIds.northScheduled);
    expect(listener.jobIds).not.toContain(jobIds.southScheduled);
  });

  it("a logged-out subscriber hears nothing", async () => {
    // anon may be refused at join time; either way it must receive no events.
    const listener = await listenToJobUpdates(anon).catch(() => null);

    await touchJobAsDispatcher(jobIds.northScheduled);
    await delay(STRAY_EVENT_WAIT_MS + 1000);

    expect(listener?.jobIds ?? []).toEqual([]);
  });
});
