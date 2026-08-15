import es from './es';
import zh from './zh';
import or from './or';
import hi from './hi';

// Every language the app knows about. `complete` means the locale's voice
// clips are generated and it may be offered to parents; incomplete locales
// stay dark in production (dev builds list them for review, marked "beta").
//
// English has no pack — src/data is the English text (see lib/locale.js).
export const LOCALES = {
  en: { label: 'English', ttsLang: 'en-US', complete: true },
  es: { label: 'Español', ttsLang: 'es-US', complete: true, pack: es },
  zh: { label: '中文', ttsLang: 'zh-CN', complete: true, pack: zh },
  or: { label: 'ଓଡ଼ିଆ', ttsLang: 'or-IN', complete: true, pack: or },
};

export const availableLocales = (includeIncomplete = false) =>
  Object.entries(LOCALES)
    .filter(([, meta]) => meta.complete || includeIncomplete)
    .map(([id, meta]) => ({ id, ...meta }));

// Speech-only locales: never offered as the app language (deliberately NOT
// in LOCALES, so language pickers and setActiveLocale can't reach them).
// They exist as audio choices for fixed-language lessons — the Indian Food
// lesson can speak Hindi while the app runs in English or Odia. Their packs
// carry only items/voiceParts/intros.
export const SPEECH_LOCALES = {
  hi: { label: 'हिंदी', ttsLang: 'hi-IN', pack: hi },
};
