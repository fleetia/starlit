import { describe, expect, it } from 'vitest';

import { DEFAULT_STARLIT_THEME, LEGACY_DEFAULT_THEME } from './defaults';
import { decodeTheme, normalizeTheme } from './normalizeTheme';

describe('normalizeTheme', () => {
  it('moves legacy leaves forward and preserves valid custom colors', () => {
    expect(
      normalizeTheme({
        ...LEGACY_DEFAULT_THEME,
        accent: '#123456',
      }),
    ).toEqual({
      ...DEFAULT_STARLIT_THEME,
      accent: '#123456',
    });
  });

  it('repairs missing and invalid leaves with the provided fallback', () => {
    const fallback = {
      ...DEFAULT_STARLIT_THEME,
      muted: '#fallback-muted',
    };

    expect(
      normalizeTheme(
        {
          accent: '#custom-accent',
          accentText: 42,
          muted: null,
        },
        fallback,
      ),
    ).toEqual({
      ...fallback,
      accent: '#custom-accent',
    });
  });

  it('is total for non-record values', () => {
    expect(normalizeTheme(null)).toEqual(DEFAULT_STARLIT_THEME);
    expect(normalizeTheme([])).toEqual(DEFAULT_STARLIT_THEME);
  });
});

describe('decodeTheme', () => {
  it('preserves a fully valid legacy-equal custom color', () => {
    const stored = {
      ...DEFAULT_STARLIT_THEME,
      accent: '#000000',
    };

    expect(decodeTheme(stored)).toBe(stored);
  });

  it('repairs invalid leaves without translating valid custom colors', () => {
    const fallback = {
      ...DEFAULT_STARLIT_THEME,
      muted: '#fallback-muted',
    };

    expect(
      decodeTheme(
        {
          ...DEFAULT_STARLIT_THEME,
          accent: '#000000',
          muted: null,
        },
        fallback,
      ),
    ).toEqual({
      ...DEFAULT_STARLIT_THEME,
      accent: '#000000',
      muted: '#fallback-muted',
    });
  });
});
