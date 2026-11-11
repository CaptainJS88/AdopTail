-- Staff dashboard support: persist adopter form snapshots and store pet uploads.
-- Existing application and appointment rows remain valid; their new fields stay NULL.

alter table public.adoption_applications
  add column contact_name text,
  add column contact_email text,
  add column contact_phone text,
  add column city text,
  add column housing_type text,
  add column home_ownership text,
  add column pet_permission text,
  add column household text,
  add column other_pets text,
  add column experience text,
  add column daily_care text;

alter table public.adoption_applications
  add constraint adoption_applications_contact_name_length
    check (contact_name is null or char_length(btrim(contact_name)) between 1 and 100),
  add constraint adoption_applications_contact_phone_length
    check (contact_phone is null or contact_phone ~ '^[0-9]{10}$'),
  add constraint adoption_applications_city_length
    check (city is null or char_length(btrim(city)) between 1 and 80),
  add constraint adoption_applications_household_length
    check (household is null or char_length(household) <= 500),
  add constraint adoption_applications_other_pets_length
    check (other_pets is null or char_length(other_pets) between 1 and 500),
  add constraint adoption_applications_experience_length
    check (experience is null or char_length(experience) <= 1000),
  add constraint adoption_applications_daily_care_length
    check (daily_care is null or char_length(daily_care) between 1 and 1000);

alter table public.appointments
  add column contact_name text,
  add column contact_email text,
  add column contact_phone text,
  add column visit_note text;

alter table public.appointments
  add constraint appointments_contact_name_length
    check (contact_name is null or char_length(btrim(contact_name)) between 1 and 100),
  add constraint appointments_contact_phone_length
    check (contact_phone is null or contact_phone ~ '^[0-9]{10}$'),
  add constraint appointments_visit_note_length
    check (visit_note is null or char_length(visit_note) <= 1000);

alter table public.animal_photos add column storage_path text;

