import { useState, useEffect, useCallback } from "react";
import type { Locale } from "@fleetia/components/i18n";

const STORAGE_KEY = "locale";
const DEFAULT_LOCALE: Locale = "ko";

type UseLocaleReturn = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isLoaded: boolean;
};

export function useLocale(): UseLocaleReturn {
  const hasChromeStorage =
    typeof chrome !== "undefined" && !!chrome.storage?.sync;
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [isLoaded, setIsLoaded] = useState(!hasChromeStorage);

  useEffect(() => {
    if (hasChromeStorage) {
      chrome.storage.sync.get(STORAGE_KEY, result => {
        const saved = result[STORAGE_KEY];
        if (saved && (saved === "en" || saved === "ko" || saved === "ja")) {
          setLocaleState(saved as Locale);
        }
        setIsLoaded(true);
      });
    }
  }, [hasChromeStorage]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      chrome.storage.sync.set({ [STORAGE_KEY]: next });
    }
  }, []);

  return { locale, setLocale, isLoaded };
}
