-- Onboarding answers, one row per user. Run in Supabase: SQL Editor > New query > paste > Run.
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  name text,
  age int check (age between 1 and 120),
  sex text,
  height_cm numeric check (height_cm between 50 and 250),
  weight_kg numeric check (weight_kg between 10 and 300),
  diet text,
  conditions text[] not null default '{}',
  allergies text,
  updated_at timestamptz not null default now()
);

-- Each user can only see and edit their own row
alter table public.profiles enable row level security;

create policy "Read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "Insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);

create policy "Update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
