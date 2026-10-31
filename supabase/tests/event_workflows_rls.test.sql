begin;
select plan(12);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('30000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'organizer-workflow-test@example.com', '', now(), '{}', '{}', now(), now()),
  ('30000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'faculty-workflow-test@example.com', '', now(), '{}', '{}', now(), now()),
  ('30000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'student-workflow-test@example.com', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

update public.profiles set role = 'organizer' where id = '30000000-0000-4000-8000-000000000001';
update public.profiles set role = 'faculty_admin' where id = '30000000-0000-4000-8000-000000000002';

set local role authenticated;
set local "request.jwt.claim.sub" = '30000000-0000-4000-8000-000000000001';

select lives_ok($$insert into public.events (title, description, category, starts_at, ends_at, venue, organizer_id, status)
  values ('Organizer draft one', 'Event for an RLS test', 'Workshop', now() + interval '7 days', now() + interval '7 days 1 hour', 'Test Hall', '30000000-0000-4000-8000-000000000001', 'draft')$$,
  'Organizers can create their own draft events');
select lives_ok($$insert into public.events (id, title, description, category, starts_at, ends_at, venue, organizer_id, status)
  values ('30000000-0000-4000-8000-000000000010', 'Organizer draft two', 'Event for an RLS test', 'Workshop', now() + interval '8 days', now() + interval '8 days 1 hour', 'Test Hall', '30000000-0000-4000-8000-000000000001', 'draft')$$,
  'Organizers can create a second draft for rejection testing');
select throws_ok($$insert into public.events (title, description, category, starts_at, ends_at, venue, organizer_id, status)
  values ('Self-approved event', 'Should be rejected by RLS', 'Workshop', now() + interval '9 days', now() + interval '9 days 1 hour', 'Test Hall', '30000000-0000-4000-8000-000000000001', 'approved')$$,
  '42501', null, 'Organizers cannot create approved events');

select lives_ok($$update public.events set status = 'pending_approval'
  where title = 'Organizer draft one'$$, 'Organizers can submit their draft for approval');
select is((select status::text from public.events where title = 'Organizer draft one'), 'pending_approval', 'Submitted events remain pending until faculty acts');
select lives_ok($$update public.events set status = 'pending_approval'
  where id = '30000000-0000-4000-8000-000000000010'$$, 'Organizers can submit another draft');

set local "request.jwt.claim.sub" = '30000000-0000-4000-8000-000000000003';
select throws_ok($$insert into public.events (title, description, category, starts_at, ends_at, venue, organizer_id, status)
  values ('Student event', 'Students cannot create events', 'Workshop', now() + interval '10 days', now() + interval '10 days 1 hour', 'Test Hall', '30000000-0000-4000-8000-000000000003', 'draft')$$,
  '42501', null, 'Students cannot create events');

set local "request.jwt.claim.sub" = '30000000-0000-4000-8000-000000000002';
select throws_ok($$update public.events
  set title = 'Changed by faculty', status = 'approved', approved_by = '30000000-0000-4000-8000-000000000002'
  where title = 'Organizer draft one'$$,
  '42501', null, 'Faculty cannot edit event details while deciding');
select lives_ok($$update public.events
  set status = 'approved', approved_by = '30000000-0000-4000-8000-000000000002'
  where title = 'Organizer draft one'$$, 'Faculty can approve a pending event');
select is((select approved_by from public.events where title = 'Organizer draft one'), '30000000-0000-4000-8000-000000000002'::uuid, 'Approval records the faculty member');
select lives_ok($$update public.events
  set status = 'rejected', approved_by = null
  where id = '30000000-0000-4000-8000-000000000010'$$, 'Faculty can reject a pending event');
select is((select status::text from public.events where id = '30000000-0000-4000-8000-000000000010'), 'rejected', 'Rejected events return to the organizer');

reset role;
select * from finish();
rollback;
