-- Step 10a: undo the deliberate break from break_job_events_select_on_purpose.
-- Back to add_job_events: only job_events_dispatcher_select remains, so only the dispatcher reads events.

drop policy job_events_any_select on public.job_events;
