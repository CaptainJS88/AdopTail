-- App-specific profile data.
-- Supabase Auth stores the login credentials; this table does not store passwords.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'adopter'
    check (role in ('adopter', 'staff')),
  staff_access_approved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Create a profile automatically after Supabase Auth creates a user.
-- New signups always start as adopters.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- Users can read their own profile and change only their display name.
-- They cannot promote themselves to staff.
alter table public.profiles enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "Users can read their own profile"
  on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update their own display name"
  on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);


-- Animal listings.
create table public.animals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  species text not null,
  breed text,
  age_months integer check (age_months is null or age_months >= 0),
  description text not null,
  care_needs text not null default '',
  adoption_status text not null default 'available'
    check (
      adoption_status in ('available', 'pending', 'fostered', 'adopted')
    ),
  listing_visible boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.animals enable row level security;

revoke all on table public.animals from public, anon, authenticated;
grant select on public.animals to anon, authenticated;
grant insert, update on public.animals to authenticated;

-- Public browsing can see visible listings.
create policy "Anyone can read visible animal listings"
  on public.animals
  for select to anon, authenticated
  using (listing_visible);

-- Approved staff can also see hidden listings.
create policy "Approved staff can read all animal listings"
  on public.animals
  for select to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = (select auth.uid())
        and p.role = 'staff'
        and p.staff_access_approved
    )
  );

create policy "Approved staff can add animal listings"
  on public.animals
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

create policy "Approved staff can update animal listings"
  on public.animals
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


-- Separate rows let an animal have multiple photos.
-- Store image links here; the image files need lasting storage elsewhere.
create table public.animal_photos (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references public.animals(id) on delete cascade,
  photo_url text not null,
  alt_text text not null default '',
  display_order integer not null default 0
);

alter table public.animal_photos enable row level security;

revoke all on table public.animal_photos from public, anon, authenticated;
grant select on public.animal_photos to anon, authenticated;
grant insert, update, delete on public.animal_photos to authenticated;

create policy "Anyone can read photos for visible animals"
  on public.animal_photos
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.animals a
      where a.id = animal_photos.animal_id
    )
  );

create policy "Approved staff can manage animal photos"
  on public.animal_photos
  for all to authenticated
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