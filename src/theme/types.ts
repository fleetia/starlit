import type { CSSProperties } from 'react';

export type CssVariableStyle = CSSProperties &
  Record<`--${string}`, string | number | undefined>;

export type FontFamily = 'ibm-plex-sans' | 'system';

export type StarlitTheme = {
  accent: string;
  accentText: string;
  surface: string;
  text: string;
  border: string;
  hoverBg: string;
  hoverText: string;
  muted: string;
};
