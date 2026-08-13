-- Optional pronunciation spelling for a family member's name clip: when
-- set, TTS reads THIS instead of `name` (display never changes). Latin
-- spellings make Gemini transliterate per generation — "Naana" lands on
-- dental ନ or retroflex ଣ by luck of the draw; the native-script spelling
-- ନାନା pins it. Same idea as a contact card's "phonetic name" field.

alter table public.family_members
  add column if not exists name_phonetic text;