-- Replace the minimal submit API with one that persists the form snapshot.
drop function public.submit_adoption_application(uuid, text);
create function public.submit_adoption_application(
  p_animal_id uuid,
  p_application_data jsonb
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
  v_email text;
  v_name text;
  v_phone text;
  v_city text;
  v_housing_type text;
  v_home_ownership text;
  v_pet_permission text;
  v_household text;
  v_other_pets text;
  v_experience text;
  v_daily_care text;
  v_reason text;
begin
  if v_adopter_id is null or not exists (
    select 1 from public.profiles p
    where p.id = v_adopter_id and p.role = 'adopter'
  ) then
    raise exception 'An adopter account is required' using errcode = '42501';
  end if;
  if p_application_data is null or jsonb_typeof(p_application_data) <> 'object' then
    raise exception 'Application details are required';
  end if;

  select u.email into v_email from auth.users u where u.id = v_adopter_id;
  v_name := btrim(coalesce(p_application_data ->> 'full_name', ''));
  v_phone := regexp_replace(coalesce(p_application_data ->> 'phone', ''), '[^0-9]', '', 'g');
  v_city := btrim(coalesce(p_application_data ->> 'city', ''));
  v_housing_type := btrim(coalesce(p_application_data ->> 'housing_type', ''));
  v_home_ownership := btrim(coalesce(p_application_data ->> 'home_ownership', ''));
  v_pet_permission := btrim(coalesce(p_application_data ->> 'pet_permission', ''));
  v_household := btrim(coalesce(p_application_data ->> 'household', ''));
  v_other_pets := btrim(coalesce(p_application_data ->> 'other_pets', ''));
  v_experience := btrim(coalesce(p_application_data ->> 'experience', ''));
  v_daily_care := btrim(coalesce(p_application_data ->> 'daily_care', ''));
  v_reason := btrim(coalesce(p_application_data ->> 'reason', ''));

  if v_email is null then raise exception 'An account email is required'; end if;
  if char_length(v_name) not between 1 and 100 then raise exception 'Full name must contain 1 to 100 characters'; end if;
  if v_phone !~ '^[0-9]{10}$' then raise exception 'Phone number must contain 10 digits'; end if;
  if char_length(v_city) not between 1 and 80 then raise exception 'City must contain 1 to 80 characters'; end if;
  if v_housing_type not in ('House', 'Apartment', 'Other') then raise exception 'Choose a valid housing type'; end if;
  if v_home_ownership not in ('Own', 'Rent', 'Other') then raise exception 'Choose a valid ownership type'; end if;
  if v_pet_permission not in ('Yes', 'No', 'Need to check') then raise exception 'Choose a valid pet permission response'; end if;
  if char_length(v_household) > 500 then raise exception 'Household details cannot exceed 500 characters'; end if;
  if char_length(v_other_pets) not between 1 and 500 then raise exception 'Other-pet details must contain 1 to 500 characters'; end if;
  if char_length(v_experience) > 1000 then raise exception 'Experience details cannot exceed 1000 characters'; end if;
  if char_length(v_daily_care) not between 1 and 1000 then raise exception 'Daily care details must contain 1 to 1000 characters'; end if;
  if char_length(v_reason) not between 1 and 2000 then raise exception 'Adoption reason must contain 1 to 2000 characters'; end if;

  select a.id into v_animal_id
  from public.animals a
  where a.id = p_animal_id
    and a.listing_visible
    and a.adoption_status = 'available'
  for update;
  if not found then raise exception 'This animal is not currently accepting applications'; end if;

  insert into public.adoption_applications (
    animal_id, adopter_id, reason, contact_name, contact_email, contact_phone,
    city, housing_type, home_ownership, pet_permission, household,
    other_pets, experience, daily_care
  ) values (
    v_animal_id, v_adopter_id, v_reason, v_name, v_email, v_phone,
    v_city, v_housing_type, v_home_ownership, v_pet_permission,
    nullif(v_household, ''), v_other_pets, nullif(v_experience, ''), v_daily_care
  ) returning id into v_application_id;

  return v_application_id;
end;
$$;

-- Persist the contact snapshot and optional question for a visit request.
drop function public.submit_appointment_request(uuid, timestamptz);
create function public.submit_appointment_request(
  p_animal_id uuid,
  p_starts_at timestamptz,
  p_contact_details jsonb
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
  v_email text;
  v_name text;
  v_phone text;
  v_note text;
begin
  if v_adopter_id is null or not exists (
    select 1 from public.profiles p
    where p.id = v_adopter_id and p.role = 'adopter'
  ) then
    raise exception 'An adopter account is required' using errcode = '42501';
  end if;
  if p_contact_details is null or jsonb_typeof(p_contact_details) <> 'object' then
    raise exception 'Contact details are required';
  end if;

  select u.email into v_email from auth.users u where u.id = v_adopter_id;
  v_name := btrim(coalesce(p_contact_details ->> 'full_name', ''));
  v_phone := regexp_replace(coalesce(p_contact_details ->> 'phone', ''), '[^0-9]', '', 'g');
  v_note := btrim(coalesce(p_contact_details ->> 'note', ''));

  if v_email is null then raise exception 'An account email is required'; end if;
  if char_length(v_name) not between 1 and 100 then raise exception 'Full name must contain 1 to 100 characters'; end if;
  if v_phone !~ '^[0-9]{10}$' then raise exception 'Phone number must contain 10 digits'; end if;
  if char_length(v_note) > 1000 then raise exception 'Visit question cannot exceed 1000 characters'; end if;
  if p_starts_at is null or p_starts_at <= now() then
    raise exception 'Appointment time must be in the future';
  end if;

  select a.id into v_animal_id
  from public.animals a
  where a.id = p_animal_id
    and a.listing_visible
    and a.adoption_status in ('available', 'pending')
  for update;
  if not found then raise exception 'This animal is not accepting visit requests'; end if;

  insert into public.appointments (
    animal_id, adopter_id, starts_at, contact_name, contact_email,
    contact_phone, visit_note
  ) values (
    v_animal_id, v_adopter_id, p_starts_at, v_name, v_email, v_phone,
    nullif(v_note, '')
  ) returning id into v_appointment_id;
  return v_appointment_id;
end;
$$;

revoke all on function public.submit_adoption_application(uuid, jsonb) from public, anon;
revoke all on function public.submit_appointment_request(uuid, timestamptz, jsonb) from public, anon;
grant execute on function public.submit_adoption_application(uuid, jsonb) to authenticated;
grant execute on function public.submit_appointment_request(uuid, timestamptz, jsonb) to authenticated;

-- Pet photos are public listing assets; only approved staff may upload or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'animal-photos', 'animal-photos', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Approved staff can upload pet photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'animal-photos' and public.is_approved_staff());

create policy "Approved staff can delete pet photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'animal-photos' and public.is_approved_staff());
