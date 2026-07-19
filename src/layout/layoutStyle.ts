import type { CssVariableStyle } from '../theme/types';
import type { GridSettings } from './types';

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
