import { describe, expect, it } from 'vitest';

import {
  DEFAULT_GRID_SETTINGS,
  LEGACY_DEFAULT_GRID_SETTINGS,
} from './defaults';
import {
  decodeGridSettings,
  normalizeGridSettings,
} from './normalizeGridSettings';

describe('normalizeGridSettings', () => {
  it('moves legacy defaults forward while preserving valid custom leaves', () => {
    expect(
      normalizeGridSettings({
        ...LEGACY_DEFAULT_GRID_SETTINGS,
        gap: '2rem',
      }),
    ).toEqual({
      ...DEFAULT_GRID_SETTINGS,
      gap: '2rem',
    });
  });

  it('falls back when a normalized candidate is not a complete valid shape', () => {
    const fallback = {
      ...DEFAULT_GRID_SETTINGS,
      columns: 7,
    };

    expect(
      normalizeGridSettings(
        {
          ...DEFAULT_GRID_SETTINGS,
          masonryColumns: Number.NaN,
          position: 'invalid-placement',
        },
        fallback,
      ),
    ).toBe(fallback);
  });

  it('returns a complete fallback shape for non-record values', () => {
    expect(normalizeGridSettings(null)).toEqual(DEFAULT_GRID_SETTINGS);
    expect(normalizeGridSettings([])).toEqual(DEFAULT_GRID_SETTINGS);
  });
});

describe('decodeGridSettings', () => {
  it('preserves a fully valid legacy-equal custom gap', () => {
    const stored = {
      ...DEFAULT_GRID_SETTINGS,
      gap: '1em',
    };

    expect(decodeGridSettings(stored)).toBe(stored);
  });

  it('repairs invalid leaves without translating valid custom leaves', () => {
    const fallback = {
      ...DEFAULT_GRID_SETTINGS,
      cardGap: '3rem',
    };

    expect(
      decodeGridSettings(
        {
          ...DEFAULT_GRID_SETTINGS,
          gap: '1em',
          cardGap: null,
        },
        fallback,
      ),
    ).toEqual({
      ...DEFAULT_GRID_SETTINGS,
      gap: '1em',
      cardGap: '3rem',
    });
  });
});
