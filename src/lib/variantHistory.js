// Fresh-but-not-repeating picks for items with several interchangeable
// examples (`images` — transportation, nature; `videos` — squeezing). Each
// pick is random, but never one of the most recently SHOWN: the last one
// when there are two examples, the last two when there are three or more.
// History is per item (keyed by its first example path) and lives in
// localStorage so it holds across visits; it is per device, not per child.

const STORE_KEY = 'variantHistory';
const KEEP = 5;

let history = null;

const load = () => {
  if (history) return history;
  try {
    history = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    history = {};
  }
  return history;
};

const save = () => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(history));
  } catch {
    // storage blocked or full — picks still work, they just forget sooner
  }
};

export const variantList = (item) => item.images ?? item.videos ?? null;

const historyKey = (item) => variantList(item)[0];

// Random index that avoids the recently shown ones. Read-only: call
// recordShown once the pick is actually on screen.
export const pickFreshIndex = (item) => {
  const list = variantList(item);
  if (!list || list.length < 2) return 0;
  const recent = (load()[historyKey(item)] || []).slice(-Math.min(list.length - 1, 2));
  const candidates = list.map((_, i) => i).filter((i) => !recent.includes(i));
  return candidates[Math.floor(Math.random() * candidates.length)];
};

// The item with its pick resolved into `image`/`video` (+ `variantIndex`)
export const withVariant = (item, index) => {
  if (item.images) return { ...item, image: item.images[index], variantIndex: index };
  if (item.videos) return { ...item, video: item.videos[index], variantIndex: index };
  return item;
};

export const recordShown = (item) => {
  const list = variantList(item);
  if (!list || list.length < 2 || item.variantIndex == null) return;
  const h = load();
  const key = historyKey(item);
  const past = h[key] || [];
  // StrictMode re-runs mount effects in dev — don't log one showing twice
  if (past[past.length - 1] === item.variantIndex) return;
  h[key] = [...past, item.variantIndex].slice(-KEEP);
  save();
};

// One pick per ARRIVAL at an item (the learn view re-picks every time an
// item comes back round). Cached by arrival key so a re-render — or
// StrictMode's double render — shows the same pick instead of re-rolling.
const arrivalPicks = new Map();

export const pickForArrival = (item, arrivalKey) => {
  if (!variantList(item)) return item;
  const key = `${arrivalKey}|${historyKey(item)}`;
  if (!arrivalPicks.has(key)) {
    arrivalPicks.set(key, pickFreshIndex(item));
    if (arrivalPicks.size > 50) arrivalPicks.delete(arrivalPicks.keys().next().value);
  }
  return withVariant(item, arrivalPicks.get(key));
};
