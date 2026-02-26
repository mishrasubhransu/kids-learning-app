/**
 * Tiered positive feedback — excitement escalates with correct answer count.
 * Each tier has 5 phrases; a random one is picked per correct answer.
 *
 *   Tier 0 (1–2 correct):  Warm, gentle
 *   Tier 1 (3–5 correct):  Upbeat, pleased
 *   Tier 2 (6–8 correct):  Genuinely excited
 *   Tier 3 (9+  correct):  Over-the-moon celebration
 */
export const positiveTiers = [
  // Tier 0 — warm start
  [
    'Good job!',
    'Very good!',
    "That's right!",
    'Well done!',
    'Nice!',
  ],
  // Tier 1 — upbeat
  [
    'Ooh, great work!',
    'Fantastic!',
    'Brilliant!',
    'Awesome, way to go!',
    'Wonderful, keep it up!',
  ],
  // Tier 2 — excited
  [
    'Wow, amazing!',
    "You're doing so well!",
    'Look at you go!',
    'So impressive!',
    'Woohoo! You really know your stuff!',
  ],
  // Tier 3 — over the moon
  [
    "Oh my god, you're a genius!",
    'Absolutely incredible!',
    'You are a superstar!',
    "There's no stopping you!",
    "I can't believe how amazing you are!",
  ],
];

export const encouragement = [
  'Uh oh! Not quite.',
  "Oopsie! Let's try again!",
  'Hmm, not that one.',
  'Oh no! Give it another shot!',
  'Whoops! Try again!',
  'Nope! Almost though!',
];

export const getTierForCount = (correctCount) => {
  if (correctCount <= 2) return 0;
  if (correctCount <= 5) return 1;
  if (correctCount <= 8) return 2;
  return 3;
};

export const getRandomPositive = (correctCount = 1) => {
  const tier = getTierForCount(correctCount);
  const phrases = positiveTiers[tier];
  return phrases[Math.floor(Math.random() * phrases.length)];
};

export const getRandomEncouragement = () => {
  return encouragement[Math.floor(Math.random() * encouragement.length)];
};
