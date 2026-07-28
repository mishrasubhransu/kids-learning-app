-- Child profiles: one row per kid, owned by the signed-in parent account.
-- settings jsonb holds everything per-child (enabledLessons map, toggles)
-- so new options never need a schema change.

create table if not exists public.child_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 30),
  avatar text not null default '🦁',
  avatar_color text not null default 'bg-amber-400',
  birthdate date,
  is_default boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  name_audio_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Two devices racing to auto-create the initial profile collide here
-- instead of duplicating it (bootstrap inserts with is_default = true).
create unique index if not exists child_profiles_one_default
  on public.child_profiles (user_id)
  where is_default;

alter table public.child_profiles enable row level security;

create policy "Parents manage own children"
  on public.child_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Per-key settings patch: merges the top-level keys of p_patch into settings
-- instead of overwriting the whole blob, so two sessions editing different
-- toggles don't clobber each other. security invoker keeps RLS in force.
create or replace function public.patch_child_settings(p_child_id uuid, p_patch jsonb)
returns setof public.child_profiles
language sql
security invoker
set search_path = public
as $$
  update public.child_profiles
     set settings = coalesce(settings, '{}'::jsonb) || p_patch,
         updated_at = now()
   where id = p_child_id
  returning *;
$$;

-- Analytics become per-kid: nullable so old rows and pre-profile events keep working.
alter table public.usage_events
  add column if not exists child_id uuid;

-- ElevenLabs name clips ("Aarav!") live here. Public read via unguessable
-- uuid paths (same trust model as the recordings bucket); no client write
-- policies — only the service-role serverless function writes.
insert into storage.buckets (id, name, public)
values ('name-audio', 'name-audio', true)
on conflict (id) do nothing;
