create type public.app_role as enum ('student', 'organizer', 'faculty_admin');
create type public.event_status as enum (
  'draft',
  'pending_approval',
  'approved',
  'rejected',
  'cancelled',
  'completed'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'student',
  display_name text check (display_name is null or length(display_name) <= 100),
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) between 1 and 160),
  description text not null check (length(btrim(description)) between 1 and 10000),
  category text not null check (length(btrim(category)) between 1 and 60),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null check (length(btrim(venue)) between 1 and 200),
  capacity integer check (capacity is null or capacity > 0),
  registration_deadline timestamptz,
  organizer_id uuid not null references public.profiles (id) on delete restrict,
  approved_by uuid references public.profiles (id) on delete set null,
  status public.event_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_end_after_start check (ends_at > starts_at),
  constraint events_deadline_before_start check (
    registration_deadline is null or registration_deadline <= starts_at
  ),
  constraint events_approval_consistency check (
    (status = 'approved' and approved_by is not null)
    or (status <> 'approved' and approved_by is null)
  )
);

create index events_approved_starts_at_idx
  on public.events (starts_at)
  where status = 'approved';

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 100), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.create_profile_for_new_user() from public, anon, authenticated;

create trigger on_auth_user_created_create_profile
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

insert into public.profiles (id, display_name)
select
  users.id,
  nullif(left(btrim(coalesce(users.raw_user_meta_data ->> 'display_name', '')), 100), '')
from auth.users as users
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.events enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.events from anon, authenticated;
grant select on table public.profiles to authenticated;
grant select on table public.events to anon, authenticated;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Anyone can read approved events"
  on public.events
  for select
  to anon, authenticated
  using (status = 'approved');
