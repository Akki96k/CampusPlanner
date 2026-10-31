-- Faculty controlled organizer onboarding. Existing organizer accounts remain approved.
create table public.organizer_applications (
  organizer_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'removed')),
  submitted_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null,
  rejected_reason text check (rejected_reason is null or length(rejected_reason) <= 2000),
  removed_at timestamptz,
  removed_by uuid references public.profiles(id) on delete set null,
  removed_reason text check (removed_reason is null or length(removed_reason) <= 2000),
  updated_at timestamptz not null default now(),
  constraint organizer_application_metadata_consistent check (
    (status = 'pending' and decided_at is null and decided_by is null)
    or (status <> 'pending' and decided_at is not null)
  )
);

create index organizer_applications_status_created_idx
  on public.organizer_applications(status, submitted_at desc);

-- Backfill before enforcing the new gate: no existing organizer loses access.
insert into public.organizer_applications(organizer_id, status, approved_at, decided_at)
select id, 'approved', created_at, created_at
from public.profiles
where role = 'organizer'
on conflict (organizer_id) do nothing;

alter table public.organizer_applications enable row level security;
revoke all on public.organizer_applications from anon, authenticated;
grant select (organizer_id, status, submitted_at, rejected_reason, removed_reason)
  on public.organizer_applications to authenticated;

create policy "Organizers can read their own application status"
  on public.organizer_applications for select to authenticated
  using (organizer_id = (select auth.uid()));

-- A single-source role check gates existing event/registration RLS policies too.
create or replace function private.has_app_role(required_role public.app_role)
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
      and (
        required_role <> 'organizer'
        or exists (
          select 1 from public.organizer_applications application
          where application.organizer_id = profile.id
            and application.status = 'approved'
        )
      )
  );
$$;
revoke execute on function private.has_app_role(public.app_role) from public, anon;
grant execute on function private.has_app_role(public.app_role) to authenticated;

-- Public signup may request student or organizer only. Faculty assignment remains trusted/admin-only.
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'account_role';
  assigned_role public.app_role := case when requested_role = 'organizer' then 'organizer'::public.app_role else 'student'::public.app_role end;
begin
  insert into public.profiles (id, role, display_name)
  values (
    new.id,
    assigned_role,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 100), '')
  )
  on conflict (id) do nothing;

  if assigned_role = 'organizer' then
    insert into public.organizer_applications(organizer_id, status)
    values (new.id, 'pending')
    on conflict (organizer_id) do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;

-- Preserve the existing in-app notification center for organizer lifecycle messages.
alter table public.notifications alter column event_id drop not null;
alter table public.notifications drop constraint notifications_notification_type_check;
alter table public.notifications add constraint notifications_notification_type_check
  check (notification_type in (
    'event_rejected', 'event_submitted', 'organizer_approved',
    'organizer_rejected', 'organizer_removed', 'organizer_restored'
  ));

drop policy "Recipients can read their role-authorized notifications" on public.notifications;
create policy "Recipients can read their role-authorized notifications"
  on public.notifications for select to authenticated
  using (
    recipient_id = (select auth.uid())
    and (
      notification_type in ('organizer_approved', 'organizer_rejected', 'organizer_removed', 'organizer_restored')
      or (notification_type = 'event_rejected'
        and (select private.has_app_role('organizer'))
        and exists (select 1 from public.events e where e.id = notifications.event_id and e.organizer_id = (select auth.uid())))
      or (notification_type = 'event_submitted' and (select private.has_app_role('faculty_admin')))
    )
  );

drop policy "Recipients can mark their notifications read" on public.notifications;
create policy "Recipients can mark their notifications read"
  on public.notifications for update to authenticated
  using (
    recipient_id = (select auth.uid())
    and (
      notification_type in ('organizer_approved', 'organizer_rejected', 'organizer_removed', 'organizer_restored')
      or (notification_type = 'event_rejected'
        and (select private.has_app_role('organizer'))
        and exists (select 1 from public.events e where e.id = notifications.event_id and e.organizer_id = (select auth.uid())))
      or (notification_type = 'event_submitted' and (select private.has_app_role('faculty_admin')))
    )
  )
  with check (
    recipient_id = (select auth.uid())
    and (
      notification_type in ('organizer_approved', 'organizer_rejected', 'organizer_removed', 'organizer_restored')
      or (notification_type = 'event_rejected'
        and (select private.has_app_role('organizer'))
        and exists (select 1 from public.events e where e.id = notifications.event_id and e.organizer_id = (select auth.uid())))
      or (notification_type = 'event_submitted' and (select private.has_app_role('faculty_admin')))
    )
  );

