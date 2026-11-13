-- Step 10a: job timeline. One row when a job is created and one per status change.
-- Decisions (docs/spec.md, Job timeline): status and creation only; only the
-- dispatcher reads it; changes made with no login are kept, with changed_by null ("System").

create table public.job_events (
  id uuid primary key default gen_random_uuid(),
  -- The history belongs to the job: deleting the job deletes its events.
  job_id uuid not null references public.jobs (id) on delete cascade,
  -- Null when there is no login (SQL editor, seed). Set null keeps the event if the profile goes.
  changed_by uuid references public.profiles (id) on delete set null,
  -- Null only for the "created" event.
  old_status public.job_status,
  new_status public.job_status not null,
  created_at timestamptz not null default now()
);

create index job_events_job_id_created_at_idx on public.job_events (job_id, created_at);
create index job_events_changed_by_idx on public.job_events (changed_by);

-- security definer: the person changing the job has no insert right on job_events,
-- so the history can only be written here. auth.uid() is still the caller's id,
-- also when the change comes through update_job_status.
create function public.log_job_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.job_events (job_id, changed_by, old_status, new_status)
  values (
    new.id,
    (select auth.uid()),
    case when tg_op = 'UPDATE' then old.status end,
    new.status
  );
  return null;
end;
$$;

create trigger jobs_log_created
  after insert on public.jobs
  for each row execute function public.log_job_event();

-- Only real status changes: a dispatcher edit to the time or notes, or a crew
-- adding a note without moving the job, writes no event.
create trigger jobs_log_status_change
  after update of status on public.jobs
  for each row
  when (old.status is distinct from new.status)
  execute function public.log_job_event();

-- ============================================================
-- Row-level security
-- ============================================================

alter table public.job_events enable row level security;

-- Supabase's default privileges grant everything on new tables to anon and
-- authenticated. Nobody writes events directly, not even the dispatcher, so the
-- history cannot be edited; only the trigger above inserts.
revoke all on public.job_events from anon, authenticated;
grant select on public.job_events to authenticated;

create policy job_events_dispatcher_select on public.job_events
  for select to authenticated
  using ((select public.is_dispatcher()));
