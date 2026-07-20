import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_STARLIT_THEME } from '../theme/defaults';
import type { StarlitTheme } from '../theme/types';
import { themePresets, useTheme } from './useTheme';

type ThemeUpdate = StarlitTheme | ((previous: StarlitTheme) => StarlitTheme);

const storageState = vi.hoisted(() => ({
  colorTheme: null as unknown,
  setColorTheme: vi.fn<(theme: ThemeUpdate) => Promise<void>>(),
}));

vi.mock('../hooks/useStorageState', () => ({
  useStorageState: (
    _key: string,
    fallback: StarlitTheme,
    decode: (value: unknown, fallback: StarlitTheme) => StarlitTheme,
  ) => ({
    isLoaded: true,
    setValue: storageState.setColorTheme,
    value: decode(storageState.colorTheme, fallback),
  }),
}));

beforeEach((): void => {
  storageState.colorTheme = structuredClone(DEFAULT_STARLIT_THEME);
  storageState.setColorTheme.mockResolvedValue(undefined);
});

describe('useTheme', () => {
  it('keeps a persisted black accent as a current customization', () => {
    storageState.colorTheme = {
      ...DEFAULT_STARLIT_THEME,
      accent: '#000000',
    };

    const { result } = renderHook(() => useTheme());

    expect(result.current.colorTheme.accent).toBe('#000000');
  });

  it('updates one slot without dropping the remaining persisted theme', async () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.isLoaded).toBe(true);

    await act(async (): Promise<void> => {
      await result.current.updateTheme('accent', '#ff0000');
    });

    const update = storageState.setColorTheme.mock.calls[0]?.[0];

    expect(typeof update).toBe('function');
    expect(
      typeof update === 'function' ? update(DEFAULT_STARLIT_THEME) : update,
    ).toEqual({
      ...DEFAULT_STARLIT_THEME,
      accent: '#ff0000',
    });
  });

  it('applies a complete preset and restores the Lagrange default', async () => {
    const preset: StarlitTheme = {
      accent: '#111111',
      accentText: '#222222',
      border: '#333333',
      hoverBg: '#444444',
      hoverText: '#555555',
      muted: '#666666',
      surface: '#777777',
      text: '#888888',
    };
    const { result } = renderHook(() => useTheme());

    await act(async (): Promise<void> => {
      await result.current.applyPreset(preset);
      await result.current.resetTheme();
    });

    expect(storageState.setColorTheme).toHaveBeenNthCalledWith(1, preset);
    expect(storageState.setColorTheme).toHaveBeenNthCalledWith(
      2,
      themePresets.light,
    );
    expect(themePresets.light).toEqual(DEFAULT_STARLIT_THEME);
  });
});
