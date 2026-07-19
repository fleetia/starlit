import { primitiveTokens } from '@fleetia/lagrange/theme';

import type { FontFamily, StarlitTheme } from './types';

export const DEFAULT_FONT_FAMILY: FontFamily = 'ibm-plex-sans';

export const LEGACY_DEFAULT_THEME: StarlitTheme = {
  accent: '#000000',
  accentText: '#ffffff',
  surface: '#ffffff',
  text: '#000000',
  border: '#000000',
  hoverBg: '#000000',
  hoverText: '#ffffff',
  muted: '#999999',
};

export const DEFAULT_STARLIT_THEME: StarlitTheme = {
  accent: primitiveTokens.palette.aubergine,
  accentText: primitiveTokens.palette.paperRaised,
  surface: primitiveTokens.palette.paperRaised,
  text: primitiveTokens.palette.ink,
  border: primitiveTokens.palette.rule,
  hoverBg: primitiveTokens.palette.periwinkleWash,
  hoverText: primitiveTokens.palette.aubergine,
  muted: primitiveTokens.palette.inkMuted,
};
