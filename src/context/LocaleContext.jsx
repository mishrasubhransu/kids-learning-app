import { createContext, useContext, useMemo } from 'react';
import useChildSetting from '../hooks/useChildSetting';
import { LOCALES } from '../locales';
import { setActiveLocale } from '../lib/locale';
import enStrings from '../locales/en/strings';

// Per-child language. The provider mirrors the reactive value into
// lib/locale.js's module state DURING render (idempotent, so StrictMode's
// double render is harmless) — that keeps non-React modules (voiceKeys,
// voice.js) in sync before any child component builds a sentence.
//
// t(key, vars): active pack string → English string → the key itself.

const interpolate = (tpl, vars) =>
  vars ? tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : tpl;

const translateFor = (locale) => (key, vars) => {
  const tpl = LOCALES[locale]?.pack?.strings?.[key] ?? enStrings[key] ?? key;
  return interpolate(tpl, vars);
};

const LocaleContext = createContext({
  locale: 'en',
  t: translateFor('en'),
});

export const useLocale = () => useContext(LocaleContext);

export const LocaleProvider = ({ children }) => {
  const [language] = useChildSetting('language', 'en');
  const locale = LOCALES[language] ? language : 'en';
  setActiveLocale(locale);

  const value = useMemo(() => ({ locale, t: translateFor(locale) }), [locale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
};
