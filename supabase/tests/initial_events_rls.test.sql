begin;
select plan(5);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'rls-test-one@example.com', '', now(), '{}', '{}', now(), now()),
  ('20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'rls-test-two@example.com', '', now(), '{}', '{}', now(), now())
on conflict (id) do nothing;

insert into public.events (
  id, title, description, category, starts_at, ends_at, venue, organizer_id, approved_by, status
)
select
  '10000000-0000-4000-8000-000000000001',
  'RLS approved event',
  'Visible to campus visitors',
  'Workshop',
  now() + interval '2 days',
  now() + interval '2 days 1 hour',
  'Test Hall',
  '20000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  'approved'
;

insert into public.events (
  id, title, description, category, starts_at, ends_at, venue, organizer_id, status
)
select
  '10000000-0000-4000-8000-000000000002',
  'RLS draft event',
  'Not visible to campus visitors',
  'Workshop',
  now() + interval '3 days',
  now() + interval '3 days 1 hour',
  'Test Hall',
  '20000000-0000-4000-8000-000000000001',
  'draft'
;

set local role anon;
select is(
  (select count(*)::integer from public.events where id in (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  )),
  1,
  'Anonymous visitors only see approved events'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '20000000-0000-4000-8000-000000000001';
select is(
  (select count(*)::integer from public.events where id in (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  )),
  1,
  'Authenticated users only see approved events'
);
select is(
  (select count(*)::integer from public.profiles where id in (
    '20000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002'
  )),
  1,
  'Authenticated users can read only their own profile'
);
reset role;

select ok(not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'), 'Authenticated users cannot change their role');
select ok(not has_table_privilege('anon', 'public.profiles', 'SELECT'), 'Anonymous visitors cannot read profiles');

select * from finish();
rollback;
