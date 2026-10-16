create or replace function public.is_approved_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'staff'
      and p.staff_access_approved
  );
$$;

revoke all on function public.is_approved_staff() from public, anon;
grant execute on function public.is_approved_staff() to authenticated;


-- Adoption applications are owned by the adopter and can only be decided by
-- an approved staff member through decide_adoption_application().
create table public.adoption_applications (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete restrict,
  adopter_id uuid not null references public.profiles(id) on delete restrict,
  reason text not null
    check (char_length(btrim(reason)) between 1 and 2000),
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete restrict,
  check (
    (status = 'submitted' and decided_at is null and decided_by is null)
    or
    (status in ('approved', 'rejected') and decided_at is not null and decided_by is not null)
  )
);

create index adoption_applications_adopter_submitted_idx
  on public.adoption_applications (adopter_id, submitted_at desc);
create index adoption_applications_animal_status_idx
  on public.adoption_applications (animal_id, status);
-- One animal can have at most one approved application.
create unique index adoption_applications_one_approved_per_animal_idx
  on public.adoption_applications (animal_id)
  where status = 'approved';

alter table public.adoption_applications enable row level security;
revoke all on table public.adoption_applications from public, anon, authenticated;
grant select on table public.adoption_applications to authenticated;

create policy "Adopters and approved staff can read applications"
  on public.adoption_applications
  for select to authenticated
  using (adopter_id = (select auth.uid()) or public.is_approved_staff());


-- Appointments are independent of applications and always last 30 minutes.
-- Only the start time is stored; the fixed end time is calculated in queries.
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete restrict,
  adopter_id uuid not null references public.profiles(id) on delete restrict,
  starts_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete restrict,
  check (
    (status = 'pending' and decided_at is null and decided_by is null)
    or
    (status in ('approved', 'rejected') and decided_at is not null and decided_by is not null)
  )
);

create index appointments_adopter_created_idx
  on public.appointments (adopter_id, created_at desc);
create index appointments_animal_start_idx
  on public.appointments (animal_id, starts_at);
create index appointments_approved_animal_start_idx
  on public.appointments (animal_id, starts_at)
  where status = 'approved';

alter table public.appointments enable row level security;
revoke all on table public.appointments from public, anon, authenticated;
grant select on table public.appointments to authenticated;

create policy "Adopters and approved staff can read appointments"
  on public.appointments
  for select to authenticated
  using (adopter_id = (select auth.uid()) or public.is_approved_staff());


-- A completed adoption is recorded once per application and once per animal.
create table public.adoptions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique
    references public.adoption_applications(id) on delete restrict,
  animal_id uuid not null unique
    references public.animals(id) on delete restrict,
  adopter_id uuid not null references public.profiles(id) on delete restrict,
  adopted_at timestamptz not null default now(),
  completed_by uuid not null references public.profiles(id) on delete restrict
);

create index adoptions_adopter_adopted_idx
  on public.adoptions (adopter_id, adopted_at desc);

alter table public.adoptions enable row level security;
revoke all on table public.adoptions from public, anon, authenticated;
grant select on table public.adoptions to authenticated;

create policy "Adopters and approved staff can read adoptions"
  on public.adoptions
  for select to authenticated
  using (adopter_id = (select auth.uid()) or public.is_approved_staff());


