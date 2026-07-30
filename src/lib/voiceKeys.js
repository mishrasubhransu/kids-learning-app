// Pre-generated voice clip keys paired with their exact spoken text. A
// "part" is { key, text }: the key locates the clip in the voice bucket,
// the text is what the clip says — and what the browser-TTS fallback says
// when the clip is missing, so the two can never drift apart. The clip
// generation scripts (scripts/voice-catalog.mjs) build their catalogs from
// these same builders.
//
// Keys are locale-less and ALWAYS derive from the English name; lib/voice.js
// resolves them against the active locale (en/items/lion.mp3, es/items/
// lion.mp3). Builders take either a localized item (from localizeItems —
// carries slug + speech fields) or a plain canonical-English string (letters,
// digits, opposites words); the sentence text comes from the active locale
// pack's templates, English by default. Compound sentences are split into
// full-sentence parts ("That was X." + "Try to find Y.") and played back to
// back, so ~450 items need 4 clips each instead of every pairing.
import {
  voiceSlug,
  localizeItem,
  getPack,
  sceneQuestionText,
} from './locale';

export { voiceSlug };

// Normalize a builder input into the subject a sentence template consumes:
//   say  — spoken display form ("León", "uno")
//   ref  — in-sentence form ("el león"); en has no articles, so say
//   bare — for "opposite of …" ("grande" instead of "el grande")
const subjectFor = (input) => {
  const item =
    typeof input === 'object' && input !== null
      ? input.enName
        ? input
        : localizeItem(input)
      : localizeItem({ name: String(input) });
  const name = String(item.name ?? '');
  const say = item.say ?? name;
  return {
    slug: item.slug,
    name,
    say,
    ref: item.ref ?? say,
    bare: item.bare ?? item.ref ?? say,
  };
};

const EN_PARTS = {
  item: (s) => `${s.say}!`,
  whichOne: (s) => `Which one is ${s.say}?`,
  thatWas: (s) => `That was ${s.say}.`,
  tryToFind: (s) => `Try to find ${s.say}.`,
  typeLetter: (s) => `Type the letter ${s.say}.`,
  oppositeOf: (s) => `What is the opposite of ${s.say}?`,
};

const partText = (kind, subject) =>
  (getPack()?.voiceParts?.[kind] || EN_PARTS[kind])(subject);

const buildPart = (kind, group) => (input) => {
  const s = subjectFor(input);
  return { key: `${group}/${s.slug}`, text: partText(kind, s) };
};

export const itemPart = buildPart('item', 'items');
export const whichOnePart = buildPart('whichOne', 'quiz/which-one');
export const thatWasPart = buildPart('thatWas', 'quiz/that-was');
export const tryToFindPart = buildPart('tryToFind', 'quiz/try-to-find');
export const typeLetterPart = buildPart('typeLetter', 'typing/type-letter');
export const oppositeOfPart = buildPart('oppositeOf', 'opposites/what-is-opposite');

// Scene questions are hand-written per pair ("Which one is big?"); the
// ENGLISH question keys the clip, the active locale supplies the wording.
export const scenePart = (question) => ({
  key: `opposites/scene/${voiceSlug(question)}`,
  text: sceneQuestionText(question),
});

export const linePart = (slug, text) => ({
  key: `lines/${slug}`,
  text: getPack()?.lines?.[slug] ?? text,
});

// Everything a lesson item can be asked with — used to warm the cache when
// a category page opens.
export const itemQuizParts = (item) => [
  itemPart(item),
  whichOnePart(item),
  thatWasPart(item),
  tryToFindPart(item),
];
