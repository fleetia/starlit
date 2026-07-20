import { describe, expect, it } from 'vitest';

import {
  createGuideHref,
  getGuideRoute,
  normalizeGuideLocale,
  normalizeGuideSection,
} from './guideRoute';

describe('guideRoute', () => {
  it('normalizes unsupported locale and section values', () => {
    expect(normalizeGuideLocale('en')).toBe('en');
    expect(normalizeGuideLocale('fr')).toBe('ko');
    expect(normalizeGuideSection('#tab-groups')).toBe('tab-groups');
    expect(normalizeGuideSection('#overlay-images')).toBe('overlay-images');
    expect(normalizeGuideSection('#troubleshooting')).toBe('troubleshooting');
    expect(normalizeGuideSection('#unknown')).toBeUndefined();
  });

  it('reads an allowlisted route from the page location', () => {
    expect(getGuideRoute('?locale=ja', '#appearance')).toEqual({
      locale: 'ja',
      section: 'appearance',
    });
    expect(getGuideRoute('?locale=invalid', '#invalid')).toEqual({
      locale: 'ko',
    });
  });

  it('creates an extension-local guide link with an optional section', () => {
    const baseHref = chrome.runtime.getURL
      ? chrome.runtime.getURL('guide.html')
      : '/guide.html';

    expect(createGuideHref('en')).toBe(`${baseHref}?locale=en`);
    expect(createGuideHref('ko', 'getting-started')).toBe(
      `${baseHref}?locale=ko#getting-started`,
    );
    expect(createGuideHref('ja', 'overlay-images')).toBe(
      `${baseHref}?locale=ja#overlay-images`,
    );
  });
});
