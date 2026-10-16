import { createContext, useContext, useMemo, type ReactNode } from 'react';
import en from './en.json';
import nl from './nl.json';

export type Lang = 'nl' | 'en';
export type MessageKey = keyof typeof en;
export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

/** Typed as complete: a key missing from nl.json is a compile error. */
const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, nl };

/** Spec §11: the device language decides, Dutch only when the device prefers Dutch. */
export function detectLanguage(languages: readonly string[]): Lang {
  return languages[0]?.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

export function translate(lang: Lang, key: MessageKey, params: Record<string, string | number> = {}): string {
  return MESSAGES[lang][key].replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

const I18nContext = createContext<{ lang: Lang; t: Translate }>({ lang: 'en', t: (key, params) => translate('en', key, params) });

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo(() => ({ lang, t: ((key, params) => translate(lang, key, params)) as Translate }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): { lang: Lang; t: Translate } {
  return useContext(I18nContext);
}
