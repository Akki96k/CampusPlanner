create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create function private.has_app_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles as profile
    where profile.id = (select auth.uid())
      and profile.role = required_role
  );
$$;

revoke execute on function private.has_app_role(public.app_role) from public, anon;
grant execute on function private.has_app_role(public.app_role) to authenticated;

alter table public.events
  add constraint events_capacity_max check (capacity is null or capacity <= 100000);

create function public.guard_event_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  actor_role public.app_role;
begin
  select profile.role
    into actor_role
    from public.profiles as profile
    where profile.id = actor_id;

  if actor_id is null then
    raise exception using errcode = '42501', message = 'An authenticated user is required.';
  end if;

  if actor_role = 'organizer' and old.organizer_id = actor_id then
    if old.status not in ('draft', 'rejected')
      or new.status not in ('draft', 'pending_approval')
      or new.approved_by is not null
      or new.id is distinct from old.id
      or new.organizer_id is distinct from old.organizer_id
      or new.created_at is distinct from old.created_at then
      raise exception using errcode = '42501', message = 'Organizers may edit drafts and rejected events, then submit them for approval.';
    end if;
  elsif actor_role = 'faculty_admin' and old.status = 'pending_approval' then
    if new.status not in ('approved', 'rejected')
      or new.id is distinct from old.id
      or new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.category is distinct from old.category
      or new.starts_at is distinct from old.starts_at
      or new.ends_at is distinct from old.ends_at
      or new.venue is distinct from old.venue
      or new.capacity is distinct from old.capacity
      or new.registration_deadline is distinct from old.registration_deadline
      or new.organizer_id is distinct from old.organizer_id
      or new.created_at is distinct from old.created_at
      or (new.status = 'approved' and new.approved_by is distinct from actor_id)
      or (new.status = 'rejected' and new.approved_by is not null) then
      raise exception using errcode = '42501', message = 'Faculty may approve or reject pending events without editing their details.';
    end if;
  else
    raise exception using errcode = '42501', message = 'You are not allowed to update this event.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.guard_event_update() from public, anon, authenticated;

create trigger guard_event_update_before_write
  before update on public.events
  for each row execute procedure public.guard_event_update();

grant insert (
  title,
  description,
  category,
  starts_at,
  ends_at,
  venue,
  capacity,
  registration_deadline,
  organizer_id,
  status
) on public.events to authenticated;

grant update (
  title,
  description,
  category,
  starts_at,
  ends_at,
  venue,
  capacity,
  registration_deadline,
  status,
  approved_by
) on public.events to authenticated;

create policy "Organizers can read their own events"
  on public.events
  for select
  to authenticated
  using (
    organizer_id = (select auth.uid())
    and (select private.has_app_role('organizer'))
  );

create policy "Faculty can read events in the approval queue"
  on public.events
  for select
  to authenticated
  using (
    status in ('pending_approval', 'approved', 'rejected')
    and (select private.has_app_role('faculty_admin'))
  );

create policy "Organizers can create their own drafts"
  on public.events
  for insert
  to authenticated
  with check (
    organizer_id = (select auth.uid())
    and status = 'draft'
    and approved_by is null
    and starts_at > now()
    and (registration_deadline is null or registration_deadline > now())
    and (select private.has_app_role('organizer'))
  );

create policy "Organizers can edit drafts and resubmit rejected events"
  on public.events
  for update
  to authenticated
  using (
    organizer_id = (select auth.uid())
    and status in ('draft', 'rejected')
    and (select private.has_app_role('organizer'))
  )
  with check (
    organizer_id = (select auth.uid())
    and status in ('draft', 'pending_approval')
    and approved_by is null
    and starts_at > now()
    and (registration_deadline is null or registration_deadline > now())
    and (select private.has_app_role('organizer'))
  );

create policy "Faculty can decide pending events"
  on public.events
  for update
  to authenticated
  using (
    status = 'pending_approval'
    and (select private.has_app_role('faculty_admin'))
  )
  with check (
    status in ('approved', 'rejected')
    and (
      (status = 'approved' and approved_by = (select auth.uid()))
      and starts_at > now()
      or (status = 'rejected' and approved_by is null)
    )
    and (select private.has_app_role('faculty_admin'))
  );
