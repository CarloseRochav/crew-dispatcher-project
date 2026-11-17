-- Step 14a: a clean summary of a job's notes, written by the dispatcher with
-- help from an AI model (Step 14b). Stored apart from `notes` so the crews'
-- original words are never overwritten.
--
-- No new policies or grants are needed, on purpose:
-- - Writes: only the dispatcher can update jobs directly (existing policy).
--   Crews change jobs only through update_job_status(), which touches status
--   and notes, never this column.
-- - Reads: RLS works on rows, so a crew can read the summary of its own jobs,
--   just like their notes. The summary only restates those notes.
-- - Realtime: the jobs publication has no column list, so the board receives
--   summary changes too.
-- - job_events: the trigger records only creation and status changes, so
--   editing the summary writes no event (spec, Job timeline).

alter table public.jobs
  add column summary text not null default ''
    constraint jobs_summary_max_length check (char_length(summary) <= 2000);

comment on column public.jobs.summary is
  'Clean summary of the job notes, written by the dispatcher (AI-assisted). Empty string when there is none.';
