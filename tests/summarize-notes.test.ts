import { describe, expect, it, vi } from "vitest";
import OpenAI from "openai";
import { readAzureOpenAIEnv } from "@/lib/ai/env";
import {
  NOTES_FOR_SUMMARY_MAX,
  SUMMARY_INSTRUCTIONS,
  SUMMARY_MAX,
  summarizeNotes,
  type CreateSummaryResponse,
  type SummaryResponse,
} from "@/lib/ai/summarize-notes";

// No test talks to Azure: the one call is replaced by a fake.
function fakeAzure(reply: SummaryResponse | Error) {
  return vi.fn<CreateSummaryResponse>(async () => {
    if (reply instanceof Error) throw reply;
    return reply;
  });
}

const deployment = "test-deployment";
const notes = "Gate code 2291.\nreplaced filter, unit making noise, come back tue";

describe("summarizeNotes", () => {
  it("sends the notes to the deployment with the fixed instructions and returns the trimmed summary", async () => {
    const createResponse = fakeAzure({ output_text: "  Filter replaced; unit still noisy.  ", status: "completed" });

    const result = await summarizeNotes(notes, { createResponse, deployment });

    expect(result).toEqual({ ok: true, summary: "Filter replaced; unit still noisy." });
    expect(createResponse).toHaveBeenCalledOnce();
    const request = createResponse.mock.calls[0][0];
    expect(request.model).toBe(deployment);
    expect(request.instructions).toBe(SUMMARY_INSTRUCTIONS);
    expect(request.input).toContain(notes);
  });

  it.each(["", "   \n  "])("refuses empty notes (%j) without calling Azure", async (empty) => {
    const createResponse = fakeAzure({ output_text: "should not be used" });

    expect(await summarizeNotes(empty, { createResponse, deployment })).toEqual({ ok: false, reason: "no_notes" });
    expect(createResponse).not.toHaveBeenCalled();
  });

  it("refuses notes over the limit without calling Azure", async () => {
    const createResponse = fakeAzure({ output_text: "should not be used" });

    const result = await summarizeNotes("x".repeat(NOTES_FOR_SUMMARY_MAX + 1), { createResponse, deployment });

    expect(result).toEqual({ ok: false, reason: "notes_too_long" });
    expect(createResponse).not.toHaveBeenCalled();
  });

  it.each<[string, SummaryResponse]>([
    ["an empty reply", { output_text: "   ", status: "completed" }],
    ["a reply over the column limit", { output_text: "x".repeat(SUMMARY_MAX + 1), status: "completed" }],
    ["an incomplete reply", { output_text: "Filter replaced and", status: "incomplete" }],
  ])("never returns %s as a summary", async (_case, reply) => {
    const result = await summarizeNotes(notes, { createResponse: fakeAzure(reply), deployment });

    expect(result).toEqual({ ok: false, reason: "bad_reply" });
  });

  it("turns an Azure error into ai_failed and logs only the status, never the notes", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const azureError = new OpenAI.APIError(429, { message: `rate limited: ${notes}` }, undefined, new Headers());

    const result = await summarizeNotes(notes, { createResponse: fakeAzure(azureError), deployment });

    expect(result).toEqual({ ok: false, reason: "ai_failed" });
    expect(consoleError).toHaveBeenCalledWith("Job summary request failed (429)");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("Gate code");
    consoleError.mockRestore();
  });

  it("turns a network failure into ai_failed", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await summarizeNotes(notes, { createResponse: fakeAzure(new Error("socket hang up")), deployment });

    expect(result).toEqual({ ok: false, reason: "ai_failed" });
    consoleError.mockRestore();
  });
});

describe("readAzureOpenAIEnv", () => {
  const complete = {
    AZURE_OPENAI_BASE_URL: "https://example-resource.openai.azure.com/openai/v1/",
    AZURE_OPENAI_API_KEY: "test-key",
    AZURE_OPENAI_DEPLOYMENT: "test-deployment",
  };

  it("accepts a complete v1 setup", () => {
    expect(readAzureOpenAIEnv(complete)).toEqual(complete);
  });

  it("returns null when nothing is set (placeholders), so only the button reports it", () => {
    expect(readAzureOpenAIEnv({})).toBeNull();
  });

  it.each<[string, Record<string, string>]>([
    ["an empty key", { ...complete, AZURE_OPENAI_API_KEY: "" }],
    ["a missing deployment", { AZURE_OPENAI_BASE_URL: complete.AZURE_OPENAI_BASE_URL, AZURE_OPENAI_API_KEY: "k" }],
    ["a base URL that is not the v1 API", { ...complete, AZURE_OPENAI_BASE_URL: "https://example-resource.openai.azure.com/" }],
    ["a base URL that is not a URL", { ...complete, AZURE_OPENAI_BASE_URL: "example-resource" }],
  ])("returns null for %s", (_case, env) => {
    expect(readAzureOpenAIEnv(env)).toBeNull();
  });
});
