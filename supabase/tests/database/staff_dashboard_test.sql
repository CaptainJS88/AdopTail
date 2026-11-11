begin;
select no_plan();

-- Fixtures are rolled back with this test file by the Supabase test runner.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('81000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'staff-dashboard-adopter@example.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('81000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'staff-dashboard-adopter-two@example.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
  ('81000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'staff-dashboard-staff@example.test', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles set role = 'staff', staff_access_approved = true
where id = '81000000-0000-4000-8000-000000000003';

insert into public.animals (id, name, species, description, care_needs)
values
  ('82000000-0000-4000-8000-000000000001', 'Dashboard Test Pet One', 'dog', 'Test listing one', ''),
  ('82000000-0000-4000-8000-000000000002', 'Dashboard Test Pet Two', 'cat', 'Test listing two', ''),
  ('82000000-0000-4000-8000-000000000003', 'Dashboard Test Pet Three', 'dog', 'Test listing three', '');

create temporary table staff_dashboard_test_ids (
  id integer primary key default 1,
  app_one uuid,
  app_two uuid,
  visit_one uuid,
  visit_two uuid,
  visit_slot timestamptz
);
insert into staff_dashboard_test_ids (visit_slot) values ((date_trunc('week', now() at time zone 'America/Chicago') + interval '14 days 10 hours') at time zone 'America/Chicago');

select has_column('public', 'adoption_applications', 'contact_name', 'application snapshots include the applicant name');
select has_column('public', 'adoption_applications', 'daily_care', 'application snapshots include the care plan');
select has_column('public', 'appointments', 'visit_note', 'visit requests include the optional question');
select has_column('public', 'animal_photos', 'storage_path', 'photo rows retain the Storage object path');
select ok(exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Approved staff can upload pet photos'), 'Storage upload policy is defined for approved staff');
select ok(exists(select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Approved staff can delete pet photos'), 'Storage delete policy is defined for approved staff');

select set_config('request.jwt.claims', '{}', true);
select set_config('request.jwt.claim.sub', '', true);
select ok(not public.is_approved_staff(), 'unauthenticated requests are not approved staff');

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated","email":"staff-dashboard-adopter@example.test"}', true);
select ok(not public.is_approved_staff(), 'adopter is not approved staff');
set local role authenticated;
update public.animals set listing_visible = false where id = '82000000-0000-4000-8000-000000000002';
reset role;
select is((select listing_visible from public.animals where id = '82000000-0000-4000-8000-000000000002'), true, 'adopter cannot hide a pet listing');
set local role authenticated;
select throws_ok(
  $$insert into storage.objects (bucket_id, name) values ('animal-photos', 'adopter-upload.jpg')$$,
  '42501', 'new row violates row-level security policy for table "objects"', 'adopter cannot upload pet photos'
);
reset role;

update staff_dashboard_test_ids set app_one = public.submit_adoption_application(
  '82000000-0000-4000-8000-000000000001',
  '{"full_name":"Test Adopter","phone":"2145550100","city":"Arlington","housing_type":"Apartment","home_ownership":"Rent","pet_permission":"Yes","household":"Two adults","other_pets":"None","experience":"First-time owner","daily_care":"Daily walks","reason":"Ready to provide a loving home"}'::jsonb
) where id = 1;
select is((select contact_name from public.adoption_applications where id = (select app_one from staff_dashboard_test_ids)), 'Test Adopter', 'application saves the contact name snapshot');
select is((select contact_email from public.adoption_applications where id = (select app_one from staff_dashboard_test_ids)), 'staff-dashboard-adopter@example.test', 'application email comes from the signed-in Auth user');
select throws_ok(
  $$select public.submit_adoption_application('82000000-0000-4000-8000-000000000001', '{"full_name":"Test Adopter","phone":"123","city":"Arlington","housing_type":"Apartment","home_ownership":"Rent","pet_permission":"Yes","other_pets":"None","daily_care":"Daily walks","reason":"Ready"}'::jsonb)$$,
  'P0001', 'Phone number must contain 10 digits', 'application rejects malformed phone numbers'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated","email":"staff-dashboard-adopter-two@example.test"}', true);
update staff_dashboard_test_ids set app_two = public.submit_adoption_application(
  '82000000-0000-4000-8000-000000000003',
  '{"full_name":"Second Adopter","phone":"2145550101","city":"Dallas","housing_type":"House","home_ownership":"Own","pet_permission":"Yes","other_pets":"None","daily_care":"Daily walks","reason":"Ready to provide a loving home"}'::jsonb
) where id = 1;

set local role authenticated;
select is((select count(*) from public.adoption_applications where animal_id in ('82000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000003')), 1::bigint, 'adopter only sees their own applications');
reset role;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated","email":"staff-dashboard-staff@example.test"}', true);
set local role authenticated;
select is((select count(*) from public.adoption_applications where animal_id in ('82000000-0000-4000-8000-000000000001', '82000000-0000-4000-8000-000000000003')), 2::bigint, 'approved staff sees all applications');
reset role;

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated","email":"staff-dashboard-adopter@example.test"}', true);
select throws_ok(
  format('select public.decide_adoption_application(%L::uuid, %L)', (select app_one from staff_dashboard_test_ids), 'approved'),
  '42501', 'Approved staff access is required', 'adopter cannot decide an application'
);
select throws_ok(
  $$select public.set_animal_foster_status('82000000-0000-4000-8000-000000000002', true)$$,
  '42501', 'Approved staff access is required', 'adopter cannot change foster status'
);

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated","email":"staff-dashboard-staff@example.test"}', true);
select lives_ok(
  format('select public.decide_adoption_application(%L::uuid, %L)', (select app_one from staff_dashboard_test_ids), 'approved'),
  'approved staff can approve an application'
);
select is((select status from public.adoption_applications where id = (select app_one from staff_dashboard_test_ids)), 'approved', 'application status is updated');
select is((select adoption_status from public.animals where id = '82000000-0000-4000-8000-000000000001'), 'pending', 'approval moves the pet to pending');
select lives_ok(
  format('select public.decide_adoption_application(%L::uuid, %L, %L)', (select app_two from staff_dashboard_test_ids), 'rejected', 'This pet needs a different daily care plan.'),
  'staff can reject a submitted application'
);
select is((select status from public.adoption_applications where id = (select app_two from staff_dashboard_test_ids)), 'rejected', 'rejection is saved on the application');
select is((select adoption_status from public.animals where id = '82000000-0000-4000-8000-000000000003'), 'available', 'rejecting an application leaves the pet available');
select is((select rejection_reason from public.adoption_applications where id = (select app_two from staff_dashboard_test_ids)), 'This pet needs a different daily care plan.', 'application rejection saves the staff reason');
select lives_ok(format('select public.complete_adoption(%L::uuid)', (select app_one from staff_dashboard_test_ids)), 'staff can complete an approved adoption');
select is((select adoption_status from public.animals where id = '82000000-0000-4000-8000-000000000001'), 'adopted', 'completed adoption marks the pet adopted');
select is((select count(*) from public.adoptions where application_id = (select app_one from staff_dashboard_test_ids)), 1::bigint, 'completed adoption is recorded once');

select lives_ok($$select public.set_animal_foster_status('82000000-0000-4000-8000-000000000002', true)$$, 'staff can mark an available pet fostered');
select is((select adoption_status from public.animals where id = '82000000-0000-4000-8000-000000000002'), 'fostered', 'foster status is saved');
select lives_ok($$select public.set_animal_foster_status('82000000-0000-4000-8000-000000000002', false)$$, 'staff can return a fostered pet to available');
select is((select adoption_status from public.animals where id = '82000000-0000-4000-8000-000000000002'), 'available', 'fostered pet returns to available');

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated","email":"staff-dashboard-adopter@example.test"}', true);
update staff_dashboard_test_ids set visit_one = public.submit_appointment_request(
  '82000000-0000-4000-8000-000000000002',
  visit_slot,
  '{"full_name":"Test Adopter","phone":"2145550100","note":"Can I meet this pet?"}'::jsonb
) where id = 1;
select is((select contact_name from public.appointments where id = (select visit_one from staff_dashboard_test_ids)), 'Test Adopter', 'visit saves requester contact details');
select is((select visit_note from public.appointments where id = (select visit_one from staff_dashboard_test_ids)), 'Can I meet this pet?', 'visit saves the optional question');

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000002","role":"authenticated","email":"staff-dashboard-adopter-two@example.test"}', true);
update staff_dashboard_test_ids set visit_two = public.submit_appointment_request(
  '82000000-0000-4000-8000-000000000002',
  visit_slot,
  '{"full_name":"Second Adopter","phone":"2145550101","note":""}'::jsonb
) where id = 1;

set local role authenticated;
select is((select count(*) from public.appointments where animal_id = '82000000-0000-4000-8000-000000000002'), 1::bigint, 'adopter only sees their own visit requests');
reset role;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated","email":"staff-dashboard-staff@example.test"}', true);
set local role authenticated;
select is((select count(*) from public.appointments where animal_id = '82000000-0000-4000-8000-000000000002'), 2::bigint, 'approved staff sees all visit requests');
reset role;

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated","email":"staff-dashboard-adopter@example.test"}', true);
select throws_ok(
  format('select public.decide_appointment(%L::uuid, %L)', (select visit_one from staff_dashboard_test_ids), 'approved'),
  '42501', 'Approved staff access is required', 'adopter cannot decide a visit request'
);
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated","email":"staff-dashboard-staff@example.test"}', true);
select lives_ok(format('select public.decide_appointment(%L::uuid, %L)', (select visit_one from staff_dashboard_test_ids), 'approved'), 'staff can approve a visit');
select throws_ok(
  format('select public.decide_appointment(%L::uuid, %L)', (select visit_two from staff_dashboard_test_ids), 'approved'),
  'P0001', 'This time overlaps another approved visit for the animal', 'staff cannot approve overlapping visits'
);
select lives_ok(
  format('select public.reschedule_appointment(%L::uuid, %L::timestamptz)', (select visit_one from staff_dashboard_test_ids), ((select visit_slot from staff_dashboard_test_ids) + interval '4 hours')::text),
  'staff can reschedule an approved visit'
);
select is((select starts_at from public.appointments where id = (select visit_one from staff_dashboard_test_ids)), (select visit_slot + interval '4 hours' from staff_dashboard_test_ids), 'rescheduled visit time is saved');

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated","email":"staff-dashboard-adopter@example.test"}', true);
set local role authenticated;
select throws_ok(
  $$insert into public.medical_records (animal_id, record_type, record_date, summary, recorded_by) values ('82000000-0000-4000-8000-000000000002', 'vaccination', current_date, 'Unauthorized write', '81000000-0000-4000-8000-000000000001')$$,
  '42501', 'new row violates row-level security policy for table "medical_records"', 'adopter cannot add medical records'
);
reset role;

select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000003","role":"authenticated","email":"staff-dashboard-staff@example.test"}', true);
set local role authenticated;
select lives_ok($$insert into public.medical_records (animal_id, record_type, record_date, summary, recorded_by) values ('82000000-0000-4000-8000-000000000002', 'vaccination', current_date, 'Test vaccination', '81000000-0000-4000-8000-000000000003')$$, 'approved staff can add medical records');
reset role;
select set_config('request.jwt.claim.sub', '81000000-0000-4000-8000-000000000001', true);
select set_config('request.jwt.claims', '{"sub":"81000000-0000-4000-8000-000000000001","role":"authenticated","email":"staff-dashboard-adopter@example.test"}', true);
set local role authenticated;
select is((select count(*) from public.medical_records where animal_id = '82000000-0000-4000-8000-000000000002'), 0::bigint, 'adopters cannot read staff-only medical records');
reset role;

select * from finish();
rollback;
