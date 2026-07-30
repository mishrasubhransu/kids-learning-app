// Enumerates every pre-generated voice clip as { key, text }, built from
// the same part builders the app speaks with (src/lib/voiceKeys.js) so the
// generated audio always matches the runtime fallback text.
//
// Deliberately absent:
// - 2-letter phonics syllables (ba, be…): pronunciation is regional, so
//   they stay on browser TTS in the device's locale (parents can record
//   their own via /admin/record) — see useVoice's recording priority.
// - Family member names: user-generated, handled by api/generate-name-audio.
// - Praise/encouragement, category intros, letter sounds: already shipped
//   as static clips under public/audio/.
import {
  itemPart,
  whichOnePart,
  thatWasPart,
  tryToFindPart,
  typeLetterPart,
  oppositeOfPart,
  scenePart,
  linePart,
} from '../src/lib/voiceKeys.js';
import alphabets from '../src/data/alphabets.js';
import numbers from '../src/data/numbers.js';
import colors from '../src/data/colors.js';
import { shapes } from '../src/data/shapes.jsx';
import { conceptItems } from '../src/data/concepts.js';
import { phonicsWords } from '../src/data/phonics.js';
import opposites from '../src/data/opposites.js';
import { FIXED_LINES } from '../src/data/voiceLines.js';

export function buildCatalog() {
  const parts = new Map(); // key -> text; same name in two lessons = one clip

  const add = (part) => {
    if (!parts.has(part.key)) parts.set(part.key, part.text);
  };
  const addQuizSet = (name) => {
    add(itemPart(name));
    add(whichOnePart(name));
    add(thatWasPart(name));
    add(tryToFindPart(name));
  };

  [...alphabets, ...numbers, ...colors, ...shapes].forEach((i) => addQuizSet(i.name));
  Object.values(conceptItems).flat().forEach((i) => addQuizSet(i.name));

  // 3-letter families are real words (bat, can, cap); 2-letter syllable
  // families are excluded — see header.
  ['at', 'an', 'ap'].forEach((family) =>
    phonicsWords[family].forEach((w) => addQuizSet(w.name))
  );

  // The typing keyboard has a 0 key; the numbers lesson starts at 1
  add(itemPart('0'));
  add(thatWasPart('0'));
  alphabets.forEach((l) => add(typeLetterPart(l.name)));

  opposites.forEach((pair) => {
    pair.pair.forEach((word) => {
      add(itemPart(word));
      add(thatWasPart(word));
      add(oppositeOfPart(word));
    });
    pair.tests.forEach((t) => add(scenePart(t.question)));
  });

  Object.entries(FIXED_LINES).forEach(([slug, text]) => add(linePart(slug, text)));

  return [...parts.entries()].map(([key, text]) => ({
    key,
    text: GENERATION_TEXT_OVERRIDES[key] || text,
  }));
}

// Delivery-only rewrites for generation: eleven_v3 audio tags shape how a
// clip is performed. These NEVER reach the runtime — the app's TTS fallback
// keeps the clean voiceKeys text, so a missing clip is still read sanely.
// Changing an override changes the text hash, so the next generate run
// picks it up without --force.
const GENERATION_TEXT_OVERRIDES = {
  // "Quiet" should sound like the thing it names — a half whisper
  'items/quiet': '[whispers] Quiet!',
  'quiz/that-was/quiet': 'That was [whispers] Quiet.',
};
