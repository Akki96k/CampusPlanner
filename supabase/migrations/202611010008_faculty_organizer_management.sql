-- Migration 202611010008: Comprehensive Faculty Organizer Management Enhancements
-- 1. Hardens update_organizer_profile to explicitly disallow faculty from modifying their own profile via organizer management.
-- 2. Adds faculty_approve_new_organizer to activate newly created organizer accounts immediately.
-- 3. Adds organizer_events_count to safely verify whether an organizer has historical event records before deletion.
-- 4. Adds faculty_delete_organizer to safely delete an organizer account only when they have zero associated events.

create or replace function public.update_organizer_profile(
  target_organizer uuid,
  new_display_name text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  clean_name text := nullif(regexp_replace(btrim(coalesce(new_display_name, '')), '[[:space:]]+', ' ', 'g'), '');
  target_role public.app_role;
begin
  if actor_id is null or not (select private.has_app_role('faculty_admin')) then
    raise exception using errcode = '42501', message = 'Faculty authorization is required.';
  end if;

  if target_organizer = actor_id then
    raise exception using errcode = '42501', message = 'You cannot modify your own profile through organizer management.';
  end if;

  if clean_name is null or length(clean_name) > 100 then
    raise exception using errcode = '22023', message = 'Display name must be between 1 and 100 characters.';
  end if;

  select role into target_role
  from public.profiles
  where id = target_organizer
  for update;

  if not found or target_role <> 'organizer' then
    raise exception using errcode = 'P0002', message = 'Organizer profile was not found.';
  end if;

  update public.profiles
  set display_name = clean_name
  where id = target_organizer and role = 'organizer';
end;
$$;
revoke execute on function public.update_organizer_profile(uuid, text) from public, anon;
grant execute on function public.update_organizer_profile(uuid, text) to authenticated;

-- Allows a faculty admin to approve/activate a newly provisioned organizer account
create or replace function public.faculty_approve_new_organizer(
  target_organizer uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_role public.app_role;
begin
  if actor_id is null or not (select private.has_app_role('faculty_admin')) then
    raise exception using errcode = '42501', message = 'Faculty authorization is required.';
  end if;

  if target_organizer = actor_id then
    raise exception using errcode = '42501', message = 'You cannot approve your own account.';
  end if;

  select role into target_role
  from public.profiles
  where id = target_organizer;

  if not found or target_role <> 'organizer' then
    raise exception using errcode = 'P0002', message = 'Organizer profile was not found.';
  end if;

  insert into public.organizer_applications (
    organizer_id,
    status,
    submitted_at,
    approved_at,
    approved_by,
    decided_at,
    decided_by
  )
  values (
    target_organizer,
    'approved',
    now(),
    now(),
    actor_id,
    now(),
    actor_id
  )
  on conflict (organizer_id) do update
  set status = 'approved',
      approved_at = now(),
      approved_by = actor_id,
      decided_at = now(),
      decided_by = actor_id,
      removed_at = null,
      removed_by = null,
      removed_reason = null,
      updated_at = now();
end;
$$;
revoke execute on function public.faculty_approve_new_organizer(uuid) from public, anon;
grant execute on function public.faculty_approve_new_organizer(uuid) to authenticated;

-- Count events owned by an organizer to determine whether deactivation vs deletion is appropriate
create or replace function public.organizer_events_count(
  target_organizer uuid
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  event_count integer;
begin
  if actor_id is null or not (select private.has_app_role('faculty_admin')) then
    raise exception using errcode = '42501', message = 'Faculty authorization is required.';
  end if;

  select count(*)::integer into event_count
  from public.events
  where organizer_id = target_organizer;

  return coalesce(event_count, 0);
end;
$$;
revoke execute on function public.organizer_events_count(uuid) from public, anon;
grant execute on function public.organizer_events_count(uuid) to authenticated;

-- Safely delete an organizer account only if they have zero events, protecting history
create or replace function public.faculty_delete_organizer(
  target_organizer uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  event_count integer;
begin
  if actor_id is null or not (select private.has_app_role('faculty_admin')) then
    raise exception using errcode = '42501', message = 'Faculty authorization is required.';
  end if;

  if target_organizer = actor_id then
    raise exception using errcode = '42501', message = 'You cannot delete your own account.';
  end if;

  select count(*)::integer into event_count
  from public.events
  where organizer_id = target_organizer;

  if event_count > 0 then
    raise exception using errcode = '23503', message = 'Organizer has associated events and cannot be permanently deleted. Deactivate the organizer instead.';
  end if;

  delete from public.organizer_applications where organizer_id = target_organizer;
  delete from public.profiles where id = target_organizer and role = 'organizer';
end;
$$;
revoke execute on function public.faculty_delete_organizer(uuid) from public, anon;
grant execute on function public.faculty_delete_organizer(uuid) to authenticated;

