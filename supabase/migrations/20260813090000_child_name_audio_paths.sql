-- Per-locale cache of a child's generated name/praise clips:
--   { "<locale>": "<storage path>", ... }
-- so switching language back to one the child already has clips for costs
-- nothing. name_audio_path stays as the single "latest" pointer — legacy
-- clients and not-yet-refreshed localStorage caches still read it.
alter table child_profiles
  add column if not exists name_audio_paths jsonb not null default '{}'::jsonb;

-- Seed from the single slot: clips have always followed the child's
-- language (every switch regenerated them), so the live path is in the
-- current language for any profile whose last generation completed. A
-- mid-flight failure could seed a wrong-locale path — playback already
-- ignores wrong-locale manifests, so that child keeps stock praise exactly
-- as they do today, until the next rename/switch regenerates.
update child_profiles
set name_audio_paths = jsonb_build_object(
  case when settings->>'language' in ('en','es','zh','or')
       then settings->>'language' else 'en' end,
  name_audio_path)
where name_audio_path is not null
  and name_audio_paths = '{}'::jsonb;