-- Append-only audit trail for application decisions, appointment decisions and
-- reschedules, and animal adoption-status changes.
create table public.workflow_history (
  id bigint generated always as identity primary key,
  application_id uuid references public.adoption_applications(id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete restrict,
  animal_id uuid references public.animals(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  old_status text,
  new_status text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (num_nonnulls(application_id, appointment_id, animal_id) = 1)
);

create index workflow_history_application_idx
  on public.workflow_history (application_id, created_at desc)
  where application_id is not null;
create index workflow_history_appointment_idx
  on public.workflow_history (appointment_id, created_at desc)
  where appointment_id is not null;
create index workflow_history_animal_idx
  on public.workflow_history (animal_id, created_at desc)
  where animal_id is not null;

alter table public.workflow_history enable row level security;
revoke all on table public.workflow_history from public, anon, authenticated;
grant select on table public.workflow_history to authenticated;

create policy "Only approved staff can read workflow history"
  on public.workflow_history
  for select to authenticated
  using (public.is_approved_staff());


-- Protect workflow status/time fields even if a future grant is accidentally
-- added. The approved RPCs set transaction-local flags before making changes.
create or replace function public.guard_application_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if current_setting('adoptail.allow_application_workflow', true) is distinct from 'on' then
      raise exception 'Application status must be changed through the workflow RPC';
    end if;

    if old.status <> 'submitted' or new.status not in ('approved', 'rejected') then
      raise exception 'Invalid application status transition: % to %', old.status, new.status;
    end if;
  end if;

  return new;
end;
$$;

create trigger guard_application_status_change
  before update of status on public.adoption_applications
  for each row execute function public.guard_application_status_change();

create or replace function public.record_application_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.workflow_history (
      application_id, actor_id, action, old_status, new_status
    ) values (
      new.id, new.decided_by, 'application_decided', old.status, new.status
    );
  end if;
  return new;
end;
$$;

create trigger record_application_decision
  after update of status on public.adoption_applications
  for each row execute function public.record_application_decision();


create or replace function public.guard_animal_status_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.adoption_status <> 'available' then
      raise exception 'New animals must start with available status';
    end if;
    return new;
  end if;

  if new.adoption_status is distinct from old.adoption_status then
    if current_setting('adoptail.allow_animal_status_workflow', true) is distinct from 'on' then
      raise exception 'Animal status must be changed through a workflow RPC';
    end if;

    if not (
      (old.adoption_status = 'available' and new.adoption_status in ('pending', 'fostered'))
      or (old.adoption_status = 'pending' and new.adoption_status = 'adopted')
      or (old.adoption_status = 'fostered' and new.adoption_status = 'available')
    ) then
      raise exception 'Invalid animal status transition: % to %',
        old.adoption_status, new.adoption_status;
    end if;
  end if;

  return new;
end;
$$;

create trigger guard_animal_status_change
  before insert or update of adoption_status on public.animals
  for each row execute function public.guard_animal_status_change();

create or replace function public.record_animal_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.adoption_status is distinct from old.adoption_status then
    insert into public.workflow_history (
      animal_id, actor_id, action, old_status, new_status
    ) values (
      new.id, (select auth.uid()), 'animal_status_changed',
      old.adoption_status, new.adoption_status
    );
  end if;
  return new;
end;
$$;

create trigger record_animal_status_change
  after update of adoption_status on public.animals
  for each row execute function public.record_animal_status_change();


create or replace function public.guard_appointment_workflow_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     or new.starts_at is distinct from old.starts_at then
    if current_setting('adoptail.allow_appointment_workflow', true) is distinct from 'on' then
      raise exception 'Appointment status and time must be changed through a workflow RPC';
    end if;
  end if;

  if new.status is distinct from old.status
     and not (old.status = 'pending' and new.status in ('approved', 'rejected')) then
    raise exception 'Invalid appointment status transition: % to %', old.status, new.status;
  end if;

  if new.starts_at is distinct from old.starts_at and old.status <> 'approved' then
    raise exception 'Only approved appointments can be rescheduled';
  end if;

  return new;
end;
$$;

create trigger guard_appointment_workflow_change
  before update of status, starts_at on public.appointments
  for each row execute function public.guard_appointment_workflow_change();

create or replace function public.record_appointment_workflow_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    insert into public.workflow_history (
      appointment_id, actor_id, action, old_status, new_status
    ) values (
      new.id, new.decided_by, 'appointment_decided', old.status, new.status
    );
  elsif new.starts_at is distinct from old.starts_at then
    insert into public.workflow_history (
      appointment_id, actor_id, action, old_status, new_status, details
    ) values (
      new.id, (select auth.uid()), 'appointment_rescheduled', new.status, new.status,
      jsonb_build_object('old_starts_at', old.starts_at, 'new_starts_at', new.starts_at)
    );
  end if;
  return new;
end;
$$;

create trigger record_appointment_workflow_change
  after update of status, starts_at on public.appointments
  for each row execute function public.record_appointment_workflow_change();


create or replace function public.prevent_workflow_history_edits()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Workflow history is append-only';
end;
$$;

create trigger workflow_history_is_append_only
  before update or delete on public.workflow_history
  for each row execute function public.prevent_workflow_history_edits();


-- RPC used by an authenticated adopter to submit a short-reason application.
create or replace function public.submit_adoption_application(
  p_animal_id uuid,
  p_reason text
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
    select 1 from public.profiles p
    where p.id = v_adopter_id and p.role = 'adopter'
  ) then
    raise exception 'An adopter account is required' using errcode = '42501';
  end if;

  if p_reason is null or char_length(btrim(p_reason)) not between 1 and 2000 then
    raise exception 'Adoption reason must contain 1 to 2000 characters';
  end if;

  select a.id into v_animal_id
  from public.animals a
  where a.id = p_animal_id
    and a.listing_visible
    and a.adoption_status = 'available'
  for update;
  if not found then
    raise exception 'This animal is not currently accepting applications';
  end if;

  insert into public.adoption_applications (animal_id, adopter_id, reason)
  values (v_animal_id, v_adopter_id, btrim(p_reason))
  returning id into v_application_id;

  return v_application_id;
end;
$$;


-- Staff approve or reject a submitted application. Approval locks the animal,
-- moves it from available to pending, and leaves other submitted applications
-- untouched for staff to resolve.
create or replace function public.decide_adoption_application(
  p_application_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.adoption_applications%rowtype;
  v_animal public.animals%rowtype;
begin
  if not public.is_approved_staff() then
    raise exception 'Approved staff access is required' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select * into v_application
  from public.adoption_applications
  where id = p_application_id
  for update;
  if not found then raise exception 'Application not found'; end if;
  if v_application.status <> 'submitted' then
    raise exception 'Only submitted applications can be decided';
  end if;

  if p_decision = 'approved' then
    select * into v_animal
    from public.animals
    where id = v_application.animal_id
    for update;
    if not found or v_animal.adoption_status <> 'available' then
      raise exception 'Animal is no longer available for approval';
    end if;

    perform set_config('adoptail.allow_animal_status_workflow', 'on', true);
    update public.animals
    set adoption_status = 'pending'
    where id = v_animal.id;
  end if;

  perform set_config('adoptail.allow_application_workflow', 'on', true);
  update public.adoption_applications
  set status = p_decision,
      decided_at = now(),
      decided_by = (select auth.uid())
  where id = v_application.id;
end;
$$;


-- Visit requests are independent of adoption applications. Only approved
-- visits are checked for overlap; pending requests may overlap.
create or replace function public.submit_appointment_request(
  p_animal_id uuid,
  p_starts_at timestamptz
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
    select 1 from public.profiles p
    where p.id = v_adopter_id and p.role = 'adopter'
  ) then
    raise exception 'An adopter account is required' using errcode = '42501';
  end if;
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

  insert into public.appointments (animal_id, adopter_id, starts_at)
  values (v_animal_id, v_adopter_id, p_starts_at)
  returning id into v_appointment_id;
  return v_appointment_id;
end;
$$;


-- Approve or reject a pending visit. Locking the animal serializes approval
-- checks so two concurrent requests cannot claim overlapping approved slots.
create or replace function public.decide_appointment(
  p_appointment_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_appointment public.appointments%rowtype;
  v_animal public.animals%rowtype;
begin
  if not public.is_approved_staff() then
    raise exception 'Approved staff access is required' using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select * into v_appointment
  from public.appointments
  where id = p_appointment_id
  for update;
  if not found then raise exception 'Appointment not found'; end if;
  if v_appointment.status <> 'pending' then
    raise exception 'Only pending appointments can be decided';
  end if;

  if p_decision = 'approved' then
    select * into v_animal
    from public.animals
    where id = v_appointment.animal_id
    for update;
    if not found or not v_animal.listing_visible
       or v_animal.adoption_status not in ('available', 'pending') then
      raise exception 'Animal is not available for a visit';
    end if;
    if v_appointment.starts_at <= now() then
      raise exception 'Past appointments cannot be approved';
    end if;
    if exists (
      select 1 from public.appointments existing
      where existing.animal_id = v_appointment.animal_id
        and existing.status = 'approved'
        and existing.id <> v_appointment.id
        and existing.starts_at < v_appointment.starts_at + interval '30 minutes'
        and existing.starts_at + interval '30 minutes' > v_appointment.starts_at
    ) then
      raise exception 'This time overlaps another approved visit for the animal';
    end if;
  end if;

  perform set_config('adoptail.allow_appointment_workflow', 'on', true);
  update public.appointments
  set status = p_decision,
      decided_at = now(),
      decided_by = (select auth.uid())
  where id = v_appointment.id;
end;
$$;


-- Only approved visits can be rescheduled. The lock and overlap check use the
-- same animal-level serialization as appointment approval.
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


-- Completing an adoption is one transaction: either both the adoption record
-- and the animal's adopted status are saved, or neither is.
create or replace function public.complete_adoption(
  p_application_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.adoption_applications%rowtype;
  v_animal public.animals%rowtype;
  v_adoption_id uuid;
begin
  if not public.is_approved_staff() then
    raise exception 'Approved staff access is required' using errcode = '42501';
  end if;

  select * into v_application
  from public.adoption_applications
  where id = p_application_id
  for update;
  if not found then raise exception 'Application not found'; end if;
  if v_application.status <> 'approved' then
    raise exception 'Only an approved application can be completed';
  end if;

  select * into v_animal
  from public.animals
  where id = v_application.animal_id
  for update;
  if not found or v_animal.adoption_status <> 'pending' then
    raise exception 'Animal is not awaiting completion of this adoption';
  end if;
  if exists (
    select 1 from public.adoptions ad
    where ad.application_id = v_application.id or ad.animal_id = v_animal.id
  ) then
    raise exception 'An adoption record already exists for this application or animal';
  end if;

  insert into public.adoptions (application_id, animal_id, adopter_id, completed_by)
  values (
    v_application.id, v_animal.id, v_application.adopter_id, (select auth.uid())
  )
  returning id into v_adoption_id;

  perform set_config('adoptail.allow_animal_status_workflow', 'on', true);
  update public.animals
  set adoption_status = 'adopted'
  where id = v_animal.id;

  return v_adoption_id;
end;
$$;


-- Preserve the existing fostered status while restricting it to the two
-- supported staff transitions: available -> fostered -> available.
create or replace function public.set_animal_foster_status(
  p_animal_id uuid,
  p_is_fostered boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_animal public.animals%rowtype;
  v_target_status text;
begin
  if not public.is_approved_staff() then
    raise exception 'Approved staff access is required' using errcode = '42501';
  end if;
  if p_is_fostered is null then raise exception 'Foster status is required'; end if;

  select * into v_animal
  from public.animals
  where id = p_animal_id
  for update;
  if not found then raise exception 'Animal not found'; end if;

  if p_is_fostered then
    if v_animal.adoption_status <> 'available' then
      raise exception 'Only available animals can be marked fostered';
    end if;
    v_target_status := 'fostered';
  else
    if v_animal.adoption_status <> 'fostered' then
      raise exception 'Only fostered animals can be returned to available';
    end if;
    v_target_status := 'available';
  end if;

  perform set_config('adoptail.allow_animal_status_workflow', 'on', true);
  update public.animals
  set adoption_status = v_target_status
  where id = v_animal.id;
end;
$$;


-- Do not allow direct Data API updates to bypass the status workflow. Staff
-- can still edit descriptive listing columns and create available animals.
revoke insert, update, delete on table public.animals from authenticated;
grant insert (
  name, species, breed, age_months, description, care_needs, listing_visible
) on table public.animals to authenticated;
grant update (
  name, species, breed, age_months, description, care_needs, listing_visible
) on table public.animals to authenticated;

-- Only approved staff may directly write medical records; adopters can read
-- adopter-visible records under the existing policy.
revoke update on table public.medical_records from authenticated;
grant update (
  animal_id, record_type, record_date, summary, details, adopter_visible
) on table public.medical_records to authenticated;

-- Public photo access must follow the animal's listing visibility.
drop policy if exists "Anyone can read photos for visible animals"
  on public.animal_photos;
create policy "Anyone can read photos for visible animals"
  on public.animal_photos
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.animals a
      where a.id = animal_photos.animal_id
        and a.listing_visible
    )
  );


-- All workflow writes go through authenticated RPCs. The functions verify the
-- current Supabase Auth user and their adopter/staff profile role.
revoke all on function public.submit_adoption_application(uuid, text) from public, anon;
revoke all on function public.decide_adoption_application(uuid, text) from public, anon;
revoke all on function public.submit_appointment_request(uuid, timestamptz) from public, anon;
revoke all on function public.decide_appointment(uuid, text) from public, anon;
revoke all on function public.reschedule_appointment(uuid, timestamptz) from public, anon;
revoke all on function public.complete_adoption(uuid) from public, anon;
revoke all on function public.set_animal_foster_status(uuid, boolean) from public, anon;

grant execute on function public.submit_adoption_application(uuid, text) to authenticated;
grant execute on function public.decide_adoption_application(uuid, text) to authenticated;
grant execute on function public.submit_appointment_request(uuid, timestamptz) to authenticated;
grant execute on function public.decide_appointment(uuid, text) to authenticated;
grant execute on function public.reschedule_appointment(uuid, timestamptz) to authenticated;
grant execute on function public.complete_adoption(uuid) to authenticated;
grant execute on function public.set_animal_foster_status(uuid, boolean) to authenticated;
