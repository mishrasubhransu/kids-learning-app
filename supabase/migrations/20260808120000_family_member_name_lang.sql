-- Which language the member's NAME clip is spoken in ("Jeje Bapa" reads
-- badly in an English voice). Null = English (what every existing clip is).
-- Per member, not per account: one family can mix "Nana" (en) with
-- ଜେଜେବାପା-style names (or).

alter table public.family_members
  add column if not exists name_lang text;
