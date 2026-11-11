begin;
select no_plan();

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('91000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'visit-hours-adopter@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
('91000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'visit-hours-staff@example.test', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
update public.profiles set role = 'staff', staff_access_approved = true where id = '91000000-0000-4000-8000-000000000002';
insert into public.animals (id, name, species, description) values ('92000000-0000-4000-8000-000000000001', 'Visit Hours Test', 'dog', 'Temporary visit validation fixture');
insert into public.appointments (id, animal_id, adopter_id, starts_at, status, decided_at, decided_by)
select id, '92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001',
(date_trunc('week', now() at time zone 'America/Chicago') + interval '14 days' + slot) at time zone 'America/Chicago',
'approved', now(), '91000000-0000-4000-8000-000000000002'
from (values ('93000000-0000-4000-8000-000000000001'::uuid, interval '10 hours'), ('93000000-0000-4000-8000-000000000002'::uuid, interval '12 hours')) as fixtures(id, slot);

select set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000002', true);
set local role authenticated;

select lives_ok($test$
do $$
declare
  monday timestamp := date_trunc('week', now() at time zone 'America/Chicago') + interval '14 days';
  candidate timestamptz;
  invalid_slot interval;
  saved_time timestamptz;
  appointment uuid := '93000000-0000-4000-8000-000000000001';
begin
  foreach invalid_slot in array array[interval '9 hours 30 minutes', interval '18 hours', interval '5 days 16 hours', interval '6 days 10 hours', interval '10 hours 15 minutes', interval '10 hours 1 second'] loop
    candidate := (monday + invalid_slot) at time zone 'America/Chicago';
    begin
      perform public.reschedule_appointment(appointment, candidate);
      raise exception 'Invalid slot was accepted: %', candidate;
    exception when raise_exception then
      if sqlerrm <> 'Choose a 30-minute visit during shelter opening hours' then raise; end if;
    end;
  end loop;
  select starts_at into saved_time from public.appointments where id = appointment;
  if saved_time <> (monday + interval '10 hours') at time zone 'America/Chicago' then
    raise exception 'Rejected requests changed the saved time';
  end if;
  perform public.reschedule_appointment(appointment, (monday + interval '17 hours 30 minutes') at time zone 'America/Chicago');
  perform public.reschedule_appointment(appointment, (monday + interval '5 days 15 hours 30 minutes') at time zone 'America/Chicago');
  select starts_at into saved_time from public.appointments where id = appointment;
  if saved_time <> (monday + interval '5 days 15 hours 30 minutes') at time zone 'America/Chicago' then
    raise exception 'Valid reschedule was not saved';
  end if;
  begin
    perform public.reschedule_appointment(appointment, (monday + interval '12 hours') at time zone 'America/Chicago');
    raise exception 'Overlap was accepted';
  exception when raise_exception then
    if sqlerrm <> 'This time overlaps another approved visit for the animal' then raise; end if;
  end;
  perform set_config('request.jwt.claim.sub', '91000000-0000-4000-8000-000000000001', true);
  begin
    perform public.reschedule_appointment(appointment, (monday + interval '14 hours') at time zone 'America/Chicago');
    raise exception 'Adopter reschedule was accepted';
  exception when insufficient_privilege then null;
  end;
  if not public.is_within_visit_hours('2027-01-04 10:00 America/Chicago') or not public.is_within_visit_hours('2027-07-05 10:00 America/Chicago') then
    raise exception 'Winter or summer opening time rejected';
  end if;
end;
$$;
$test$, 'rescheduling enforces hours, preserves valid saves, blocks overlaps and requires staff');

reset role;
select * from finish();
rollback;
