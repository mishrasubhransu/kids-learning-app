import items from './items';
import voiceParts from './voiceParts';
import intros from './intros';

// Hindi SPEECH-ONLY pack: registered in SPEECH_LOCALES (locales/index.js),
// never in LOCALES — Hindi is not an app language, it exists solely as an
// audio choice for fixed-language lessons (Indian Food). No strings /
// feedback / lines / scenes: UI text and praise stay in the app language.
export default { items, voiceParts, intros };
