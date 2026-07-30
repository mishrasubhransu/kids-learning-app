import es from './es';

// Every language the app knows about. `complete` means the locale's voice
// clips are generated and it may be offered to parents; incomplete locales
// stay dark in production (dev builds list them for review, marked "beta").
//
// English has no pack — src/data is the English text (see lib/locale.js).
export const LOCALES = {
  en: { label: 'English', ttsLang: 'en-US', complete: true },
  es: { label: 'Español', ttsLang: 'es-US', complete: false, pack: es },
};

export const availableLocales = (includeIncomplete = false) =>
  Object.entries(LOCALES)
    .filter(([, meta]) => meta.complete || includeIncomplete)
    .map(([id, meta]) => ({ id, ...meta }));
