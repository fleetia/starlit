import { themeVars } from '@fleetia/lagrange/theme';

import type { Locale } from '../i18n';
import type { CssVariableStyle, FontFamily, StarlitTheme } from './types';

function getCssVariableName(reference: string): `--${string}` {
  const match = /^var\((--[^,)]+)\)$/.exec(reference);

  if (!match?.[1]) {
    throw new Error(
      `Expected a CSS variable reference, received: ${reference}`,
    );
  }

  return match[1] as `--${string}`;
}

const IBM_PLEX_FONT_FAMILIES: Record<Locale, string> = {
  en: '"IBM Plex Sans", system-ui, sans-serif',
  ja: '"IBM Plex Sans JP", "IBM Plex Sans", system-ui, sans-serif',
  ko: '"IBM Plex Sans KR", "IBM Plex Sans", system-ui, sans-serif',
};

export function getFontFamilyStyle(
  fontFamily: FontFamily,
  locale: Locale,
): CssVariableStyle {
  const resolvedFamily =
    fontFamily === 'system'
      ? 'system-ui, sans-serif'
      : IBM_PLEX_FONT_FAMILIES[locale];

  return {
    fontFamily: resolvedFamily,
    [getCssVariableName(themeVars.semantic.typography.family.display)]:
      resolvedFamily,
    [getCssVariableName(themeVars.semantic.typography.family.ui)]:
      resolvedFamily,
    [getCssVariableName(themeVars.semantic.typography.family.data)]:
      resolvedFamily,
  };
}

export function getThemeStyle(theme: StarlitTheme): CssVariableStyle {
  return {
    [getCssVariableName(themeVars.semantic.color.content.accent)]: theme.accent,
    [getCssVariableName(themeVars.semantic.color.content.onAccent)]:
      theme.accentText,
    [getCssVariableName(themeVars.semantic.color.content.primary)]: theme.text,
    [getCssVariableName(themeVars.semantic.color.content.secondary)]:
      theme.muted,
    [getCssVariableName(themeVars.semantic.color.surface.raised)]:
      theme.surface,
    [getCssVariableName(themeVars.semantic.color.border.strong)]: theme.border,
    [getCssVariableName(themeVars.semantic.color.interaction.primary)]:
      theme.accent,
    [getCssVariableName(themeVars.semantic.color.interaction.primaryHover)]:
      theme.hoverBg,
    '--c-accent': theme.accent,
    '--c-accent-text': theme.accentText,
    '--c-surface': theme.surface,
    '--c-text': theme.text,
    '--c-border': theme.border,
    '--c-hover-bg': theme.hoverBg,
    '--c-hover-text': theme.hoverText,
    '--c-muted': theme.muted,
    '--starlit-hover-background': theme.hoverBg,
    '--starlit-hover-text': theme.hoverText,
  };
}
