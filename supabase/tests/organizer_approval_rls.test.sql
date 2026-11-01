begin;
select plan(49);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('70000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'pending-organizer@example.edu', '', now(), '{}', '{"account_role":"organizer","display_name":"Pending Organizer"}', now(), now()),
  ('70000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'faculty-approval@example.edu', '', now(), '{}', '{"account_role":"student"}', now(), now()),
  ('70000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'student-approval@example.edu', '', now(), '{}', '{"account_role":"student"}', now(), now()),
  ('70000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'pending-to-reject@example.edu', '', now(), '{}', '{"account_role":"organizer","display_name":"Reject Target Organizer"}', now(), now()),
  ('70000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'faculty-self-app@example.edu', '', now(), '{}', '{"account_role":"organizer","display_name":"Faculty Self App"}', now(), now()),
  ('70000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'second-organizer@example.edu', '', now(), '{}', '{"account_role":"organizer","display_name":"Second Organizer"}', now(), now())
on conflict (id) do nothing;

update public.profiles set role = 'faculty_admin' where id in ('70000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000005');

-- 1. Initial signup state verification
select is((select status from public.organizer_applications where organizer_id = '70000000-0000-4000-8000-000000000001'), 'pending', 'New organizer signup creates a pending application');
select is((select role::text from public.profiles where id = '70000000-0000-4000-8000-000000000003'), 'student', 'Student signup remains a student');

-- 2. Pending organizer permissions
set local role authenticated;
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
select throws_ok($$insert into public.events (title, description, category, starts_at, ends_at, venue, organizer_id, status)
  values ('Blocked pending event', 'Pending users cannot author events', 'Workshop', now() + interval '7 days', now() + interval '7 days 1 hour', 'Test Hall', '70000000-0000-4000-8000-000000000001', 'draft')$$,
  '42501', null, 'Pending organizer cannot create an event');
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'approved', null)$$,
  '42501', null, 'Organizer cannot approve themselves');

-- 3. Student unauthorized attempts
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000003';
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'approved', null)$$,
  '42501', null, 'Student cannot approve an organizer');

-- 4. Faculty list and approve pending organizer
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000002';
select is((select count(*)::integer from public.list_organizer_applications() where organizer_id = '70000000-0000-4000-8000-000000000001'), 1, 'Faculty can read organizer applications');
select lives_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'approved', null)$$,
  'Faculty can approve a pending organizer');
select is((select status from public.organizer_applications where organizer_id = '70000000-0000-4000-8000-000000000001'), 'approved', 'Faculty approval changes the application status');
select is((select count(*)::integer from public.organizer_email_outbox where organizer_id = '70000000-0000-4000-8000-000000000001' and notification_type = 'organizer_approved'), 1, 'Approval creates exactly one email outbox item');

-- 5. Approved organizer can now author events
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
select lives_ok($$insert into public.events (id, title, description, category, starts_at, ends_at, venue, organizer_id, status)
  values ('70000000-0000-4000-8000-000000000010', 'Approved organizer event', 'Event draft', 'Workshop', now() + interval '7 days', now() + interval '7 days 1 hour', 'Hall A', '70000000-0000-4000-8000-000000000001', 'draft')$$,
  'Approved organizer can create draft events');

-- 6. Validation and security constraints on management RPC
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000002';
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000004', 'rejected', null)$$,
  '22023', null, 'Rejecting without a reason fails');
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000004', 'rejected', '   ')$$,
  '22023', null, 'Rejecting with whitespace-only reason fails');
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000004', 'rejected', repeat('x', 2001))$$,
  '22023', null, 'Rejecting with reason exceeding 2000 characters fails');
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'removed', null)$$,
  '22023', null, 'Removing without a reason fails');
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'removed', '   ')$$,
  '22023', null, 'Removing with whitespace-only reason fails');
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'removed', repeat('x', 2001))$$,
  '22023', null, 'Removing with reason exceeding 2000 characters fails');
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000004', 'pending', null)$$,
  '22023', null, 'Requesting unsupported organizer status fails');

-- 7. Unauthorized roles cannot reject, remove, or restore organizers
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000003';
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000004', 'rejected', 'Valid rejection reason')$$,
  '42501', null, 'Student cannot reject an organizer');
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'removed', 'Valid removal reason')$$,
  '42501', null, 'Student cannot remove an organizer');
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'approved', null)$$,
  '42501', null, 'Student cannot restore an organizer');

-- Organizers cannot manage other organizer applications
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000006';
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000004', 'approved', null)$$,
  '42501', null, 'Organizers cannot manage other organizer applications');

-- Faculty cannot manage their own organizer application
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000005';
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000005', 'approved', null)$$,
  '42501', null, 'Faculty cannot manage their own organizer application');

-- 8. Operation 1: Reject organizer with reason
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000002';
select lives_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000004', 'rejected', 'Incomplete credentials provided')$$,
  'Faculty can reject a pending organizer with reason');
select is((select status from public.organizer_applications where organizer_id = '70000000-0000-4000-8000-000000000004'), 'rejected',
  'Application status changes to rejected');
select is((select rejected_reason from public.organizer_applications where organizer_id = '70000000-0000-4000-8000-000000000004'), 'Incomplete credentials provided',
  'Rejection reason is stored correctly');
select is((select count(*)::integer from public.notifications where recipient_id = '70000000-0000-4000-8000-000000000004' and notification_type = 'organizer_rejected'), 1,
  'Rejection creates an organizer_rejected in-app notification');
