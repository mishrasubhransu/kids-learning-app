import items from './items';
import strings from './strings';
import voiceParts from './voiceParts';
import intros from './intros';
import feedback from './feedback';
import lines from './lines';
import scenes from './scenes';

// The Odia locale pack. Shape consumed by lib/locale.js getPack():
//   items      slug -> { name, ref?, say?, bare? }
//   strings    UI string table (falls back to en per key)
//   voiceParts sentence-template functions for voiceKeys builders
//   intros     category intro lines (same keys/counts as data/intros.js)
//   feedback   praise tiers + encouragement phrases
//   lines      fixed spoken lines (data/voiceLines.js slugs)
//   scenes     opposites scene questions by English-question slug
export default { items, strings, voiceParts, intros, feedback, lines, scenes };
