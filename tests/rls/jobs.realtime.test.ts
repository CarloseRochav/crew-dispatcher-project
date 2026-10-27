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

async function listenToJobUpdates(client: TestClient): Promise<JobListener> {
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
  // SUBSCRIBED can arrive just before the server starts streaming changes.
  await delay(1000);
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
    const listener = await listenToJobUpdates(dispatcher);

    await touchJobAsDispatcher(jobIds.southScheduled);
    await touchJobAsDispatcher(jobIds.northScheduled);
    await waitForJob(listener, jobIds.northScheduled);

    expect(listener.jobIds).toContain(jobIds.southScheduled);
    expect(listener.jobIds).toContain(jobIds.northScheduled);
  });

  it("a crew hears changes to its own jobs only", async () => {
    const listener = await listenToJobUpdates(northCrew);

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
