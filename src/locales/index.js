import es from './es';
import zh from './zh';

// Every language the app knows about. `complete` means the locale's voice
// clips are generated and it may be offered to parents; incomplete locales
// stay dark in production (dev builds list them for review, marked "beta").
//
// English has no pack — src/data is the English text (see lib/locale.js).
export const LOCALES = {
  en: { label: 'English', ttsLang: 'en-US', complete: true },
  es: { label: 'Español', ttsLang: 'es-US', complete: true, pack: es },
  zh: { label: '中文', ttsLang: 'zh-CN', complete: false, pack: zh },
};

export const availableLocales = (includeIncomplete = false) =>
  Object.entries(LOCALES)
    .filter(([, meta]) => meta.complete || includeIncomplete)
    .map(([id, meta]) => ({ id, ...meta }));
