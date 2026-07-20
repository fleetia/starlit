import { DEFAULT_STARLIT_THEME, LEGACY_DEFAULT_THEME } from './defaults';
import type { StarlitTheme } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveThemeLeaf(
  value: unknown,
  legacyDefault: string,
  fallback: string,
  translateLegacyDefaults: boolean,
): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  return translateLegacyDefaults && value === legacyDefault ? fallback : value;
}

export function isStarlitTheme(value: unknown): value is StarlitTheme {
  return (
    isRecord(value) &&
    typeof value.accent === 'string' &&
    typeof value.accentText === 'string' &&
    typeof value.surface === 'string' &&
    typeof value.text === 'string' &&
    typeof value.border === 'string' &&
    typeof value.hoverBg === 'string' &&
    typeof value.hoverText === 'string' &&
    typeof value.muted === 'string'
  );
}

function resolveTheme(
  value: unknown,
  fallback: StarlitTheme,
  translateLegacyDefaults: boolean,
): StarlitTheme {
  const stored = isRecord(value) ? value : {};

  return {
    accent: resolveThemeLeaf(
      stored.accent,
      LEGACY_DEFAULT_THEME.accent,
      fallback.accent,
      translateLegacyDefaults,
    ),
    accentText: resolveThemeLeaf(
      stored.accentText,
      LEGACY_DEFAULT_THEME.accentText,
      fallback.accentText,
      translateLegacyDefaults,
    ),
    border: resolveThemeLeaf(
      stored.border,
      LEGACY_DEFAULT_THEME.border,
      fallback.border,
      translateLegacyDefaults,
    ),
    hoverBg: resolveThemeLeaf(
      stored.hoverBg,
      LEGACY_DEFAULT_THEME.hoverBg,
      fallback.hoverBg,
      translateLegacyDefaults,
    ),
    hoverText: resolveThemeLeaf(
      stored.hoverText,
      LEGACY_DEFAULT_THEME.hoverText,
      fallback.hoverText,
      translateLegacyDefaults,
    ),
    muted: resolveThemeLeaf(
      stored.muted,
      LEGACY_DEFAULT_THEME.muted,
      fallback.muted,
      translateLegacyDefaults,
    ),
    surface: resolveThemeLeaf(
      stored.surface,
      LEGACY_DEFAULT_THEME.surface,
      fallback.surface,
      translateLegacyDefaults,
    ),
    text: resolveThemeLeaf(
      stored.text,
      LEGACY_DEFAULT_THEME.text,
      fallback.text,
      translateLegacyDefaults,
    ),
  };
}

export function normalizeTheme(
  value: unknown,
  fallback: StarlitTheme = DEFAULT_STARLIT_THEME,
): StarlitTheme {
  return resolveTheme(value, fallback, true);
}

export function decodeTheme(
  value: unknown,
  fallback: StarlitTheme = DEFAULT_STARLIT_THEME,
): StarlitTheme {
  return isStarlitTheme(value) ? value : resolveTheme(value, fallback, false);
}
