begin;
select plan(13);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('60000000-0000-4000-8000-000000000001','authenticated','authenticated','notify-organizer@example.edu','',now(),'{}','{}',now(),now()),
 ('60000000-0000-4000-8000-000000000002','authenticated','authenticated','notify-faculty-one@example.edu','',now(),'{}','{}',now(),now()),
 ('60000000-0000-4000-8000-000000000003','authenticated','authenticated','notify-faculty-two@example.edu','',now(),'{}','{}',now(),now()),
 ('60000000-0000-4000-8000-000000000004','authenticated','authenticated','notify-other-organizer@example.edu','',now(),'{}','{}',now(),now()),
 ('60000000-0000-4000-8000-000000000005','authenticated','authenticated','notify-student@example.edu','',now(),'{}','{}',now(),now())
on conflict (id) do nothing;

update public.profiles set role='organizer' where id='60000000-0000-4000-8000-000000000001';
update public.profiles set role='faculty_admin' where id in ('60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000003');
update public.profiles set role='organizer' where id='60000000-0000-4000-8000-000000000004';

insert into public.events(id,title,description,category,starts_at,ends_at,venue,organizer_id,status)
values ('60000000-0000-4000-8000-000000000010','Notification test','A workflow test','Workshop',now()+interval '7 days',now()+interval '7 days 1 hour','Test Hall','60000000-0000-4000-8000-000000000001','draft');

set local role authenticated;
set local "request.jwt.claim.sub"='60000000-0000-4000-8000-000000000001';
update public.events set title='Updated draft' where id='60000000-0000-4000-8000-000000000010';
select is((select count(*)::int from public.notifications),0,'Saving a draft does not notify faculty');
update public.events set status='pending_approval' where id='60000000-0000-4000-8000-000000000010';
select is((select count(*)::int from public.notifications where notification_type='event_submitted'),2,'Submission notifies all faculty admins');
select is((select count(*)::int from public.notifications where recipient_id='60000000-0000-4000-8000-000000000002'),1,'Each faculty recipient gets one notification');
select is((select count(*)::int from public.notifications where recipient_id='60000000-0000-4000-8000-000000000001'),0,'Organizer cannot read faculty notifications');

set local "request.jwt.claim.sub"='60000000-0000-4000-8000-000000000002';
select is((select count(*)::int from public.notifications where notification_type='event_submitted'),1,'Faculty can read their own approval notifications');
select is((with changed as (update public.notifications set read_at=now() where recipient_id='60000000-0000-4000-8000-000000000001' returning id) select count(*)::int from changed),0,'Faculty cannot mark an organizer notification read');
select throws_ok($$update public.notifications set message='tampered' where notification_type='event_submitted'$$,'42501',null,'Notification content is immutable');
select lives_ok($$select public.reject_event_with_remark('60000000-0000-4000-8000-000000000010','Please add the schedule.')$$,'Faculty rejection still uses the existing remark workflow');
select is((select count(*)::int from public.notifications where notification_type='event_rejected'),1,'Rejection notifies the event organizer once');

set local "request.jwt.claim.sub"='60000000-0000-4000-8000-000000000004';
select is((select count(*)::int from public.notifications where notification_type='event_rejected'),0,'Another organizer cannot read the rejection notification');
set local "request.jwt.claim.sub"='60000000-0000-4000-8000-000000000005';
select is((select count(*)::int from public.notifications),0,'Students cannot read workflow notifications');
set local "request.jwt.claim.sub"='60000000-0000-4000-8000-000000000001';
update public.notifications set read_at=now() where notification_type='event_rejected';
select is((select count(*)::int from public.notifications where read_at is null),0,'Organizer can mark own notification read and it persists');
select is((select count(*)::int from public.notifications where read_at is not null),1,'Read notification remains available in the list');

reset role;
select * from finish();
rollback;
