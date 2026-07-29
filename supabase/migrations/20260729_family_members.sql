-- "My Family" lesson: family members are per ACCOUNT (user), not per child —
-- the same grandma belongs to every sibling. Photos live in the
-- family-photos bucket (public read via unguessable uuid paths, the same
-- trust model as name-audio); clients write only inside their own
-- <user_id>/ folder. name_audio_path points at an ElevenLabs clip written
-- by the service-role serverless function (never by clients).

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 30),
  relation text not null,
  photo_path text,
  name_audio_path text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.family_members enable row level security;

create policy "Parents manage own family"
  on public.family_members
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('family-photos', 'family-photos', true)
on conflict (id) do update set public = true;

create policy "Public read family photos"
  on storage.objects for select
  using (bucket_id = 'family-photos');

create policy "Own folder insert family photos"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Own folder update family photos"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Own folder delete family photos"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
