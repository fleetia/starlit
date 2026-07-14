import { createContext, useContext } from 'react';
import type { Locale, TranslationKey, Translations } from './types';
import en from './locales/en';
import ko from './locales/ko';
import ja from './locales/ja';

const localeMap: Record<Locale, Translations> = { en, ko, ja };

type I18nContextValue = {
  locale: Locale;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue>({
  locale: 'ko',
  t: (key: TranslationKey) => localeMap.ko[key] ?? key,
});

export { I18nContext, localeMap };

export function useTranslation(): I18nContextValue {
  return useContext(I18nContext);
}
