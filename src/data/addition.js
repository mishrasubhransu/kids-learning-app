// Addition lesson data: every sum up to a maximum, and the spoken lines that
// go with them. Pure data so the voice catalog can import it outside the
// browser (scripts/voice-catalog.mjs via data/voiceLines.js).

// Things that fill the crates. Emoji so any object works on day one; a
// generated sprite can replace the glyph later by adding `image` to an entry
// (Crate renders `image` when present, the emoji otherwise). The Home card
// cycles through these — see the addition pill.
export const additionObjects = {
  pineapple: { emoji: '🍍' },
  apple: { emoji: '🍎' },
  teddy: { emoji: '🧸' },
  strawberry: { emoji: '🍓' },
  cookie: { emoji: '🍪' },
  star: { emoji: '⭐' },
};

export const DEFAULT_ADDITION_OBJECT = 'pineapple';

// The Home pill cycles the biggest sum: 5 → 10 → 5
export const ADDITION_MAXES = ['5', '10'];
export const DEFAULT_ADDITION_MAX = '10';

// Every ordered pair a + b with both addends ≥ 1 and a + b ≤ max. Both
// 2 + 3 and 3 + 2 are in — seeing the crates swap and the answer stay is
// the point. Sorted by total so a session starts with 1 + 1 and climbs.
export const additionSums = (max = 10) => {
  const sums = [];
  for (let total = 2; total <= max; total++) {
    for (let a = 1; a < total; a++) {
      sums.push({ id: `${a}+${total - a}`, a, b: total - a, sum: total });
    }
  }
  return sums;
};

// Voice line slugs (lines/<slug> in the voice bucket). The same slug keys
// every locale's `lines` map, so the clip text comes from the active pack.
export const askSlug = (a, b) => `add-ask-${a}-${b}`;
export const answerSlug = (a, b) => `add-answer-${a}-${b}`;
export const LETS_COUNT_SLUG = 'add-lets-count';

// English texts for every line the lesson can say, keyed by slug — spread
// into FIXED_LINES. Other locales build the same keys in their lines.js.
export const additionLines = (() => {
  const lines = { [LETS_COUNT_SLUG]: "Let's count!" };
  additionSums(10).forEach(({ a, b, sum }) => {
    lines[askSlug(a, b)] = `What is ${a} plus ${b}?`;
    lines[answerSlug(a, b)] = `So, ${a} plus ${b} is ${sum}!`;
  });
  return lines;
})();