create table public.organizer_email_outbox (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles(id) on delete cascade,
  transition_id uuid not null unique,
  notification_type text not null check (notification_type in ('organizer_approved', 'organizer_rejected', 'organizer_removed', 'organizer_restored')),
  email text not null,
  display_name text not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  last_error text check (last_error is null or length(last_error) <= 1000),
  created_at timestamptz not null default now()
);
create index organizer_email_outbox_retry_idx
  on public.organizer_email_outbox(status, last_attempt_at)
  where status in ('pending', 'failed', 'sending');
alter table public.organizer_email_outbox enable row level security;
revoke all on public.organizer_email_outbox from public, anon, authenticated;
grant select, update on public.organizer_email_outbox to service_role;

create or replace function public.manage_organizer_application(
  target_organizer uuid,
  requested_status text,
  action_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  current_status text;
  new_transition_id uuid := gen_random_uuid();
  organizer_email text;
  organizer_name text;
  clean_reason text := nullif(regexp_replace(btrim(coalesce(action_reason, '')), '[[:space:]]+', ' ', 'g'), '');
  type_name text;
  message_text text;
begin
  if actor_id is null or not (select private.has_app_role('faculty_admin')) then
    raise exception using errcode = '42501', message = 'Faculty authorization is required.';
  end if;
  if target_organizer = actor_id then
    raise exception using errcode = '42501', message = 'You cannot manage your own organizer application.';
  end if;
  if requested_status not in ('approved', 'rejected', 'removed') then
    raise exception using errcode = '22023', message = 'Unsupported organizer action.';
  end if;
  if requested_status in ('rejected', 'removed') and (clean_reason is null or length(clean_reason) > 2000) then
    raise exception using errcode = '22023', message = 'A reason of up to 2,000 characters is required.';
  end if;

  select application.status into current_status
  from public.organizer_applications application
  join public.profiles profile on profile.id = application.organizer_id
  where application.organizer_id = target_organizer and profile.role = 'organizer'
  for update of application;
  if not found then
    raise exception using errcode = 'P0002', message = 'Organizer application was not found.';
  end if;

  if current_status = requested_status
    or (requested_status = 'removed' and current_status <> 'approved')
    or (requested_status = 'rejected' and current_status <> 'pending')
    or (requested_status = 'approved' and current_status not in ('pending', 'rejected', 'removed')) then
    raise exception using errcode = 'P0001', message = 'Organizer application is no longer in an actionable status.';
  end if;

  select lower(btrim(account.email)), coalesce(nullif(btrim(profile.display_name), ''), split_part(account.email, '@', 1))
    into organizer_email, organizer_name
  from auth.users account
  join public.profiles profile on profile.id = account.id
  where account.id = target_organizer;
  if organizer_email is null then
    raise exception using errcode = 'P0002', message = 'Organizer email was not found.';
  end if;

  type_name := case
    when requested_status = 'approved' and current_status in ('rejected', 'removed') then 'organizer_restored'
    when requested_status = 'approved' then 'organizer_approved'
    when requested_status = 'rejected' then 'organizer_rejected'
    else 'organizer_removed'
  end;
  message_text := case type_name
    when 'organizer_approved' then 'Your organizer application was approved. You can now access organizer tools.'
    when 'organizer_restored' then 'Your organizer access has been restored.'
    when 'organizer_rejected' then 'Your organizer application was rejected.'
    else 'Your organizer access has been removed.'
  end;

  update public.organizer_applications
  set status = requested_status,
      approved_at = case when requested_status = 'approved' then now() else approved_at end,
      approved_by = case when requested_status = 'approved' then actor_id else approved_by end,
      decided_at = now(), decided_by = actor_id,
      rejected_reason = case when requested_status = 'rejected' then clean_reason else rejected_reason end,
      removed_at = case when requested_status = 'removed' then now() when requested_status = 'approved' then null else removed_at end,
      removed_by = case when requested_status = 'removed' then actor_id when requested_status = 'approved' then null else removed_by end,
      removed_reason = case when requested_status = 'removed' then clean_reason when requested_status = 'approved' then null else removed_reason end,
      updated_at = now()
  where organizer_id = target_organizer;

  insert into public.notifications(recipient_id, event_id, notification_type, event_title, message, dedupe_key)
  values (target_organizer, null, type_name, 'Organizer account', message_text, new_transition_id::text);

  insert into public.organizer_email_outbox(organizer_id, transition_id, notification_type, email, display_name, reason)
  values (target_organizer, new_transition_id, type_name, organizer_email, organizer_name,
    case when requested_status in ('rejected', 'removed') then clean_reason else null end);
  return new_transition_id;
end;
$$;
revoke execute on function public.manage_organizer_application(uuid, text, text) from public, anon;
grant execute on function public.manage_organizer_application(uuid, text, text) to authenticated;

create or replace function public.list_organizer_applications()
returns table (
  organizer_id uuid, display_name text, email text, status text, submitted_at timestamptz,
  approved_at timestamptz, approved_by_name text, decided_at timestamptz, decided_by_name text, rejected_reason text,
  removed_at timestamptz, removed_by_name text, removed_reason text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.has_app_role('faculty_admin')) then
    raise exception using errcode = '42501', message = 'Faculty authorization is required.';
  end if;
  return query
    select application.organizer_id, profile.display_name, lower(btrim(account.email)), application.status,
      application.submitted_at, application.approved_at,
      coalesce(approved_profile.display_name, case when application.approved_by is null then 'Existing approved account' end),
      application.decided_at, decision_profile.display_name,
      application.rejected_reason, application.removed_at, remover_profile.display_name,
      application.removed_reason
    from public.organizer_applications application
    join public.profiles profile on profile.id = application.organizer_id
    join auth.users account on account.id = application.organizer_id
    left join public.profiles approved_profile on approved_profile.id = application.approved_by
    left join public.profiles decision_profile on decision_profile.id = application.decided_by
    left join public.profiles remover_profile on remover_profile.id = application.removed_by
    where profile.role = 'organizer'
    order by case application.status when 'pending' then 0 when 'approved' then 1 when 'rejected' then 2 else 3 end,
      application.submitted_at desc;
end;
$$;
revoke execute on function public.list_organizer_applications() from public, anon;
grant execute on function public.list_organizer_applications() to authenticated;

-- Only the server-side service-role worker can claim and finish queued email work.
create or replace function public.claim_organizer_email_outbox(target_id uuid)
returns setof public.organizer_email_outbox
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role is required.';
  end if;
  return query
    update public.organizer_email_outbox outbox
    set status = 'sending', attempts = attempts + 1, last_attempt_at = now(), last_error = null
    where outbox.id = target_id
      and outbox.attempts < 10
      and (outbox.status in ('pending', 'failed') or (outbox.status = 'sending' and outbox.last_attempt_at < now() - interval '10 minutes'))
      and (outbox.last_attempt_at is null or outbox.last_attempt_at < now() - interval '5 minutes')
    returning outbox.*;
end;
$$;
revoke execute on function public.claim_organizer_email_outbox(uuid) from public, anon, authenticated;
grant execute on function public.claim_organizer_email_outbox(uuid) to service_role;

create or replace function public.finish_organizer_email_outbox(target_id uuid, succeeded boolean, failure_detail text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception using errcode = '42501', message = 'Service role is required.';
  end if;
  update public.organizer_email_outbox
  set status = case when succeeded then 'sent' else 'failed' end,
      delivered_at = case when succeeded then now() else null end,
      last_error = case when succeeded then null else left(coalesce(failure_detail, 'Email delivery failed.'), 1000) end
  where id = target_id and status = 'sending';
end;
$$;
revoke execute on function public.finish_organizer_email_outbox(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.finish_organizer_email_outbox(uuid, boolean, text) to service_role;

comment on table public.organizer_email_outbox is 'Transactional email queue. It stores no activation links, password data, or tokens.';
