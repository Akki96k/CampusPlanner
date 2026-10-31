create type public.registration_status as enum ('registered', 'cancelled');
create type public.attendance_status as enum ('pending', 'attended', 'absent');

create table public.event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  student_id uuid not null references public.profiles(id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) between 1 and 120),
  email text not null check (length(btrim(email)) between 3 and 254 and email = lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null check (length(btrim(phone)) between 7 and 30),
  college_name text not null check (length(btrim(college_name)) between 1 and 160),
  student_number text not null check (length(btrim(student_number)) between 1 and 60),
  year_or_semester text not null check (length(btrim(year_or_semester)) between 1 and 40),
  graduation_year integer not null check (graduation_year between 2000 and 2150),
  participation_type text not null check (participation_type in ('solo', 'team')),
  status public.registration_status not null default 'registered',
  attendance public.attendance_status not null default 'pending',
  attended_by uuid references public.profiles(id) on delete set null,
  attendance_marked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, student_id),
  constraint attendance_marker_consistency check (
    (attendance = 'pending' and attended_by is null and attendance_marked_at is null)
    or (attendance <> 'pending' and attended_by is not null and attendance_marked_at is not null)
  )
);

create index event_registrations_student_idx on public.event_registrations(student_id, created_at desc);
create index event_registrations_event_idx on public.event_registrations(event_id, created_at);

create function private.event_has_registration_capacity(target_event uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.events e
    where e.id = target_event
      and (e.capacity is null or (select count(*) from public.event_registrations r where r.event_id = e.id and r.status = 'registered') < e.capacity)
  );
$$;
revoke execute on function private.event_has_registration_capacity(uuid) from public, anon;
grant execute on function private.event_has_registration_capacity(uuid) to authenticated;

create function private.guard_event_registration_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  event_row public.events%rowtype;
  current_count bigint;
begin
  new.full_name := regexp_replace(btrim(new.full_name), '[[:space:]]+', ' ', 'g');
  new.email := lower(btrim(new.email));
  new.phone := btrim(new.phone);
  new.college_name := regexp_replace(btrim(new.college_name), '[[:space:]]+', ' ', 'g');
  new.student_number := regexp_replace(btrim(new.student_number), '[[:space:]]+', ' ', 'g');
  new.year_or_semester := regexp_replace(btrim(new.year_or_semester), '[[:space:]]+', ' ', 'g');
  if new.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or new.phone !~ '^\+?[0-9() .-]{7,30}$' then
    raise exception using errcode = '23514', message = 'Registration email or phone format is invalid.';
  end if;
  if new.student_id is distinct from (select auth.uid())
    or not (select private.has_app_role('student')) then
    raise exception using errcode = '42501', message = 'Only the signed-in student can register.';
  end if;
  select * into event_row from public.events where id = new.event_id for update;
  if not found or event_row.status <> 'approved' or event_row.starts_at <= now()
    or (event_row.registration_deadline is not null and event_row.registration_deadline <= now()) then
    raise exception using errcode = '23514', message = 'Registration is closed for this event.';
  end if;
  if event_row.capacity is not null then
    select count(*) into current_count from public.event_registrations
      where event_id = new.event_id and status = 'registered';
    if current_count >= event_row.capacity then
      raise exception using errcode = '23514', message = 'Event capacity has been reached.';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function private.guard_event_registration_insert() from public, anon, authenticated;
create trigger guard_event_registration_before_insert before insert on public.event_registrations
for each row execute procedure private.guard_event_registration_insert();

alter table public.event_registrations enable row level security;
revoke all on table public.event_registrations from anon, authenticated;
grant select, insert on table public.event_registrations to authenticated;
grant update (attendance, attended_by, attendance_marked_at) on public.event_registrations to authenticated;

create policy "Students read their own event registrations"
  on public.event_registrations for select to authenticated
  using (student_id = (select auth.uid()) and (select private.has_app_role('student')));

create policy "Event organizers and faculty read event registrations"
  on public.event_registrations for select to authenticated
  using (
    (select private.has_app_role('faculty_admin'))
    or exists (
      select 1 from public.events e
      where e.id = event_registrations.event_id
        and e.organizer_id = (select auth.uid())
        and (select private.has_app_role('organizer'))
    )
  );

create policy "Students register for approved upcoming events"
  on public.event_registrations for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and status = 'registered'
    and attendance = 'pending'
    and attended_by is null
    and attendance_marked_at is null
    and (select private.has_app_role('student'))
    and exists (
      select 1 from public.events e
      where e.id = event_registrations.event_id
        and e.status = 'approved'
        and e.starts_at > now()
        and (e.registration_deadline is null or e.registration_deadline > now())
        and (select private.event_has_registration_capacity(e.id))
    )
  );

create policy "Event organizers and faculty mark registration attendance"
  on public.event_registrations for update to authenticated
  using (
    attendance = 'pending'
    and status = 'registered'
    and (
      (select private.has_app_role('faculty_admin'))
      or exists (
        select 1 from public.events e
        where e.id = event_registrations.event_id
          and e.organizer_id = (select auth.uid())
          and (select private.has_app_role('organizer'))
      )
    )
  )
  with check (
    attendance in ('attended', 'absent')
    and attended_by = (select auth.uid())
    and attendance_marked_at is not null
    and status = 'registered'
    and (
      (select private.has_app_role('faculty_admin'))
      or exists (
        select 1 from public.events e
        where e.id = event_registrations.event_id
          and e.organizer_id = (select auth.uid())
          and (select private.has_app_role('organizer'))
      )
    )
  );

create function public.guard_registration_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id is distinct from old.id
    or new.event_id is distinct from old.event_id
    or new.student_id is distinct from old.student_id
    or new.full_name is distinct from old.full_name
    or new.email is distinct from old.email
    or new.phone is distinct from old.phone
    or new.college_name is distinct from old.college_name
    or new.student_number is distinct from old.student_number
    or new.year_or_semester is distinct from old.year_or_semester
    or new.graduation_year is distinct from old.graduation_year
    or new.participation_type is distinct from old.participation_type
    or new.status is distinct from old.status
    or new.created_at is distinct from old.created_at
    or old.attendance <> 'pending'
    or new.attendance not in ('attended', 'absent')
    or new.attended_by is distinct from (select auth.uid())
    or new.attendance_marked_at is null then
    raise exception using errcode = '42501', message = 'Only an authorized event manager can mark attendance once.';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_registration_update() from public, anon, authenticated;
create trigger guard_registration_update_before_write before update on public.event_registrations
for each row execute procedure public.guard_registration_update();
