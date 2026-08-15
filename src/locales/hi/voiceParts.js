// Hindi sentence templates for the voiceKeys part builders (speech-only
// pack — only the kinds the Indian Food lesson uses ever run; the rest are
// kept so a builder can't crash). Same contract as the other packs: these
// build both the pre-generated clip text and the runtime TTS fallback.
//
// Framed to dodge grammatical gender: "कहाँ है?" and the plain present
// copula "है" read the same for डोसा (m) and रोटी (f), so no per-item
// gender table is needed. AI-drafted, awaiting native review.

export default {
  item: (s) => `${s.say}!`,
  whichOne: (s) => `${s.ref} कहाँ है?`,
  thatWas: (s) => `यह ${s.ref} है।`,
  tryToFind: (s) => `ढूँढो तो, ${s.ref} कहाँ है!`,
  typeLetter: (s) => `${s.say} अक्षर दबाओ!`,
  oppositeOf: (s) => `${s.bare} का उलटा क्या है?`,
};
