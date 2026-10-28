-- Fields the report API needs that onboarding now asks for. Run in Supabase SQL Editor.
alter table public.profiles
  add column if not exists phone text,
  add column if not exists alcohol boolean,
  add column if not exists smoker boolean;
