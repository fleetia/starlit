import type { CSSProperties } from 'react';
import { themeVars } from '@fleetia/lagrange/theme';

import type { Locale } from '../i18n';
import type { FontFamily, GridSettings, StarlitTheme } from '../newtab/types';

export type CssVariableStyle = CSSProperties &
  Record<`--${string}`, string | number | undefined>;

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

export function getLayoutStyle(
  gridSettings: GridSettings,
  size: number,
  iconSize: number,
): CssVariableStyle {
  const { background, folder, heading, icon, margin } = gridSettings;

  return {
    '--em': `${size}px`,
    '--icon-size': `${iconSize}px`,
    '--gap': gridSettings.gap,
    '--card-gap': gridSettings.cardGap ?? '1rem',
    '--position': gridSettings.position,
    '--background-color': background.color,
    '--background-border': background.border,
    '--background-text': background.text,
    '--background-gridImage': background.gridImage,
    '--icon-color': icon.color,
    '--icon-border': icon.border,
    '--icon-text': icon.text,
    '--icon-border-radius': `${icon.borderRadius ?? 1}px`,
    '--icon-icon-radius': `${icon.iconRadius ?? 1}px`,
    '--icon-borderRadius': `${icon.borderRadius ?? 1}px`,
    '--icon-iconRadius': `${icon.iconRadius ?? 1}px`,
    '--icon-width': `${size * (icon.width ?? 4)}px`,
    '--icon-height': `${size * (icon.height ?? 4)}px`,
    '--masonry-card-width': `calc(var(--em) * ${gridSettings.columns} * ${icon.width ?? 4} + var(--gap) * ${Math.max(0, gridSettings.columns - 1)} + var(--gap) * 2)`,
    '--heading-title-color': heading?.titleColor,
    '--heading-title-background-color': heading?.titleBackgroundColor,
    '--heading-title-size': heading?.titleSize
      ? `${heading.titleSize}px`
      : undefined,
    '--heading-subtitle-color': heading?.subtitleColor,
    '--heading-subtitle-size': heading?.subtitleSize
      ? `${heading.subtitleSize}px`
      : undefined,
    '--heading-subtitle-hover-color': heading?.subtitleHoverColor,
    '--heading-text-stroke': heading?.borderEnabled
      ? `${heading.borderWidth}px ${heading.borderColor}`
      : '0 transparent',
    '--container-border-radius': `${heading?.borderRadius ?? 1}px`,
    '--folder-color': folder?.color,
    '--folder-accent': folder?.accent,
    '--folder-accent-text': folder?.accentText,
    '--folder-text': folder?.text,
    '--folder-border': folder?.border,
    '--grid-margin-top': `${margin?.top ?? 0}px`,
    '--grid-margin-bottom': `${margin?.bottom ?? 0}px`,
    '--grid-margin-left': `${margin?.left ?? 0}px`,
    '--grid-margin-right': `${margin?.right ?? 0}px`,
  };
}
