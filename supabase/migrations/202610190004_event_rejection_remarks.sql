create table public.event_review_remarks (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  faculty_id uuid not null references public.profiles(id) on delete restrict,
  remark text not null check (length(btrim(remark)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index event_review_remarks_latest_idx
  on public.event_review_remarks(event_id, created_at desc);

alter table public.event_review_remarks enable row level security;
revoke all on table public.event_review_remarks from anon, authenticated;
grant select on table public.event_review_remarks to authenticated;

create policy "Faculty can read event review remarks"
  on public.event_review_remarks for select to authenticated
  using ((select private.has_app_role('faculty_admin')));

create policy "Organizers can read remarks for their own events"
  on public.event_review_remarks for select to authenticated
  using (
    (select private.has_app_role('organizer'))
    and exists (
      select 1 from public.events e
      where e.id = event_review_remarks.event_id
        and e.organizer_id = (select auth.uid())
    )
  );

create function public.reject_event_with_remark(target_event uuid, rejection_remark text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  normalized_remark text := regexp_replace(btrim(coalesce(rejection_remark, '')), '[[:space:]]+', ' ', 'g');
  remark_id uuid;
begin
  if actor_id is null or not (select private.has_app_role('faculty_admin')) then
    raise exception using errcode = '42501', message = 'Only faculty administrators can reject events.';
  end if;

  if length(normalized_remark) not between 1 and 2000 then
    raise exception using errcode = '22023', message = 'A rejection remark between 1 and 2000 characters is required.';
  end if;

  update public.events
  set status = 'rejected', approved_by = null
  where id = target_event and status = 'pending_approval';

  if not found then
    raise exception using errcode = 'P0001', message = 'The event is no longer pending approval.';
  end if;

  insert into public.event_review_remarks(event_id, faculty_id, remark)
  values (target_event, actor_id, normalized_remark)
  returning id into remark_id;

  return remark_id;
end;
$$;

revoke execute on function public.reject_event_with_remark(uuid, text) from public, anon;
grant execute on function public.reject_event_with_remark(uuid, text) to authenticated;
