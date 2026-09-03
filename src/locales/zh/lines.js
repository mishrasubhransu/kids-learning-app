// Mandarin texts for the fixed spoken lines (data/voiceLines.js), keyed by
// the same slugs — clips live at zh/lines/<slug> in the voice bucket.
// Addition lesson lines (data/addition.js slugs). AI-drafted 2026-09-02 —
// language-expert review pending, like the rest of the pack.
import items from './items';
import { additionSums, askSlug, answerSlug, LETS_COUNT_SLUG } from '../../data/addition';

const num = (n) => items[String(n)]?.say ?? String(n);
const additionLines = { [LETS_COUNT_SLUG]: '我们来数一数！' };
additionSums(10).forEach(({ a, b, sum }) => {
  additionLines[askSlug(a, b)] = `${num(a)}加${num(b)}等于几？`;
  additionLines[answerSlug(a, b)] = `所以，${num(a)}加${num(b)}等于${num(sum)}！`;
});

export default {
  ...additionLines,
  'game-interstitial': '真棒！我们玩个游戏吧？',
  'this-is-my-family': '这是我的家人！',
  'recap-0': '哇！看看你学了这么多！你赢得了一张贴纸！',
  'recap-1': '做得好！这是给你的闪亮新贴纸！',
  'recap-2': '太好了，你做到了！新贴纸放进你的收藏啦！',
};
