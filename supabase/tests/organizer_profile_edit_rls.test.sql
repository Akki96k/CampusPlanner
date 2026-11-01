begin;
select plan(12);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('80000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'faculty-editor@example.edu', '', now(), '{}', '{"account_role":"student"}', now(), now()),
  ('80000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'organizer-target@example.edu', '', now(), '{}', '{"account_role":"organizer","display_name":"Original Organizer Name"}', now(), now()),
  ('80000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'student-attacker@example.edu', '', now(), '{}', '{"account_role":"student"}', now(), now()),
  ('80000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'peer-organizer@example.edu', '', now(), '{}', '{"account_role":"organizer","display_name":"Peer Organizer"}', now(), now())
on conflict (id) do nothing;

update public.profiles set role = 'faculty_admin' where id = '80000000-0000-4000-8000-000000000001';

-- 1. Faculty successfully editing permitted profile field (display_name)
set local role authenticated;
set local "request.jwt.claim.sub" = '80000000-0000-4000-8000-000000000001';

select lives_ok($$select public.update_organizer_profile('80000000-0000-4000-8000-000000000002', 'Dr. Jane Smith')$$,
  'Faculty can edit organizer display name');
select is((select display_name from public.profiles where id = '80000000-0000-4000-8000-000000000002'), 'Dr. Jane Smith',
  'Organizer display name is updated to the new value');

-- 2. Verify approval status and role are untouched and not bypassed
select is((select status from public.organizer_applications where organizer_id = '80000000-0000-4000-8000-000000000002'), 'pending',
  'Profile edit does not alter application status');
select is((select role::text from public.profiles where id = '80000000-0000-4000-8000-000000000002'), 'organizer',
  'Profile edit does not alter user role');

-- 3. Unauthorized student attempting an edit
set local "request.jwt.claim.sub" = '80000000-0000-4000-8000-000000000003';
select throws_ok($$select public.update_organizer_profile('80000000-0000-4000-8000-000000000002', 'Hacked By Student')$$,
  '42501', null, 'Student cannot invoke update_organizer_profile');
select throws_ok($$update public.profiles set display_name = 'Hacked By Student' where id = '80000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'Student cannot update organizer profile via direct RLS update');

-- 4. Organizer attempting to edit another organizer
set local "request.jwt.claim.sub" = '80000000-0000-4000-8000-000000000004';
select throws_ok($$select public.update_organizer_profile('80000000-0000-4000-8000-000000000002', 'Hacked By Peer')$$,
  '42501', null, 'Organizer cannot invoke update_organizer_profile on another organizer');
select throws_ok($$update public.profiles set display_name = 'Hacked By Peer' where id = '80000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'Organizer cannot update other organizer profile via direct RLS update');

-- 5. Invalid field values
set local "request.jwt.claim.sub" = '80000000-0000-4000-8000-000000000001';
select throws_ok($$select public.update_organizer_profile('80000000-0000-4000-8000-000000000002', null)$$,
  '22023', null, 'Reject null display name');
select throws_ok($$select public.update_organizer_profile('80000000-0000-4000-8000-000000000002', '   ')$$,
  '22023', null, 'Reject whitespace-only display name');
select throws_ok($$select public.update_organizer_profile('80000000-0000-4000-8000-000000000002', repeat('X', 101))$$,
  '22023', null, 'Reject display name exceeding 100 characters');

-- 6. Nonexistent organizer ID
select throws_ok($$select public.update_organizer_profile('80000000-0000-4000-8000-000000000999', 'Ghost Organizer')$$,
  'P0002', null, 'Nonexistent organizer ID raises P0002 not found');

reset role;
select * from finish();
rollback;

