import type { Bookmark } from './types';

export const DEFAULT_BOOKMARKS: Bookmark[] = [
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
];
