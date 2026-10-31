begin;
select plan(8);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('50000000-0000-4000-8000-000000000001','authenticated','authenticated','remarks-organizer@example.edu','',now(),'{}','{}',now(),now()),
 ('50000000-0000-4000-8000-000000000002','authenticated','authenticated','remarks-faculty@example.edu','',now(),'{}','{}',now(),now()),
 ('50000000-0000-4000-8000-000000000003','authenticated','authenticated','remarks-other-organizer@example.edu','',now(),'{}','{}',now(),now()),
 ('50000000-0000-4000-8000-000000000004','authenticated','authenticated','remarks-student@example.edu','',now(),'{}','{}',now(),now())
on conflict (id) do nothing;

update public.profiles set role='organizer' where id='50000000-0000-4000-8000-000000000001';
update public.profiles set role='faculty_admin' where id='50000000-0000-4000-8000-000000000002';
update public.profiles set role='organizer' where id='50000000-0000-4000-8000-000000000003';

insert into public.events(id,title,description,category,starts_at,ends_at,venue,organizer_id,status)
values ('50000000-0000-4000-8000-000000000010','Remarks test','Pending event','Workshop',now()+interval '7 days',now()+interval '7 days 1 hour','Test Hall','50000000-0000-4000-8000-000000000001','pending_approval');

set local role authenticated;
set local "request.jwt.claim.sub"='50000000-0000-4000-8000-000000000002';
select lives_ok($$select public.reject_event_with_remark('50000000-0000-4000-8000-000000000010','Please add a clear event schedule.')$$,'Faculty can reject with a required remark');
select is((select status::text from public.events where id='50000000-0000-4000-8000-000000000010'),'rejected','Rejection updates the event status');
select is((select count(*)::int from public.event_review_remarks where event_id='50000000-0000-4000-8000-000000000010'),1,'Faculty can read the saved remark');

set local "request.jwt.claim.sub"='50000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.event_review_remarks where event_id='50000000-0000-4000-8000-000000000010'),1,'The event organizer can read the saved remark');

set local "request.jwt.claim.sub"='50000000-0000-4000-8000-000000000003';
select is((select count(*)::int from public.event_review_remarks where event_id='50000000-0000-4000-8000-000000000010'),0,'Other organizers cannot read the remark');
select throws_ok($$select public.reject_event_with_remark('50000000-0000-4000-8000-000000000010','Unauthorized attempt')$$,'42501',null,'Organizers cannot call the faculty rejection workflow');

set local "request.jwt.claim.sub"='50000000-0000-4000-8000-000000000004';
select is((select count(*)::int from public.event_review_remarks where event_id='50000000-0000-4000-8000-000000000010'),0,'Students cannot read review remarks');
select throws_ok($$insert into public.event_review_remarks(event_id,faculty_id,remark) values('50000000-0000-4000-8000-000000000010','50000000-0000-4000-8000-000000000004','direct insert')$$,'42501',null,'Clients cannot directly insert review remarks');

reset role;
select * from finish();
rollback;
