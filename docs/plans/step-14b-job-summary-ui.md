# Step 14b: AI job summary in the drawer (Azure AI Foundry)

Approved 2026-11-16: Summary tab (option A), generate only, drawer only. Builds on Step 14a (`jobs.summary`).

## Azure setup (checked against Microsoft Learn, 2026-11-16)

- Plain `OpenAI` client from the `openai` package with `baseURL: https://<resource>.openai.azure.com/openai/v1/` and an API key. The v1 API needs no dated `api-version`.
- `model` in each request is the Azure deployment name.
- New dependency: `openai@7.47.0`, pinned exact (newest release at least two weeks old; no dependencies of its own).

## Changes

- `lib/ai/env.ts`: server-only `AZURE_OPENAI_BASE_URL`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`, checked with zod on each use; `null` when unset, so the app runs without them.
- `lib/ai/summarize-notes.ts`: notes in (1 to 8000 characters), summary out (1 to 2000, completed reply only). Fixed instructions that treat notes as data. 20s timeout, one retry. Logs only the HTTP status, never the request.
- `app/board/actions.ts`: `summarizeJob(jobId)`: dispatcher only, id checked with zod, notes read from the database, summary saved, `/board` revalidated.
- `app/board/job-summary.tsx`: summary or empty state, AI note, 44px button with icon and label, loading and error states, disabled with a message while Details has unsaved edits.
- `app/board/job-drawer.tsx`: `JobEditTabs` (keyed by job) adds the Summary tab and tracks unsaved edits; an untouched form remounts when `updated_at` changes.
- `app/board/job-form.tsx`: `onEdit` callback on input.
- `lib/jobs/queries.ts`: drawer query includes `summary`.
- `tests/summarize-notes.test.ts`: 15 tests with a fake Azure call.
- `.env.example`, README, spec.

## Verified

| Check | Result |
| --- | --- |
| `tsc`, lint, `npm test`, `npm run build` | Pass; 156/156 (141 + 15 new) |
| Browser bundle (`.next/static`) | No `AZURE_OPENAI` names, none of the `openai` package; only the button UI |
| `next dev`, headless Chrome, as the dispatcher, no Azure vars | 11/11: Details, Summary, History tabs; empty state with next step; 44px "Generate summary"; disabled with "Save or cancel your edits in Details first." after typing in Details, edits kept across tabs; fresh drawer enabled again; Generate shows "AI summaries aren't set up yet…"; dark theme uses the tokens; 0 console errors or warnings |

## Notes

- With no Foundry resource yet, the real Azure call is untested. The first real run should check one summary end to end.
- Behavior change: an untouched Details form now picks up live changes instead of showing the "changed while you were editing" notice.
