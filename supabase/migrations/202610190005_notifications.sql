create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  notification_type text not null check (notification_type in ('event_rejected', 'event_submitted')),
  event_title text not null check (length(btrim(event_title)) between 1 and 160),
  message text not null check (length(btrim(message)) between 1 and 500),
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique (recipient_id, dedupe_key)
);

create index notifications_recipient_created_idx
  on public.notifications(recipient_id, created_at desc);
create index notifications_unread_idx
  on public.notifications(recipient_id)
  where read_at is null;

alter table public.notifications enable row level security;
revoke all on table public.notifications from anon, authenticated;
grant select, update (read_at) on table public.notifications to authenticated;

create policy "Recipients can read their role-authorized notifications"
  on public.notifications for select to authenticated
  using (
    recipient_id = (select auth.uid())
    and (
      (notification_type = 'event_rejected'
        and (select private.has_app_role('organizer'))
        and exists (
          select 1 from public.events e
          where e.id = notifications.event_id
            and e.organizer_id = (select auth.uid())
        ))
      or (notification_type = 'event_submitted'
        and (select private.has_app_role('faculty_admin')))
    )
  );

create policy "Recipients can mark their notifications read"
  on public.notifications for update to authenticated
  using (
    recipient_id = (select auth.uid())
    and (
      (notification_type = 'event_rejected'
        and (select private.has_app_role('organizer'))
        and exists (
          select 1 from public.events e
          where e.id = notifications.event_id
            and e.organizer_id = (select auth.uid())
        ))
      or (notification_type = 'event_submitted'
        and (select private.has_app_role('faculty_admin')))
    )
  )
  with check (
    recipient_id = (select auth.uid())
    and (
      (notification_type = 'event_rejected'
        and (select private.has_app_role('organizer'))
        and exists (
          select 1 from public.events e
          where e.id = notifications.event_id
            and e.organizer_id = (select auth.uid())
        ))
      or (notification_type = 'event_submitted'
        and (select private.has_app_role('faculty_admin')))
    )
  );

create function public.guard_notification_read_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id
    or new.recipient_id is distinct from old.recipient_id
    or new.event_id is distinct from old.event_id
    or new.notification_type is distinct from old.notification_type
    or new.event_title is distinct from old.event_title
    or new.message is distinct from old.message
    or new.dedupe_key is distinct from old.dedupe_key
    or new.created_at is distinct from old.created_at
    or old.read_at is not null
    or new.read_at is null then
    raise exception using errcode = '42501', message = 'Notifications can only be marked read once by their recipient.';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_notification_read_update() from public, anon, authenticated;
create trigger guard_notification_read_update_before_write
  before update on public.notifications
  for each row execute procedure public.guard_notification_read_update();

create function private.notify_event_workflow_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  transition_stamp text := to_char(new.updated_at at time zone 'UTC', 'YYYYMMDDHH24MISSUS');
begin
  if old.status in ('draft', 'rejected') and new.status = 'pending_approval' then
    insert into public.notifications(recipient_id, event_id, notification_type, event_title, message, dedupe_key)
    select
      profile.id,
      new.id,
      'event_submitted',
      new.title,
      format('New event "%s" is awaiting your approval.', new.title),
      new.id::text || ':event_submitted:' || transition_stamp
    from public.profiles profile
    where profile.role = 'faculty_admin'
    on conflict (recipient_id, dedupe_key) do nothing;
  elsif old.status = 'pending_approval' and new.status = 'rejected' then
    insert into public.notifications(recipient_id, event_id, notification_type, event_title, message, dedupe_key)
    values (
      new.organizer_id,
      new.id,
      'event_rejected',
      new.title,
      format('Your event "%s" was rejected. Review the faculty remarks.', new.title),
      new.id::text || ':event_rejected:' || transition_stamp
    )
    on conflict (recipient_id, dedupe_key) do nothing;
  end if;
  return new;
end;
$$;
revoke execute on function private.notify_event_workflow_transition() from public, anon, authenticated;
create trigger notify_event_workflow_transition_after_update
  after update of status on public.events
  for each row
  when (old.status is distinct from new.status)
  execute procedure private.notify_event_workflow_transition();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'notifications'
    ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
