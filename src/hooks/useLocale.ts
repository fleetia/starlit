import { useState, useEffect, useCallback } from 'react';

import type { Locale } from '../i18n';

const STORAGE_KEY = 'locale';
const DEFAULT_LOCALE: Locale = 'ko';

function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'ko' || value === 'ja';
}

type UseLocaleReturn = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  isLoaded: boolean;
};

export function useLocale(): UseLocaleReturn {
  const hasChromeStorage =
    typeof chrome !== 'undefined' && !!chrome.storage?.sync;
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [isLoaded, setIsLoaded] = useState(!hasChromeStorage);

  useEffect(() => {
    if (!hasChromeStorage) {
      return undefined;
    }

    let isActive = true;
    let hasStorageChange = false;
    const storageChanges = chrome.storage.onChanged;

    function handleStorageChange(
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ): void {
      if (areaName !== 'sync' || !(STORAGE_KEY in changes)) {
        return;
      }

      hasStorageChange = true;
      const nextLocale = changes[STORAGE_KEY]?.newValue;
      setLocaleState(isLocale(nextLocale) ? nextLocale : DEFAULT_LOCALE);
      setIsLoaded(true);
    }

    storageChanges?.addListener(handleStorageChange);
    chrome.storage.sync.get(STORAGE_KEY, (result) => {
      if (!isActive || hasStorageChange) {
        return;
      }

      const saved = result[STORAGE_KEY];
      if (isLocale(saved)) {
        setLocaleState(saved);
      }
      setIsLoaded(true);
    });

    return () => {
      isActive = false;
      storageChanges?.removeListener(handleStorageChange);
    };
  }, [hasChromeStorage]);

  const setLocale = useCallback(async (next: Locale): Promise<void> => {
    setLocaleState(next);
    if (typeof chrome !== 'undefined' && chrome.storage?.sync) {
      await chrome.storage.sync.set({ [STORAGE_KEY]: next });
    }
  }, []);

  return { locale, setLocale, isLoaded };
}
