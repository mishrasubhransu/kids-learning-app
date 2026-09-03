// Odia texts for the fixed spoken lines (data/voiceLines.js), keyed by the
// same slugs — clips live at or/lines/<slug> in the voice bucket.
// Addition lesson lines (data/addition.js slugs). AI-drafted 2026-09-02 —
// family review pending, like the rest of the pack.
import items from './items';
import { additionSums, askSlug, answerSlug, LETS_COUNT_SLUG } from '../../data/addition';

const num = (n) => items[String(n)]?.say ?? String(n);
const additionLines = { [LETS_COUNT_SLUG]: 'ଚାଲ ଗଣିବା!' };
additionSums(10).forEach(({ a, b, sum }) => {
  additionLines[askSlug(a, b)] = `${num(a)} ଯୋଗ ${num(b)} କେତେ ହେବ?`;
  additionLines[answerSlug(a, b)] = `ତେଣୁ, ${num(a)} ଯୋଗ ${num(b)} ହେଲା ${num(sum)}!`;
});

export default {
  ...additionLines,
  'game-interstitial': 'ବହୁତ ବଢ଼ିଆ! ଚାଲ ଗୋଟିଏ ଖେଳ ଖେଳିବା?',
  'this-is-my-family': 'ଏଇଟା ମୋ ପରିବାର!',
  'recap-0': 'ବାଃ! ଦେଖ ତ ତୁମେ କେତେ ଶିଖିଲ! ତୁମେ ଗୋଟିଏ ଷ୍ଟିକର ଜିତିଲ!',
  'recap-1': 'ଭଲ କଲ! ଏଇ ନିଅ ତୁମର ଚକଚକିଆ ନୂଆ ଷ୍ଟିକର!',
  'recap-2': 'ସାବାସ୍, ତୁମେ କରି ଦେଖାଇଲ! ନୂଆ ଷ୍ଟିକରଟି ତୁମ ସଂଗ୍ରହରେ ରହିଲା!',
};
