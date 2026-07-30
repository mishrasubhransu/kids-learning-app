// Enumerates every pre-generated voice clip as { key, text } for a locale,
// built from the same part builders the app speaks with (src/lib/voiceKeys.js)
// so the generated audio always matches the runtime fallback text. Keys are
// locale-less; the caller prefixes <locale>/ for bucket paths.
//
// buildCatalog('es') flips the active locale first, so every builder pulls
// its sentence templates and item names from that locale's pack. Locales
// other than en additionally list their category intros and praise/
// encouragement clips (English ships those as static files under
// public/audio) and skip lessons the registry hides for them (phonics).
//
// Deliberately absent:
// - 2-letter phonics syllables (ba, be…): pronunciation is regional, so
//   they stay on browser TTS in the device's locale (parents can record
//   their own via /admin/record) — see useVoice's recording priority.
// - Family member names: user-generated, handled by api/generate-name-audio.
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
import { setActiveLocale, getPack } from '../src/lib/locale.js';
import { isLessonAvailable } from '../src/data/lessons.js';
import alphabets from '../src/data/alphabets.js';
import numbers from '../src/data/numbers.js';
import colors from '../src/data/colors.js';
import { shapes } from '../src/data/shapes.jsx';
import { conceptItems } from '../src/data/concepts.js';
import { phonicsWords } from '../src/data/phonics.js';
import opposites from '../src/data/opposites.js';
import { FIXED_LINES } from '../src/data/voiceLines.js';
import { intros } from '../src/data/intros.js';

export function buildCatalog(locale = 'en') {
  setActiveLocale(locale);
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

  if (isLessonAvailable(locale, 'alphabets')) {
    alphabets.forEach((i) => addQuizSet(i.name));
  }
  [...numbers, ...colors, ...shapes].forEach((i) => addQuizSet(i.name));
  Object.values(conceptItems).flat().forEach((i) => addQuizSet(i.name));

  // 3-letter families are real words (bat, can, cap); 2-letter syllable
  // families are excluded — see header. Locales without phonics skip both.
  if (isLessonAvailable(locale, 'phonics')) {
    ['at', 'an', 'ap'].forEach((family) =>
      phonicsWords[family].forEach((w) => addQuizSet(w.name))
    );
  }

  // The typing keyboard has a 0 key; the numbers lesson starts at 1
  add(itemPart('0'));
  add(thatWasPart('0'));
  if (isLessonAvailable(locale, 'typing')) {
    alphabets.forEach((l) => add(typeLetterPart(l.name)));
  }

  opposites.forEach((pair) => {
    pair.pair.forEach((word) => {
      add(itemPart(word));
      add(thatWasPart(word));
      add(oppositeOfPart(word));
    });
    pair.tests.forEach((t) => add(scenePart(t.question)));
  });

  Object.entries(FIXED_LINES).forEach(([slug, text]) => add(linePart(slug, text)));

  // English intros/praise/encouragement already ship as static files under
  // public/audio; other locales keep theirs in the voice bucket.
  if (locale !== 'en') {
    const pack = getPack();
    Object.keys(intros).forEach((categoryKey) => {
      const lines = pack?.intros?.[categoryKey];
      if (!lines) return;
      lines.forEach((text, i) => add({ key: `intros/${categoryKey}/${i}`, text }));
    });
    (pack?.feedback?.positiveTiers || []).forEach((tier, t) =>
      tier.forEach((text, i) => add({ key: `feedback/positive/tier${t}/${i}`, text }))
    );
    (pack?.feedback?.encouragement || []).forEach((text, i) =>
      add({ key: `feedback/encouragement/${i}`, text })
    );
  }

  const overrides = GENERATION_TEXT_OVERRIDES[locale] || {};
  return [...parts.entries()].map(([key, text]) => ({
    key,
    text: overrides[key] || text,
  }));
}

// Delivery-only rewrites for generation, per locale: audio tags shape how a
// clip is performed, and some texts need rewording to pass the provider at
// all. These NEVER reach the runtime — the app's TTS fallback keeps the
// clean voiceKeys text, so a missing clip is still read sanely. Changing an
// override changes the text hash, so the next generate run picks it up
// without --force.
const GENERATION_TEXT_OVERRIDES = {
  en: {
    // "Quiet" should sound like the thing it names — a half whisper
    'items/quiet': '[whispers] Quiet!',
    'quiz/that-was/quiet': 'That was [whispers] Quiet.',
  },
  es: {
    // Words that trip Gemini's safety filter (PROHIBITED_CONTENT) when
    // spoken bare or with too little context; extra words get them through.
    // "cu" is profane in Portuguese, "pelando"/"labios" read as innuendo.
    'items/q': '¡La letra cu!',
    'items/lips': '¡Los labios!',
    'items/peeling': '¡Pelando la fruta!',
    'quiz/try-to-find/peeling': '¡Busca al que está pelando la fruta!',
  },
};
