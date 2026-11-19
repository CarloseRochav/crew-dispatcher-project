# Step 15: job summary with a DeepSeek model on Azure AI Foundry

Approved 2026-11-18: option A (DeepSeek on the existing Foundry resource, notes stay on Azure). Model: `DeepSeek-V4.1-Flash-1017`.

## Plan as approved, and what changed

The plan was to switch `lib/ai/summarize-notes.ts` from the Responses API to Chat Completions, assuming Azure serves non-OpenAI models only through Chat Completions, and to strip a `<think>` block. A direct check against the deployment came before any code change and showed the assumption was wrong, so the code change was dropped.

## Checked against the deployment (fictional notes only)

| Call | Result |
| --- | --- |
| Responses API through the `openai` SDK (the app's call) | `completed`, one clean sentence in `output_text` |
| Responses API over raw REST | `completed`; no `output_text` field, because the SDK adds it from `output` |
| Chat Completions with `max_tokens` or `max_completion_tokens` | Both accepted, `finish_reason: stop` |
| Reasoning | 0 reasoning tokens, no `<think>` block |

## Changes

- No code change.
- `.env.example`: the DeepSeek deployment example, a reminder that real values go only in `.env.local`, and the `/openai/v1/` ending.
- `docs/spec.md`: the Step 15 decision; the stretch item and the Step 14a line point to it.
- `README.md`: model named in the feature and decision text, a "Checked with the real model" note, and setup step 5.

## Found on the way

- The real endpoint and key had been pasted into `.env.example`, which is tracked. They were never committed (`git log --all -S` found nothing). They were moved to `.env.local` and `.env.example` was restored. Rotating the key is recommended.
- The pasted base URL lacked `/openai/v1/` and the deployment was empty, so the app would have said AI isn't set up. Both were fixed in `.env.local`.

## Verified

| Check | Result |
| --- | --- |
| Direct call with fictional notes | Pass (table above) |
| Generate summary in the app, locally (`next dev`, as the dispatcher) | Pass, checked by the owner |
| Live site | Not yet: needs the three `AZURE_OPENAI_*` variables in Vercel |
