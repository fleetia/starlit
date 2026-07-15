import { primitiveTokens } from '@fleetia/lagrange/theme';

import type { GridSettings, OptionsType, StarlitTheme } from './types';

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

export const defaultOptionValue: OptionsType = {
  bookmarks: [
    {
      title: 'default',
      description: 'default list',
      list: [
        {
          id: '000',
          title: 'Buy me a coffee',
          url: 'https://coff.ee/starlight.space',
          favicon:
            'https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://buymeacoffee.com&size=32',
        },
      ],
    },
  ],
  gridSettings: DEFAULT_GRID_SETTINGS,
  settings: {
    isFolderEnabled: true,
    isVisibleOnce: false,
    isOpenInNewTab: false,
    isExpandView: false,
  },
  colorTheme: DEFAULT_STARLIT_THEME,
  iconSize: 28,
  size: 16,
};
