import { LOCALES } from '../locales';

// Active-locale state shared by non-React modules (lib/voice.js clip
// resolution, lib/voiceKeys.js sentence building). LocaleProvider stamps it
// during render — components re-render off the context, lib code reads it
// synchronously here. Generation scripts call setActiveLocale() directly to
// build another language's catalog.
//
// English is the identity locale: item names in src/data ARE the English
// text, so there is no en pack — every helper falls back to the input.

let activeLocale = 'en';

export const setActiveLocale = (locale) => {
  activeLocale = LOCALES[locale] ? locale : 'en';
};

export const getActiveLocale = () => activeLocale;

// The active locale's pack ({ items, strings, voiceParts, intros, feedback,
// lines, scenes }), or null for English.
export const getPack = () => LOCALES[activeLocale]?.pack || null;

export const getTtsLang = () => LOCALES[activeLocale]?.ttsLang || 'en-US';

// Canonical slug — derived from the ENGLISH name, never the translation, so
// it stays the stable join key for voice-clip paths, rotation state,
// recordings and locale packs.
export const voiceSlug = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

// Localized view of a data item. Always adds { slug, enName } (the split the
// rotation/recording/clip keys rely on); when the active pack translates the
// slug it also swaps the display name and carries the pack's speech fields:
//   say  — spoken form when it differs from the display name ("uno" for "1")
//   ref  — the form used inside sentences ("el león", "el día soleado")
//   bare — bare form for "opposite of …" questions ("grande" vs "el grande")
export const localizeItem = (item) => {
  const enName = String(item.name ?? item.id ?? '');
  const slug = item.slug || voiceSlug(enName);
  const base = item.enName ? item : { ...item, slug, enName };
  const entry = getPack()?.items?.[slug];
  if (!entry) return base;
  return {
    ...base,
    name: entry.name,
    // display mirrors name for word-items (colors, emotions); glyph items
    // (letters, numbers) keep their glyph
    display: item.display === item.name ? entry.name : item.display,
    say: entry.say,
    ref: entry.ref,
    bare: entry.bare,
  };
};

export const localizeItems = (items) =>
  items ? items.map(localizeItem) : items;

// Display name for a canonical English word that travels as a plain string
// (opposites pair words, quiz words).
export const localizedName = (word) =>
  getPack()?.items?.[voiceSlug(word)]?.name ?? word;

// Hand-written opposites scene questions, keyed by the slug of the English
// question (the clip key never changes with the language).
export const sceneQuestionText = (question) =>
  getPack()?.scenes?.[voiceSlug(question)] ?? question;
