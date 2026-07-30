// Spanish sentence templates for the voiceKeys part builders. Each takes the
// normalized subject { name, say, ref, bare } (see lib/voiceKeys.js). The
// same functions build the runtime TTS fallback AND the Gemini-TTS clip
// catalog, so spoken clips and fallback text can never drift apart.

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// "lo contrario de el día" → "del día"
const contract = (s) => s.replace(/\bde el\b/g, 'del');

export default {
  item: (s) => `¡${cap(s.say)}!`,
  // Plural items conjugate: "¿Cuáles son las uvas?", "Eso eran las uvas."
  // ("eso" + plural verb is standard Spanish — eso son cosas)
  whichOne: (s) => (s.plural ? `¿Cuáles son ${s.ref}?` : `¿Cuál es ${s.ref}?`),
  thatWas: (s) => (s.plural ? `Eso eran ${s.ref}.` : `Eso era ${s.ref}.`),
  tryToFind: (s) => `¡Busca ${s.ref}!`,
  typeLetter: (s) => `¡Escribe la letra ${s.say}!`,
  oppositeOf: (s) => contract(`¿Cuál es lo contrario de ${s.bare}?`),
};
