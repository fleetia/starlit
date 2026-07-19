import { useEffect } from 'react';

import type { Locale } from '../i18n';
import type { FontFamily } from './types';

const IBM_PLEX_SANS_URL =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,100..700;1,100..700&display=swap';
const IBM_PLEX_SANS_KR_URL =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@100;200;300;400;500;600;700&display=swap';
const IBM_PLEX_SANS_JP_URL =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@100;200;300;400;500;600;700&display=swap';

export function getIbmPlexStylesheetUrls(locale: Locale): readonly string[] {
  switch (locale) {
    case 'ja':
      return [IBM_PLEX_SANS_URL, IBM_PLEX_SANS_JP_URL];
    case 'ko':
      return [IBM_PLEX_SANS_URL, IBM_PLEX_SANS_KR_URL];
    case 'en':
      return [IBM_PLEX_SANS_URL];
  }
}

type FontStylesheetsProps = {
  fontFamily: FontFamily;
  locale: Locale;
};

export function FontStylesheets({
  fontFamily,
  locale,
}: FontStylesheetsProps): null {
  useEffect(() => {
    const documentElement = document.documentElement;

    if (fontFamily === 'system') {
      documentElement.dataset.starlitFontStatus = 'system';
      return () => {
        delete documentElement.dataset.starlitFontStatus;
      };
    }

    const urls = getIbmPlexStylesheetUrls(locale);
    const links: HTMLLinkElement[] = [];
    let isActive = true;
    let pendingCount = urls.length;
    let hasError = false;

    documentElement.dataset.starlitFontStatus = 'loading';

    function settleLink(didFail: boolean): void {
      hasError ||= didFail;
      pendingCount -= 1;

      if (isActive && pendingCount === 0) {
        documentElement.dataset.starlitFontStatus = hasError
          ? 'error'
          : 'loaded';
      }
    }

    urls.forEach((url) => {
      const link = document.createElement('link');
      link.dataset.starlitFontStylesheet = '';
      link.href = url;
      link.rel = 'stylesheet';
      link.addEventListener('load', () => settleLink(false), { once: true });
      link.addEventListener('error', () => settleLink(true), { once: true });
      document.head.append(link);
      links.push(link);
    });

    return () => {
      isActive = false;
      links.forEach((link) => link.remove());
      delete documentElement.dataset.starlitFontStatus;
    };
  }, [fontFamily, locale]);

  return null;
}
