begin;
select plan(12);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
 ('40000000-0000-4000-8000-000000000001','authenticated','authenticated','registration-organizer@example.edu','',now(),'{}','{}',now(),now()),
 ('40000000-0000-4000-8000-000000000002','authenticated','authenticated','registration-faculty@example.edu','',now(),'{}','{}',now(),now()),
 ('40000000-0000-4000-8000-000000000003','authenticated','authenticated','registration-student@example.edu','',now(),'{}','{}',now(),now()),
 ('40000000-0000-4000-8000-000000000004','authenticated','authenticated','registration-other@example.edu','',now(),'{}','{}',now(),now()),
 ('40000000-0000-4000-8000-000000000005','authenticated','authenticated','registration-other-organizer@example.edu','',now(),'{}','{}',now(),now())
on conflict (id) do nothing;
update public.profiles set role='organizer' where id='40000000-0000-4000-8000-000000000001';
update public.profiles set role='faculty_admin' where id='40000000-0000-4000-8000-000000000002';
update public.profiles set role='organizer' where id='40000000-0000-4000-8000-000000000005';
insert into public.events(id,title,description,category,starts_at,ends_at,venue,organizer_id,approved_by,status)
values ('40000000-0000-4000-8000-000000000010','Registration test','Test event','Workshop',now()+interval '7 days',now()+interval '7 days 1 hour','Test Hall','40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002','approved');

set local role authenticated;
set local "request.jwt.claim.sub"='40000000-0000-4000-8000-000000000003';
select lives_ok($$insert into public.event_registrations(event_id,student_id,full_name,email,phone,college_name,student_number,year_or_semester,graduation_year,participation_type)
 values('40000000-0000-4000-8000-000000000010','40000000-0000-4000-8000-000000000003','Student One','registration-student@example.edu','+1 555 555 5555','Example U','S-1','Year 2',2030,'solo')$$,'Student may register as self');
select is((select count(*)::int from public.event_registrations),1,'Student sees their own registration');
select throws_ok($$insert into public.event_registrations(event_id,student_id,full_name,email,phone,college_name,student_number,year_or_semester,graduation_year,participation_type)
 values('40000000-0000-4000-8000-000000000010','40000000-0000-4000-8000-000000000003','Student One','registration-student@example.edu','+1 555 555 5555','Example U','S-1','Year 2',2030,'solo')$$,'23505',null,'Database uniqueness prevents duplicate registrations');
select throws_ok($$insert into public.event_registrations(event_id,student_id,full_name,email,phone,college_name,student_number,year_or_semester,graduation_year,participation_type)
 values('40000000-0000-4000-8000-000000000010','40000000-0000-4000-8000-000000000004','Other Student','other@example.edu','+1 555 555 5555','Example U','S-2','Year 1',2031,'team')$$,'42501',null,'Student cannot register another user');

set local "request.jwt.claim.sub"='40000000-0000-4000-8000-000000000004';
select is((select count(*)::int from public.event_registrations),0,'A student cannot read another student registration');
select throws_ok($$insert into public.event_registrations(event_id,student_id,full_name,email,phone,college_name,student_number,year_or_semester,graduation_year,participation_type)
 values('40000000-0000-4000-8000-000000000010','40000000-0000-4000-8000-000000000004','Other Student','other@example.edu','+1 555 555 5555','Example U','S-2','Year 1',2031,'team')$$,'42501',null,'Unauthorized student cannot insert details owned by another student');

set local role anon;
reset "request.jwt.claim.sub";
select throws_ok($$insert into public.event_registrations(event_id,student_id,full_name,email,phone,college_name,student_number,year_or_semester,graduation_year,participation_type)
 values('40000000-0000-4000-8000-000000000010','40000000-0000-4000-8000-000000000004','Other Student','other@example.edu','+1 555 555 5555','Example U','S-2','Year 1',2031,'team')$$,'42501',null,'Unauthenticated users cannot register');

set local role authenticated;
set local "request.jwt.claim.sub"='40000000-0000-4000-8000-000000000005';
select is((select count(*)::int from public.event_registrations),0,'An organizer cannot read registrations for another organizer event');
select is((with unauthorized as (update public.event_registrations set attendance='attended', attended_by='40000000-0000-4000-8000-000000000005', attendance_marked_at=now() returning id) select count(*)::int from unauthorized),0,'An organizer cannot mark attendance for another organizer event');

set local "request.jwt.claim.sub"='40000000-0000-4000-8000-000000000001';
select is((select count(*)::int from public.event_registrations),1,'Organizer of the event can read its registrations');

set local "request.jwt.claim.sub"='40000000-0000-4000-8000-000000000002';
select lives_ok($$update public.event_registrations set attendance='attended', attended_by='40000000-0000-4000-8000-000000000002', attendance_marked_at=now()$$,'Faculty can mark attendance');
select throws_ok($$update public.event_registrations set attendance='absent', attended_by='40000000-0000-4000-8000-000000000002', attendance_marked_at=now()$$,'42501',null,'Attendance cannot be marked twice');

reset role;
select * from finish();
rollback;
