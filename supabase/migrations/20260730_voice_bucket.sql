-- Pre-generated ElevenLabs voice clips for everything the app speaks
-- (scripts/generate-voice-clips.mjs). Bucket "voice": public-read mp3s at
-- <locale>/<group>/<slug>.mp3. Writes go through the generation script with
-- the service role only, so no client write policies exist. The manifest
-- ships in the app bundle (src/data/voiceManifest.json) — no meta table.

insert into storage.buckets (id, name, public)
values ('voice', 'voice', true)
on conflict (id) do update set public = true;

create policy "Public read voice"
  on storage.objects for select
  using (bucket_id = 'voice');
