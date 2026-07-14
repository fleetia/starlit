import type { BookmarkSeed, ProfileSeed } from './extension.fixture';

const directBookmarks: BookmarkSeed[] = Array.from(
  { length: 18 },
  (_, index) => ({
    title: `Atlas ${String(index + 1).padStart(2, '0')}`,
    url: `https://example.com/atlas-${index + 1}`,
  }),
);

export const BOOKMARK_ROOTS: BookmarkSeed[][] = [
  [
    {
      children: [
        {
          children: [
            { title: 'Lagrange docs', url: 'https://example.com/lagrange' },
            {
              children: [
                { title: 'Deep note', url: 'https://example.com/deep-note' },
              ],
              title: 'Deep archive',
            },
          ],
          title: 'Design systems',
        },
      ],
      title: 'Projects',
    },
    ...directBookmarks,
  ],
  [
    { title: 'Reading one', url: 'https://example.com/reading-one' },
    { title: 'Reading two', url: 'https://example.com/reading-two' },
  ],
];

export const LEGACY_GRID_SETTINGS = {
  background: {
    border: '1px solid black',
    color: 'rgba(255, 255, 255, 0.8)',
    text: 'black',
  },
  columns: 5,
  gap: '2rem',
  heading: {
    borderColor: '#000000',
    borderEnabled: false,
    borderWidth: 1,
    subtitleColor: '#999999',
    subtitleHoverColor: '#000000',
    titleColor: '#000000',
  },
  horizontalColumns: 1,
  icon: {
    border: '1px solid black',
    color: 'white',
    text: 'black',
  },
  margin: { bottom: 0, left: 0, right: 0, top: 0 },
  position: 'center-center',
  rows: 3,
};

export const LEGACY_THEME = {
  accent: '#1456a0',
  accentText: '#ffffff',
  border: '#000000',
  hoverBg: '#000000',
  hoverText: '#ffffff',
  muted: '#999999',
  surface: '#ffffff',
  text: '#000000',
};

export function createProfileSeed(
  sync: Record<string, unknown> = {},
): ProfileSeed {
  return {
    bookmarkRoots: BOOKMARK_ROOTS,
    local: {
      bookmarks: [{ title: 'Local V1 backup' }],
    },
    sync,
  };
}
