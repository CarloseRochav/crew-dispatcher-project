-- Step 8a: send changes on jobs over Supabase Realtime (Postgres Changes).
-- Realtime checks each insert and update against the subscriber's RLS select
-- policies, so a crew only hears about its own crew's jobs and anon hears nothing.
--
-- Replica identity stays at the default on purpose: a delete event then carries
-- only the job's id. Postgres cannot check RLS on a deleted row, so every
-- logged-in subscriber receives that id (accepted, see docs/spec.md, Realtime).

-- The check keeps this safe if Realtime was already turned on for jobs in the dashboard.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'jobs'
  ) then
    alter publication supabase_realtime add table public.jobs;
  end if;
end;
$$;