select is((select count(*)::integer from public.organizer_email_outbox where organizer_id = '70000000-0000-4000-8000-000000000004' and notification_type = 'organizer_rejected' and reason = 'Incomplete credentials provided'), 1,
  'Rejection creates an organizer_rejected outbox record with reason');

-- Rejected organizer cannot create events
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000004';
select throws_ok($$insert into public.events (title, description, category, starts_at, ends_at, venue, organizer_id, status)
  values ('Blocked rejected event', 'Draft', 'Workshop', now() + interval '7 days', now() + interval '7 days 1 hour', 'Hall B', '70000000-0000-4000-8000-000000000004', 'draft')$$,
  '42501', null, 'Rejected organizer cannot create an event');

-- 9. Invalid state transitions
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000002';
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000004', 'rejected', 'Second rejection')$$,
  'P0001', null, 'Cannot re-reject an already rejected organizer');
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000004', 'removed', 'Attempt remove on rejected')$$,
  'P0001', null, 'Cannot remove a rejected organizer');
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'approved', null)$$,
  'P0001', null, 'Cannot re-approve an already approved organizer');
select throws_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'rejected', 'Attempt reject on approved')$$,
  'P0001', null, 'Cannot reject an already approved organizer');

-- 10. Operation 2: Remove approved organizer with reason
select lives_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'removed', 'Policy violations reported')$$,
  'Faculty can remove an approved organizer with reason');
select is((select status from public.organizer_applications where organizer_id = '70000000-0000-4000-8000-000000000001'), 'removed',
  'Application status changes to removed');
select is((select removed_reason from public.organizer_applications where organizer_id = '70000000-0000-4000-8000-000000000001'), 'Policy violations reported',
  'Removal reason is stored correctly');
select is((select count(*)::integer from public.notifications where recipient_id = '70000000-0000-4000-8000-000000000001' and notification_type = 'organizer_removed'), 1,
  'Removal creates an organizer_removed in-app notification');
select is((select count(*)::integer from public.organizer_email_outbox where organizer_id = '70000000-0000-4000-8000-000000000001' and notification_type = 'organizer_removed' and reason = 'Policy violations reported'), 1,
  'Removal creates an organizer_removed outbox record with reason');

-- Removed organizer cannot create events
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
select throws_ok($$insert into public.events (title, description, category, starts_at, ends_at, venue, organizer_id, status)
  values ('Blocked removed event', 'Draft', 'Workshop', now() + interval '7 days', now() + interval '7 days 1 hour', 'Hall C', '70000000-0000-4000-8000-000000000001', 'draft')$$,
  '42501', null, 'Removed organizer cannot create an event');

-- 11. Operation 3: Restore organizer
-- Part A: Restore rejected organizer (User 4)
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000002';
select lives_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000004', 'approved', null)$$,
  'Faculty can restore a rejected organizer');
select is((select status from public.organizer_applications where organizer_id = '70000000-0000-4000-8000-000000000004'), 'approved',
  'Restored rejected organizer status changes to approved');
select is((select count(*)::integer from public.notifications where recipient_id = '70000000-0000-4000-8000-000000000004' and notification_type = 'organizer_restored'), 1,
  'Restoring rejected organizer creates organizer_restored notification');
select is((select count(*)::integer from public.organizer_email_outbox where organizer_id = '70000000-0000-4000-8000-000000000004' and notification_type = 'organizer_restored'), 1,
  'Restoring rejected organizer creates organizer_restored outbox item');

-- Restored organizer 4 regains event-authoring access
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000004';
select lives_ok($$insert into public.events (id, title, description, category, starts_at, ends_at, venue, organizer_id, status)
  values ('70000000-0000-4000-8000-000000000040', 'Restored organizer event', 'Draft', 'Workshop', now() + interval '7 days', now() + interval '7 days 1 hour', 'Hall D', '70000000-0000-4000-8000-000000000004', 'draft')$$,
  'Restored organizer regains permitted event-authoring access');

-- Part B: Restore removed organizer (User 1)
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000002';
select lives_ok($$select public.manage_organizer_application('70000000-0000-4000-8000-000000000001', 'approved', null)$$,
  'Faculty can restore a removed organizer');
select is((select status from public.organizer_applications where organizer_id = '70000000-0000-4000-8000-000000000001'), 'approved',
  'Restored removed organizer status changes to approved');
select is((select removed_reason from public.organizer_applications where organizer_id = '70000000-0000-4000-8000-000000000001'), null,
  'Restoration clears removal reason');
select is((select count(*)::integer from public.notifications where recipient_id = '70000000-0000-4000-8000-000000000001' and notification_type = 'organizer_restored'), 1,
  'Restoring removed organizer creates organizer_restored notification');
select is((select count(*)::integer from public.organizer_email_outbox where organizer_id = '70000000-0000-4000-8000-000000000001' and notification_type = 'organizer_restored'), 1,
  'Restoring removed organizer creates organizer_restored outbox item');

-- Restored organizer 1 regains event-authoring access
set local "request.jwt.claim.sub" = '70000000-0000-4000-8000-000000000001';
select lives_ok($$insert into public.events (id, title, description, category, starts_at, ends_at, venue, organizer_id, status)
  values ('70000000-0000-4000-8000-000000000011', 'Restored organizer event 2', 'Draft', 'Workshop', now() + interval '8 days', now() + interval '8 days 1 hour', 'Hall E', '70000000-0000-4000-8000-000000000001', 'draft')$$,
  'Restored organizer 1 regains event-authoring access');

reset role;
select * from finish();
rollback;
