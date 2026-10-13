create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null
    references public.animals(id) on delete restrict,
  record_type text not null
    check (record_type in ('vaccination', 'treatment', 'medication', 'other')),
  record_date date not null default current_date,
  summary text not null,
  details text not null default '',
  adopter_visible boolean not null default false,
  recorded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.medical_records enable row level security;

revoke all on table public.medical_records from public, anon, authenticated;
grant select, insert, update
  on public.medical_records to authenticated;

-- Adopters see only records staff marked visible.
-- Approved staff can read all medical records.
create policy "Adopters and approved staff can read medical records"
  on public.medical_records
  for select to authenticated
  using (
    adopter_visible
    or exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.staff_access_approved
    )
  );

create policy "Approved staff can add medical records"
  on public.medical_records
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.staff_access_approved
    )
  );

create policy "Approved staff can update medical records"
  on public.medical_records
  for update to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.staff_access_approved
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.staff_access_approved
    )
  );