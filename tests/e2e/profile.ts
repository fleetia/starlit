import type { BookmarkSeed, ProfileSeed } from './extension.fixture';
import type { Placement } from '../../src/layout/types';

type ExpandedColumnsProfileSeedOptions = {
  groupCount?: number;
  masonryColumns?: number;
  position?: Placement;
};

const directBookmarks: BookmarkSeed[] = Array.from(
  { length: 18 },
  (_, index) => ({
    title: `Atlas ${String(index + 1).padStart(2, '0')}`,
    url: `https://example.com/atlas-${index + 1}`,
  }),
);

const expandedColumnGroups: BookmarkSeed[] = Array.from(
  { length: 9 },
  (_, index) => {
    const groupNumber = String(index + 1).padStart(2, '0');

    return {
      children: [
        {
          title: `Entry ${groupNumber}`,
          url: `https://example.com/entry-${index + 1}`,
        },
      ],
      title: `Group ${groupNumber}`,
    };
  },
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
    sync: {
      bookmarkTreePrefs: {
        rootPath: ['Bookmarks Bar'],
        siblingOrder: {},
      },
      ...sync,
    },
  };
}

export function createExpandedColumnsProfileSeed(
  options: ExpandedColumnsProfileSeedOptions = {},
): ProfileSeed {
  const {
    groupCount = expandedColumnGroups.length,
    masonryColumns = 2,
    position = 'center-center',
  } = options;

  return {
    bookmarkRoots: [expandedColumnGroups.slice(0, groupCount)],
    sync: {
      bookmarkTreePrefs: {
        rootPath: ['Bookmarks Bar'],
        siblingOrder: {},
      },
      gridSettings: {
        ...LEGACY_GRID_SETTINGS,
        cardGap: '1rem',
        masonryColumns,
        position,
      },
      locale: 'en',
      settings: {
        fontFamily: 'ibm-plex-sans',
        iconLayout: 'horizontal',
        isExpandView: true,
        isFolderEnabled: true,
        isOpenInNewTab: false,
        isVisibleOnce: false,
      },
      storageSchemaVersion: 2,
    },
  };
}
