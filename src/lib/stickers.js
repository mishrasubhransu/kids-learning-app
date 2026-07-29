// Recap stickers: the end-of-session payoff. Completing any test/game
// awards one sticker, persisted per child in the settings jsonb under
// 'stickers' — JSON-stringified like the rotation sets in useSessionItems,
// so the useChildSetting localStorage mirror keeps working pre-profile.
// Entries are compact: { e: emoji, c: category, d: 'YYYY-MM-DD' }.

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
const RECAP_LINES = [
  'Wow! Look at everything you learned! You earned a sticker!',
  'Great job! Here is a shiny new sticker for you!',
  'Hooray, you did it! A new sticker for your shelf!',
];

let lastLine = -1;

export const pickRecapLine = () => {
  let index = Math.floor(Math.random() * RECAP_LINES.length);
  if (index === lastLine) {
    index = (index + 1) % RECAP_LINES.length;
  }
  lastLine = index;
  return RECAP_LINES[index];
};
