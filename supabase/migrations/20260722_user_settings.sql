-- Per-user app settings (key/value), synced by src/hooks/useUserSetting.js
-- Run this in the Supabase SQL editor (or via supabase CLI migrations).

create table if not exists public.user_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_settings enable row level security;

create policy "Users manage own settings"
  on public.user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
