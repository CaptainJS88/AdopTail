create policy "Approved staff can read all profiles"
  on public.profiles
  for select to authenticated
  using (public.is_approved_staff());

--update: profile fields
alter table public.profiles
  add column phone text
    check (phone is null or phone ~ '^[0-9]{10}$'),
  add column city text
    check (city is null or char_length(btrim(city)) between 1 and 80);

alter table public.profiles
  add constraint profiles_display_name_length
  check (char_length(display_name) <= 100);

grant update (display_name, phone, city) on public.profiles to authenticated;

--update: in depth application fields, keeping old fields and required ones
alter table public.adoption_applications
  add column home_type text
    check (home_type in ('house', 'apartment', 'other')),
  add column home_ownership text
    check (home_ownership in ('own', 'rent', 'other')),
  add column pets_allowed text
    check (pets_allowed in ('yes', 'no', 'need_to_check')),
  add column household text
    check (household is null or char_length(btrim(household)) between 1 and 500),
  add column other_pets text
    check (other_pets is null or char_length(btrim(other_pets)) between 1 and 500),
  add column experience text
    check (experience is null or char_length(btrim(experience)) between 1 and 1000),
  add column daily_care text
    check (daily_care is null or char_length(btrim(daily_care)) between 1 and 1000);

--update: visit request question field
alter table public.appointments
  add column notes text
    check (notes is null or char_length(notes) <= 1000);

--update: visiting hours --> booking page 
--closed: sunday
-- 10-6 m-f
-- 10-4 saturday
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


-- changes to keep integrety of old data/ structure 
drop function if exists public.submit_adoption_application(uuid, text);
drop function if exists public.submit_adoption_application(uuid, text, text, text);
drop function if exists public.submit_appointment_request(uuid, timestamptz);
drop function if exists public.submit_appointment_request(uuid, timestamptz, text);

create or replace function public.submit_adoption_application(
  p_animal_id uuid,
  p_reason text,
  p_full_name text,
  p_phone text,
  p_city text,
  p_home_type text,
  p_home_ownership text,
  p_pets_allowed text,
  p_other_pets text,
  p_daily_care text,
  p_household text default null,
  p_experience text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_adopter_id uuid := (select auth.uid());
  v_application_id uuid;
  v_animal_id uuid;
begin
  if v_adopter_id is null or not exists (
    select 1 from public.profiles p where p.id = v_adopter_id and p.role = 'adopter'
  ) then
    raise exception 'An adopter account is required' using errcode = '42501';
  end if;
  
  
  if p_full_name is null or char_length(btrim(p_full_name)) not between 1 and 100 then
    raise exception 'Full name is required (up to 100 characters)';
  end if;
  if p_phone is null or p_phone !~ '^[0-9]{10}$' then
    raise exception 'Phone number must be exactly 10 digits';
  end if;
  if p_city is null or char_length(btrim(p_city)) not between 1 and 80 then
    raise exception 'City is required (up to 80 characters)';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 2000 then
    raise exception 'Adoption reason must contain 1 to 2000 characters';
  end if;
  if p_other_pets is null or char_length(btrim(p_other_pets)) not between 1 and 500 then
    raise exception 'Please describe your other pets, or write None';
  end if;
  if p_daily_care is null or char_length(btrim(p_daily_care)) not between 1 and 1000 then
    raise exception 'Daily care plan is required (up to 1000 characters)';
  end if;
  if p_home_type is null or p_home_ownership is null or p_pets_allowed is null then
    raise exception 'Housing type, ownership and pet permission are required';
  end if;


  select a.id into v_animal_id
  from public.animals a
  where a.id = p_animal_id and a.listing_visible and a.adoption_status = 'available'
  for update;
  if not found then
    raise exception 'This animal is not currently accepting applications';
  end if;

  update public.profiles
     set display_name = btrim(p_full_name),
         phone = p_phone,
         city = btrim(p_city)
   where id = v_adopter_id;

  insert into public.adoption_applications (
    animal_id, adopter_id, reason,
    home_type, home_ownership, pets_allowed,
    household, other_pets, experience, daily_care
  )
  values (
    v_animal_id, v_adopter_id, btrim(p_reason),
    p_home_type, p_home_ownership, p_pets_allowed,
    nullif(btrim(p_household), ''), btrim(p_other_pets),
    nullif(btrim(p_experience), ''), btrim(p_daily_care)
  )
  returning id into v_application_id;

  return v_application_id;
end;
$$;

create or replace function public.submit_appointment_request(
  p_animal_id uuid,
  p_starts_at timestamptz,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_adopter_id uuid := (select auth.uid());
  v_appointment_id uuid;
  v_animal_id uuid;
begin
  if v_adopter_id is null or not exists (
    select 1 from public.profiles p where p.id = v_adopter_id and p.role = 'adopter'
  ) then
    raise exception 'An adopter account is required' using errcode = '42501';
  end if;
  if p_starts_at is null or p_starts_at <= now() then
    raise exception 'Appointment time must be in the future';
  end if;
  if not public.is_within_visit_hours(p_starts_at) then
    raise exception 'Visits are 30 minutes, Mon-Fri 10 AM-6 PM and Sat 10 AM-4 PM Central Time. We are closed Sun and visits must finish before closing';
  end if;

  select a.id into v_animal_id
  from public.animals a
  where a.id = p_animal_id and a.listing_visible and a.adoption_status in ('available', 'pending')
  for update;
  if not found then raise exception 'This animal is not accepting visit requests'; end if;

  insert into public.appointments (animal_id, adopter_id, starts_at, notes)
  values (v_animal_id, v_adopter_id, p_starts_at, nullif(btrim(p_notes), ''))
  returning id into v_appointment_id;
  return v_appointment_id;
end;
$$;

revoke all on function public.submit_adoption_application(uuid, text, text, text, text, text, text, text, text, text, text, text) from public, anon;
revoke all on function public.submit_appointment_request(uuid, timestamptz, text, text, text) from public, anon;
grant execute on function public.submit_adoption_application(uuid, text, text, text, text, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.submit_appointment_request(uuid, timestamptz, text, text, text) to authenticated;