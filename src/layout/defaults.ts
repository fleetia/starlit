import { primitiveTokens } from '@fleetia/lagrange/theme';

import type { GridSettings } from './types';

export const LEGACY_DEFAULT_GRID_SETTINGS: GridSettings = {
  columns: 5,
  horizontalColumns: 1,
  rows: 3,
  gap: '1em',
  position: 'center-center',
  margin: { top: 0, bottom: 0, left: 0, right: 0 },
  background: {
    color: 'rgba(255, 255, 255, 0.8)',
    border: '1px solid black',
    text: 'black',
    gridImage: undefined,
  },
  icon: {
    color: 'white',
    border: '1px solid black',
    text: 'black',
  },
  heading: {
    titleColor: '#000000',
    subtitleColor: '#999999',
    borderEnabled: false,
    borderWidth: 1,
    borderColor: '#000000',
    subtitleHoverColor: '#000000',
  },
};

export const DEFAULT_GRID_SETTINGS: GridSettings = {
  ...LEGACY_DEFAULT_GRID_SETTINGS,
  gap: '0.5rem',
  cardGap: '1rem',
  background: {
    color: 'rgba(250, 246, 233, 0.94)',
    border: `1px solid ${primitiveTokens.palette.rule}`,
    text: primitiveTokens.palette.ink,
    gridImage: undefined,
  },
  icon: {
    color: primitiveTokens.palette.paperRaised,
    border: `1px solid ${primitiveTokens.palette.ruleMuted}`,
    text: primitiveTokens.palette.ink,
    borderRadius: 1,
    iconRadius: 1,
  },
  heading: {
    titleBackgroundColor: primitiveTokens.palette.periwinkleWash,
    titleColor: primitiveTokens.palette.aubergine,
    subtitleColor: primitiveTokens.palette.inkMuted,
    borderEnabled: false,
    borderWidth: 1,
    borderColor: primitiveTokens.palette.rule,
    subtitleHoverColor: primitiveTokens.palette.aubergine,
    borderRadius: 1,
  },
  folder: {
    color: primitiveTokens.palette.paperMuted,
    accent: primitiveTokens.palette.olive,
    accentText: primitiveTokens.palette.paperRaised,
    text: primitiveTokens.palette.ink,
    border: primitiveTokens.palette.rule,
  },
};
