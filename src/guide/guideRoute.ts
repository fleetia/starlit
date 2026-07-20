import type { Locale } from '../i18n';

export const GUIDE_SECTIONS = [
  'getting-started',
  'bookmarks-folders',
  'tab-groups',
  'group-layout',
  'appearance',
  'overlay-images',
  'backup-permissions',
  'troubleshooting',
] as const;

export type GuideSection = (typeof GUIDE_SECTIONS)[number];

export type GuideRoute = {
  locale: Locale;
  section?: GuideSection;
};

export function normalizeGuideLocale(value: string | null): Locale {
  if (value === 'en' || value === 'ja' || value === 'ko') {
    return value;
  }

  return 'ko';
}

export function normalizeGuideSection(
  value: string | null,
): GuideSection | undefined {
  if (!value) {
    return undefined;
  }

  const section = value.startsWith('#') ? value.slice(1) : value;
  return GUIDE_SECTIONS.find((candidate) => candidate === section);
}

export function getGuideRoute(search: string, hash: string): GuideRoute {
  const query = new URLSearchParams(search);
  const section = normalizeGuideSection(hash);

  return {
    locale: normalizeGuideLocale(query.get('locale')),
    ...(section ? { section } : {}),
  };
}

export function createGuideHref(
  locale: Locale,
  section?: GuideSection,
): string {
  const baseHref =
    typeof chrome !== 'undefined' && chrome.runtime?.getURL
      ? chrome.runtime.getURL('guide.html')
      : '/guide.html';
  const normalizedSection = normalizeGuideSection(section ?? null);

  return `${baseHref}?locale=${locale}${normalizedSection ? `#${normalizedSection}` : ''}`;
}
