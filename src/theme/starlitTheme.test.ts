import { describe, expect, it } from 'vitest';

import { DEFAULT_STARLIT_THEME } from './defaults';
import { getIbmPlexStylesheetUrls } from './FontStylesheets';
import { getFontFamilyStyle, getThemeStyle } from './starlitTheme';

describe('getIbmPlexStylesheetUrls', () => {
  it('loads only Latin for English and adds the matching CJK family', () => {
    const englishUrls = getIbmPlexStylesheetUrls('en');
    const koreanUrls = getIbmPlexStylesheetUrls('ko');
    const japaneseUrls = getIbmPlexStylesheetUrls('ja');

    expect(englishUrls).toHaveLength(1);
    expect(englishUrls[0]).toContain('IBM+Plex+Sans:ital');
    expect(koreanUrls).toHaveLength(2);
    expect(koreanUrls[1]).toContain('IBM+Plex+Sans+KR');
    expect(japaneseUrls).toHaveLength(2);
    expect(japaneseUrls[1]).toContain('IBM+Plex+Sans+JP');
  });
});

describe('getFontFamilyStyle', () => {
  it.each([
    ['en', '"IBM Plex Sans", system-ui, sans-serif'],
    ['ko', '"IBM Plex Sans KR", "IBM Plex Sans", system-ui, sans-serif'],
    ['ja', '"IBM Plex Sans JP", "IBM Plex Sans", system-ui, sans-serif'],
  ] as const)(
    'uses the locale-specific IBM family for %s',
    (locale, family) => {
      const style = getFontFamilyStyle('ibm-plex-sans', locale);

      expect(style.fontFamily).toBe(family);
      expect(style['--lagrange-semantic-typography-family-display']).toBe(
        family,
      );
      expect(style['--lagrange-semantic-typography-family-ui']).toBe(family);
      expect(style['--lagrange-semantic-typography-family-data']).toBe(family);
    },
  );

  it('uses the browser system family without an IBM fallback', () => {
    const style = getFontFamilyStyle('system', 'ko');

    expect(style.fontFamily).toBe('system-ui, sans-serif');
    expect(style['--lagrange-semantic-typography-family-ui']).toBe(
      'system-ui, sans-serif',
    );
  });
});

describe('getThemeStyle', () => {
  it('maps the app theme to Lagrange and compatibility variables', () => {
    const style = getThemeStyle(DEFAULT_STARLIT_THEME);

    expect(style['--c-accent']).toBe(DEFAULT_STARLIT_THEME.accent);
    expect(style['--c-hover-text']).toBe(DEFAULT_STARLIT_THEME.hoverText);
    expect(style['--lagrange-semantic-color-content-accent']).toBe(
      DEFAULT_STARLIT_THEME.accent,
    );
  });
});
