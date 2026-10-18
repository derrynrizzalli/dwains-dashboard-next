import { en, type TranslationDictionary, type TranslationKey } from './locales/en';

export const SUPPORTED_LANGUAGES = ['en'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// This fork ships English only. Other Home Assistant languages use the English
// dictionary, so there is nothing further to load.
export const TRANSLATIONS: { en: TranslationDictionary } & Partial<Record<SupportedLanguage, TranslationDictionary>> = {
  en,
};

/** Fired on window when a language finished loading, so components can re-render. */
export const TRANSLATIONS_LOADED_EVENT = 'dwains-dashboard-next-translations-loaded';

export function loadTranslations(_lang: SupportedLanguage): Promise<void> {
  return Promise.resolve();
}

export { type TranslationDictionary, type TranslationKey };
