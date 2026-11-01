-- Migration 202611010007: Faculty Organizer Profile Editing
-- Allows faculty administrators to update permitted organizer profile details (display_name).
-- Does not allow changing credentials, roles, or approval status.

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

-- Grant update on display_name to authenticated and add faculty RLS policy
grant update (display_name) on public.profiles to authenticated;

create policy "Faculty can update organizer display names"
  on public.profiles
  for update
  to authenticated
  using (
    (select private.has_app_role('faculty_admin'))
    and role = 'organizer'
  )
  with check (
    (select private.has_app_role('faculty_admin'))
    and role = 'organizer'
  );

