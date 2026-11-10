create or replace function public.is_within_visit_hours(p_starts_at timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  with lt as (select p_starts_at at time zone 'America/Chicago' as t)
  select
    extract(second from t) = 0
    and extract(minute from t) in (0, 30)
    and case extract(isodow from t)
          when 7 then false
          when 6 then t::time between time '10:00' and time '15:30'
          else        t::time between time '10:00' and time '17:30'
        end
  from lt
$$;

create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_new_starts_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
begin
  if not public.is_approved_staff() then
    raise exception 'Approved staff access is required' using errcode = '42501';
  end if;
  if p_new_starts_at is null or p_new_starts_at <= now() then
    raise exception 'New appointment time must be in the future';
  end if;
  if not public.is_within_visit_hours(p_new_starts_at) then
    raise exception 'Choose a 30-minute visit during shelter opening hours';
  end if;

  select * into v_appointment
  from public.appointments
  where id = p_appointment_id
  for update;
  if not found then raise exception 'Appointment not found'; end if;
  if v_appointment.status <> 'approved' then
    raise exception 'Only approved appointments can be rescheduled';
  end if;

  perform 1 from public.animals where id = v_appointment.animal_id for update;
  if exists (
    select 1 from public.appointments existing
    where existing.animal_id = v_appointment.animal_id
      and existing.status = 'approved'
      and existing.id <> v_appointment.id
      and existing.starts_at < p_new_starts_at + interval '30 minutes'
      and existing.starts_at + interval '30 minutes' > p_new_starts_at
  ) then
    raise exception 'This time overlaps another approved visit for the animal';
  end if;

  perform set_config('adoptail.allow_appointment_workflow', 'on', true);
  update public.appointments
  set starts_at = p_new_starts_at
  where id = v_appointment.id;
end;
$$;
