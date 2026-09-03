// Spanish texts for the fixed spoken lines (data/voiceLines.js), keyed by
// the same slugs — clips live at es/lines/<slug> in the voice bucket.
// Phrased without gendered adjectives ("¿Jugamos?" instead of "¿Listo?").
// Addition lesson lines (data/addition.js slugs). AI-drafted 2026-09-02 —
// language-expert review pending, like the rest of the pack. Numbers are
// spelled out with the pack's own number words so clips and screen agree.
import items from './items';
import { additionSums, askSlug, answerSlug, LETS_COUNT_SLUG } from '../../data/addition';

const num = (n) => items[String(n)]?.say ?? String(n);
const additionLines = { [LETS_COUNT_SLUG]: '¡Vamos a contar!' };
additionSums(10).forEach(({ a, b, sum }) => {
  additionLines[askSlug(a, b)] = `¿Cuánto es ${num(a)} más ${num(b)}?`;
  additionLines[answerSlug(a, b)] = `Entonces, ${num(a)} más ${num(b)} es ${num(sum)}.`;
});

export default {
  ...additionLines,
  'game-interstitial': '¡Muy bien! ¿Jugamos un juego?',
  'this-is-my-family': '¡Esta es mi familia!',
  'recap-0': '¡Guau! ¡Mira todo lo que aprendiste! ¡Te ganaste un sticker!',
  'recap-1': '¡Buen trabajo! ¡Aquí tienes un sticker nuevo y brillante!',
  'recap-2': '¡Hurra, lo lograste! ¡Un sticker nuevo para tu colección!',
};
