begin;
select plan(9);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('70000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'pending-organizer@example.edu', '', now(), '{}', '{"account_role":"organizer","display_name":"Pending Organizer"}', now(), now()),
  ('70000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'faculty-approval@example.edu', '', now(), '{}', '{"account_role":"student"}', now(), now()),
  ('70000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'student-approval@example.edu', '', now(), '{}', '{"account_role":"student"}', now(), now())
on conflict (id) do nothing;

update public.profiles set role = 'faculty_admin' where id = '70000000-0000-4000-8000-000000000002';

select is((select status from public.organizer_applications where organizer_id = '70000000-0000-4000-8000-000000000001'), 'pending', 'New organizer signup creates a pending application');
select is((select role::text from public.profiles where id = '70000000-0000-4000-8000-000000000003'), 'student', 'Student signup remains a student');

set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
select throws_ok($$insert into public.events (title, description, category, starts_at, ends_at, venue, organizer_id, status)
  values ('Blocked pending event', 'Pending users cannot author events', 'Workshop', now() + interval '7 days', now() + interval '7 days 1 hour', 'Test Hall', '70000000-0000-4000-8000-000000000001', 'draft')$$,
  '42501', null, 'Pending organizer cannot create an event');
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'approved', null)$$,
  '42501', null, 'Organizer cannot approve themselves');

set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000003';
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'approved', null)$$,
  '42501', null, 'Student cannot approve an organizer');

set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.list_organizer_applications() where organizer_id = '70000000-0000-4000-8000-000000000001'), 1, 'Faculty can read organizer applications');
select lives_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'approved', null)$$,
  'Faculty can approve a pending organizer');
select is((select status from public.organizer_applications where organizer_id = '70000000-0000-4000-8000-000000000001'), 'approved', 'Faculty approval changes the application status');
select is((select count(*)::integer from public.organizer_email_outbox where organizer_id = '70000000-0000-4000-8000-000000000001' and notification_type = 'organizer_approved'), 1, 'Approval creates exactly one email outbox item');

reset role;
select * from finish();
rollback;
