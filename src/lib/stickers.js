// Recap stickers: the end-of-session payoff. Completing any test/game
// awards one sticker, persisted per child in the settings jsonb under
// 'stickers' — JSON-stringified like the rotation sets in useSessionItems,
// so the useChildSetting localStorage mirror keeps working pre-profile.
// Entries are compact: { e: emoji, c: category, d: 'YYYY-MM-DD' }.
import { RECAP_LINE_SLUGS } from '../data/voiceLines';

export const STICKER_POOL = [
  '⭐', '🌟', '🏅', '🌈', '🦄', '🧸', '🎈', '🍭',
  '🚀', '🐥', '🦋', '🍓', '🐬', '🌻', '🍦', '🐢',
  '🎨', '🪁', '🐞', '🌸',
];

// Oldest fall off first; keeps the settings jsonb (and the shelf) bounded
const MAX_STICKERS = 200;

export const parseStickers = (raw) => {
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

export const pickSticker = () =>
  STICKER_POOL[Math.floor(Math.random() * STICKER_POOL.length)];

export const appendSticker = (raw, sticker) =>
  JSON.stringify([...parseStickers(raw), sticker].slice(-MAX_STICKERS));

// Spoken over the recap collage — TTS only (no pre-generated clips), same
// as the rest of the in-game speech. Never the same line twice in a row,
// matching pickIntro's rule.
let lastLine = -1;

// Returns a lines/ slug (see data/voiceLines.js) — the recap speaks its
// pre-generated clip via fixedLinePart(slug).
export const pickRecapLine = () => {
  let index = Math.floor(Math.random() * RECAP_LINE_SLUGS.length);
  if (index === lastLine) {
    index = (index + 1) % RECAP_LINE_SLUGS.length;
  }
  lastLine = index;
  return RECAP_LINE_SLUGS[index];
};
