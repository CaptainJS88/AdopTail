alter table public.adoption_applications
  add column if not exists rejection_reason text
    check (rejection_reason is null or char_length(btrim(rejection_reason)) between 1 and 1000);

alter table public.appointments
  add column if not exists rejection_reason text
    check (rejection_reason is null or char_length(btrim(rejection_reason)) between 1 and 1000);

create or replace function public.decide_adoption_application(
  p_application_id uuid,
  p_decision text,
  p_rejection_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_approved_staff() then
    raise exception 'Approved staff access is required' using errcode = '42501';
  end if;
  if p_decision = 'rejected' and
     (p_rejection_reason is null or char_length(btrim(p_rejection_reason)) not between 1 and 1000) then
    raise exception 'Enter a rejection reason between 1 and 1000 characters';
  end if;

  perform public.decide_adoption_application(p_application_id, p_decision);
  update public.adoption_applications
  set rejection_reason = case when p_decision = 'rejected' then btrim(p_rejection_reason) else null end
  where id = p_application_id;
end;
$$;

revoke all on function public.decide_adoption_application(uuid, text, text) from public, anon;
grant execute on function public.decide_adoption_application(uuid, text, text) to authenticated;

create or replace function public.decide_appointment(
  p_appointment_id uuid,
  p_decision text,
  p_rejection_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_approved_staff() then
    raise exception 'Approved staff access is required' using errcode = '42501';
  end if;
  if p_decision = 'rejected' and
     (p_rejection_reason is null or char_length(btrim(p_rejection_reason)) not between 1 and 1000) then
    raise exception 'Enter a rejection reason between 1 and 1000 characters';
  end if;

  perform public.decide_appointment(p_appointment_id, p_decision);
  update public.appointments
  set rejection_reason = case when p_decision = 'rejected' then btrim(p_rejection_reason) else null end
  where id = p_appointment_id;
end;
$$;

revoke all on function public.decide_appointment(uuid, text, text) from public, anon;
grant execute on function public.decide_appointment(uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
