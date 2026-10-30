import type { Locale } from '../i18n';

export function createLicensesHref(locale: Locale): string {
  const baseHref =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('licenses.html')
      : '/licenses.html';
  return `${baseHref}?locale=${locale}`;
}
