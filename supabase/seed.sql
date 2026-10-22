-- Fictional seed data. Run in the SQL Editor after the migration.
--
-- First create these three users in Authentication > Users > Add user,
-- with "Auto Confirm User" checked (example.com addresses cannot receive mail):
--   dispatcher@example.com
--   north.crew@example.com
--   south.crew@example.com
-- The signup trigger gives each a crew profile with no crew; this script sets
-- the real role and crew.
--
-- Safe to re-run: it resets the demo jobs to today's date.

do $$
begin
  if (
    select count(*) from auth.users
    where email in ('dispatcher@example.com', 'north.crew@example.com', 'south.crew@example.com')
  ) <> 3 then
    raise exception 'Create the three seed users in Authentication > Users first';
  end if;
end;
$$;

-- Fixed ids keep the seed idempotent and give the RLS tests stable targets.
insert into public.crews (id, name) values
  ('c0000000-0000-4000-8000-000000000001', 'North Crew'),
  ('c0000000-0000-4000-8000-000000000002', 'South Crew'),
  ('c0000000-0000-4000-8000-000000000003', 'East Crew')
on conflict (id) do update set name = excluded.name;

update public.profiles p
set name = 'Dana Whitfield', role = 'dispatcher', crew_id = null
from auth.users u
where u.id = p.id and u.email = 'dispatcher@example.com';

update public.profiles p
set name = 'Marco Lindqvist', role = 'crew', crew_id = 'c0000000-0000-4000-8000-000000000001'
from auth.users u
where u.id = p.id and u.email = 'north.crew@example.com';

update public.profiles p
set name = 'Priya Okafor', role = 'crew', crew_id = 'c0000000-0000-4000-8000-000000000002'
from auth.users u
where u.id = p.id and u.email = 'south.crew@example.com';

-- Times are relative to today in UTC (see "unsure" notes in Step 2).
insert into public.jobs (id, customer_name, address, job_type, scheduled_for, status, crew_id, notes) values
  -- North Crew: three today, one tomorrow
  ('a0000000-0000-4000-8000-000000000001', 'Hollis Bakery', '418 Juniper Lane, Brookvale', 'Walk-in fridge repair',
   date_trunc('day', now()) + interval '8 hours', 'done', 'c0000000-0000-4000-8000-000000000001', 'Replaced door gasket.'),
  ('a0000000-0000-4000-8000-000000000002', 'Renata Voss', '72 Larkspur Court, Brookvale', 'Water heater install',
   date_trunc('day', now()) + interval '10 hours 30 minutes', 'on_site', 'c0000000-0000-4000-8000-000000000001', ''),
  ('a0000000-0000-4000-8000-000000000003', 'Pinecrest Dental', '1500 Orchard Row, Suite 4, Brookvale', 'HVAC maintenance',
   date_trunc('day', now()) + interval '14 hours', 'scheduled', 'c0000000-0000-4000-8000-000000000001', 'Gate code 2291.'),
  ('a0000000-0000-4000-8000-000000000004', 'Tomasz Ellery', '9 Quarry Hill Road, Brookvale', 'Leak inspection',
   date_trunc('day', now()) + interval '1 day 9 hours', 'scheduled', 'c0000000-0000-4000-8000-000000000001', ''),
  -- South Crew: three today
  ('a0000000-0000-4000-8000-000000000005', 'Lumen Yoga Studio', '33 Harbor Street, Westmere', 'Electrical inspection',
   date_trunc('day', now()) + interval '9 hours', 'on_site', 'c0000000-0000-4000-8000-000000000002', ''),
  ('a0000000-0000-4000-8000-000000000006', 'Agnes Moreau', '260 Willow Bend, Westmere', 'Garbage disposal replacement',
   date_trunc('day', now()) + interval '12 hours', 'scheduled', 'c0000000-0000-4000-8000-000000000002', 'Customer works from home; call on arrival.'),
  ('a0000000-0000-4000-8000-000000000007', 'Westmere Public Library', '5 Civic Plaza, Westmere', 'Boiler check',
   date_trunc('day', now()) + interval '15 hours 30 minutes', 'scheduled', 'c0000000-0000-4000-8000-000000000002', ''),
  -- East Crew (no login): one today
  ('a0000000-0000-4000-8000-000000000008', 'Ferro & Sons Hardware', '88 Railway Avenue, Eastfield', 'Thermostat install',
   date_trunc('day', now()) + interval '11 hours', 'scheduled', 'c0000000-0000-4000-8000-000000000003', ''),
  -- Unassigned: tomorrow
  ('a0000000-0000-4000-8000-000000000009', 'Coralie Banks', '140 Meadow Drive, Eastfield', 'Sump pump repair',
   date_trunc('day', now()) + interval '1 day 13 hours', 'scheduled', null, '')
on conflict (id) do update set
  customer_name = excluded.customer_name,
  address = excluded.address,
  job_type = excluded.job_type,
  scheduled_for = excluded.scheduled_for,
  status = excluded.status,
  crew_id = excluded.crew_id,
  notes = excluded.notes;
