// Odia sentence templates for the voiceKeys part builders. Each takes the
// normalized subject { name, say, ref, bare } (see lib/voiceKeys.js). The
// same functions build the runtime TTS fallback AND the Gemini-TTS clip
// catalog, so spoken clips and fallback text can never drift apart.
//
// The "କେଉଁଟି {ref}?" frame works for nouns ("କେଉଁଟି କୁକୁର?"), continuous
// verbs ("କେଉଁଟି ଦୌଡ଼ୁଛି?") and adjectives ("କେଉଁଟି ବଡ଼?") alike, so refs
// never need clumsy nominalizations. Odia has no plural agreement to track.

export default {
  item: (s) => `${s.say}!`,
  whichOne: (s) => `କେଉଁଟି ${s.ref}?`,
  thatWas: (s) => `ସେଇଟା ${s.ref}।`,
  tryToFind: (s) => `ଖୋଜ ତ, କେଉଁଟି ${s.ref}!`,
  // Typing is hidden for or (lessons.js) — kept so the builder can't crash
  typeLetter: (s) => `${s.say} ଅକ୍ଷରକୁ ଦବାଅ!`,
  oppositeOf: (s) => `${s.bare}ର ଓଲଟା କେଉଁଟି?`,
};
