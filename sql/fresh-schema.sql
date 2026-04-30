-- Fresh schema for the current frontend
-- This keeps auth-linked profile creation minimal and stores onboarding separately.

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

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.profile_onboarding enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "onboarding_select_own" on public.profile_onboarding;
create policy "onboarding_select_own"
on public.profile_onboarding
for select
to authenticated
using (auth.uid() = profile_id);

drop policy if exists "onboarding_insert_own" on public.profile_onboarding;
create policy "onboarding_insert_own"
on public.profile_onboarding
for insert
to authenticated
with check (auth.uid() = profile_id);

drop policy if exists "onboarding_update_own" on public.profile_onboarding;
create policy "onboarding_update_own"
on public.profile_onboarding
for update
to authenticated
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

-- Quick verification queries:
-- select * from public.profiles where id = auth.uid();
-- select * from public.profile_onboarding where profile_id = auth.uid();
