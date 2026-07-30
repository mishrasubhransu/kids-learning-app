// Mandarin sentence templates for the voiceKeys part builders. Each takes
// the normalized subject { name, say, ref, bare } (see lib/voiceKeys.js).
// The same functions build the runtime TTS fallback AND the Gemini-TTS clip
// catalog, so spoken clips and fallback text can never drift apart.
// Chinese has no plural agreement, so the plural flag is ignored.

export default {
  item: (s) => `${s.say}！`,
  whichOne: (s) => `哪个是${s.ref}？`,
  thatWas: (s) => `那是${s.ref}。`,
  tryToFind: (s) => `找一找${s.ref}！`,
  // Typing is hidden for zh (lessons.js) — kept so the builder can't crash
  typeLetter: (s) => `按一下字母${s.say}！`,
  oppositeOf: (s) => `跟${s.bare}相反的是哪个？`,
};
