// Pre-generated voice clip keys paired with their exact spoken text. A
// "part" is { key, text }: the key locates the clip in the voice bucket,
// the text is what the clip says — and what the browser-TTS fallback says
// when the clip is missing, so the two can never drift apart. The clip
// generation script (scripts/voice-catalog.mjs) builds its catalog from
// these same builders.
//
// Keys are locale-less; lib/voice.js resolves them against the active
// locale (en/items/lion.mp3 in the bucket). Compound sentences are split
// into full-sentence parts ("That was X." + "Try to find Y.") and played
// back to back, so ~450 items need 4 clips each instead of every pairing.

export const voiceSlug = (name) =>
  String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const itemPart = (name) => ({
  key: `items/${voiceSlug(name)}`,
  text: `${name}!`,
});

export const whichOnePart = (name) => ({
  key: `quiz/which-one/${voiceSlug(name)}`,
  text: `Which one is ${name}?`,
});

export const thatWasPart = (name) => ({
  key: `quiz/that-was/${voiceSlug(name)}`,
  text: `That was ${name}.`,
});

export const tryToFindPart = (name) => ({
  key: `quiz/try-to-find/${voiceSlug(name)}`,
  text: `Try to find ${name}.`,
});

export const typeLetterPart = (letter) => ({
  key: `typing/type-letter/${voiceSlug(letter)}`,
  text: `Type the letter ${letter}.`,
});

export const oppositeOfPart = (word) => ({
  key: `opposites/what-is-opposite/${voiceSlug(word)}`,
  text: `What is the opposite of ${word}?`,
});

// Scene questions are hand-written per pair ("Which one is big?"); the
// question text is unique, so it keys itself.
export const scenePart = (question) => ({
  key: `opposites/scene/${voiceSlug(question)}`,
  text: question,
});

export const linePart = (slug, text) => ({ key: `lines/${slug}`, text });

// Everything a lesson item can be asked with — used to warm the cache when
// a category page opens.
export const itemQuizParts = (name) => [
  itemPart(name),
  whichOnePart(name),
  thatWasPart(name),
  tryToFindPart(name),
];
