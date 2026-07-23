-- Parent-recorded audio clips (phonics syllables today, other categories later).
-- Bucket "recordings": public-read audio blobs at <category>/<name>.<ext>;
-- writes restricted to the admin account (no roles table — gate by email).
-- recordings_meta: single row with a version stamp + manifest so clients can
-- keep audio cache-first and only re-fetch files that actually changed.

insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', true)
on conflict (id) do update set public = true;

create policy "Public read recordings"
  on storage.objects for select
  using (bucket_id = 'recordings');

create policy "Admin insert recordings"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recordings'
    and (auth.jwt() ->> 'email') = 'subhransu.kumar.mishra@gmail.com'
  );

create policy "Admin update recordings"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'recordings'
    and (auth.jwt() ->> 'email') = 'subhransu.kumar.mishra@gmail.com'
  )
  with check (
    bucket_id = 'recordings'
    and (auth.jwt() ->> 'email') = 'subhransu.kumar.mishra@gmail.com'
  );

create policy "Admin delete recordings"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'recordings'
    and (auth.jwt() ->> 'email') = 'subhransu.kumar.mishra@gmail.com'
  );

create table if not exists public.recordings_meta (
  id integer primary key default 1 check (id = 1),
  version text not null default '',
  manifest jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.recordings_meta enable row level security;

create policy "Authenticated read recordings meta"
  on public.recordings_meta for select to authenticated
  using (true);

create policy "Admin write recordings meta"
  on public.recordings_meta for all to authenticated
  using ((auth.jwt() ->> 'email') = 'subhransu.kumar.mishra@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'subhransu.kumar.mishra@gmail.com');

insert into public.recordings_meta (id, version, manifest)
values (1, '', '{}'::jsonb)
on conflict (id) do nothing;
