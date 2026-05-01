-- Reset app table RLS to use auth.uid() instead of the old request.jwt.claim.profile_id setting.
-- Apply this migration to the Supabase database that backs the app.

create extension if not exists pgcrypto;

begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  plan_type text not null default 'free'
);

create table if not exists public.profile_onboarding (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  baseline_type text,
  failure_patterns text[] not null default '{}'::text[],
  feedback_style text,
  initial_mood smallint check (initial_mood between 1 and 5),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.daily_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  wake_time text not null default '07:30',
  sleep_time text not null default '23:30',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, date)
);

create table if not exists public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  log_id uuid not null references public.daily_logs(id) on delete cascade,
  title text not null,
  category text not null check (category in ('productive', 'neutral', 'distraction')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  duration_minutes integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  type text not null check (type in ('short_term', 'long_term')),
  category text not null,
  open_ended boolean not null default true,
  target_value integer,
  target_unit text,
  is_active boolean not null default true,
  keywords text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monthly_reviews (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  month_start date not null,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (profile_id, month_start)
);

create table if not exists public.user_preferences (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  gaming_is_distraction boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

commit;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, created_at, updated_at, plan_type)
  values (new.id, now(), now(), 'free')
  on conflict (id) do nothing;

  return new;
end;
$$;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'profile_onboarding',
        'daily_logs',
        'activity_sessions',
        'goals',
        'monthly_reviews',
        'user_preferences'
      )
  loop
    execute format('drop policy if exists %I on public.%I', policy_record.policyname, policy_record.tablename);
  end loop;
end
$$;

drop trigger if exists trg_touch_profiles_updated_at on public.profiles;
create trigger trg_touch_profiles_updated_at
before update on public.profiles
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_touch_profile_onboarding_updated_at on public.profile_onboarding;
create trigger trg_touch_profile_onboarding_updated_at
before update on public.profile_onboarding
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_touch_daily_logs_updated_at on public.daily_logs;
create trigger trg_touch_daily_logs_updated_at
before update on public.daily_logs
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_touch_goals_updated_at on public.goals;
create trigger trg_touch_goals_updated_at
before update on public.goals
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_touch_user_preferences_updated_at on public.user_preferences;
create trigger trg_touch_user_preferences_updated_at
before update on public.user_preferences
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.profile_onboarding enable row level security;
alter table public.daily_logs enable row level security;
alter table public.activity_sessions enable row level security;
alter table public.goals enable row level security;
alter table public.monthly_reviews enable row level security;
alter table public.user_preferences enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "onboarding_select_own"
on public.profile_onboarding
for select
to authenticated
using (auth.uid() = profile_id);

create policy "onboarding_insert_own"
on public.profile_onboarding
for insert
to authenticated
with check (auth.uid() = profile_id);

create policy "onboarding_update_own"
on public.profile_onboarding
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "daily_logs_select_own"
on public.daily_logs
for select
to authenticated
using (auth.uid() = profile_id);

create policy "daily_logs_insert_own"
on public.daily_logs
for insert
to authenticated
with check (auth.uid() = profile_id);

create policy "daily_logs_update_own"
on public.daily_logs
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "daily_logs_delete_own"
on public.daily_logs
for delete
to authenticated
using (auth.uid() = profile_id);

create policy "activity_sessions_select_own"
on public.activity_sessions
for select
to authenticated
using (auth.uid() = profile_id);

create policy "activity_sessions_insert_own"
on public.activity_sessions
for insert
to authenticated
with check (auth.uid() = profile_id);

create policy "activity_sessions_update_own"
on public.activity_sessions
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "activity_sessions_delete_own"
on public.activity_sessions
for delete
to authenticated
using (auth.uid() = profile_id);

create policy "goals_select_own"
on public.goals
for select
to authenticated
using (auth.uid() = profile_id);

create policy "goals_insert_own"
on public.goals
for insert
to authenticated
with check (auth.uid() = profile_id);

create policy "goals_update_own"
on public.goals
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "goals_delete_own"
on public.goals
for delete
to authenticated
using (auth.uid() = profile_id);

create policy "monthly_reviews_select_own"
on public.monthly_reviews
for select
to authenticated
using (auth.uid() = profile_id);

create policy "monthly_reviews_insert_own"
on public.monthly_reviews
for insert
to authenticated
with check (auth.uid() = profile_id);

create policy "monthly_reviews_update_own"
on public.monthly_reviews
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "monthly_reviews_delete_own"
on public.monthly_reviews
for delete
to authenticated
using (auth.uid() = profile_id);

create policy "user_preferences_select_own"
on public.user_preferences
for select
to authenticated
using (auth.uid() = profile_id);

create policy "user_preferences_insert_own"
on public.user_preferences
for insert
to authenticated
with check (auth.uid() = profile_id);

create policy "user_preferences_update_own"
on public.user_preferences
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

create policy "user_preferences_delete_own"
on public.user_preferences
for delete
to authenticated
using (auth.uid() = profile_id);

-- Verification examples:
-- select * from public.profiles where id = auth.uid();
-- select * from public.daily_logs where profile_id = auth.uid();
