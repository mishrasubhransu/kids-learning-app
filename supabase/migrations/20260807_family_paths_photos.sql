-- Family members grow two things:
--
--   relation_detail jsonb — the kinship PATH from the child, so relations the
--   flat enum can't say ("father's brother", "father's father's brother")
--   become expressible:  { "steps": ["father","brother"],
--                          "seniority": "elder" | "younger" | null,
--                          "label": "<optional parent-typed override>" }
--   The old `relation` column stays and keeps holding the nearest legacy
--   value (uncle, grandma…) so stale clients still render something sane.
--   Terms per locale live in src/data/kinship.js — the DB stores only the
--   structure.
--
--   photo_paths jsonb — ordered array of storage paths in family-photos,
--   replacing the single photo_path (which stays mirrored to the first
--   entry for back-compat). Multiple photos of the same person let the
--   lesson shuffle, so the child learns the person, not one picture.

alter table public.family_members
  add column if not exists relation_detail jsonb,
  add column if not exists photo_paths jsonb not null default '[]'::jsonb;

update public.family_members
  set photo_paths = jsonb_build_array(photo_path)
  where photo_path is not null
    and photo_paths = '[]'::jsonb;
