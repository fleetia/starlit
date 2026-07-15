import React, { useEffect, useMemo } from 'react';
import type { Locale, TranslationKey } from './types';
import { I18nContext, localeMap } from './context';

type I18nProviderProps = {
  locale: Locale;
  children: React.ReactNode;
};

export function I18nProvider({
  locale,
  children,
}: I18nProviderProps): React.ReactElement {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      t: (key: TranslationKey) => localeMap[locale][key] ?? key,
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
