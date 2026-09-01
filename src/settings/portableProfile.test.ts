import { describe, expect, it, vi } from 'vitest';

import { getBookmarkIdKey } from '../bookmarks/bookmarkRoute';
import { DEFAULT_GRID_SETTINGS } from '../layout/defaults';
import { DEFAULT_SETTINGS } from './defaults';
import { DEFAULT_STARLIT_THEME } from '../theme/defaults';
import type { ScenePresetV1 } from '../scenes/types';
import {
  getPortableProfileCounts,
  getPortableProfileDiff,
  getPortableProfilePrivacyWarning,
  parsePortableProfileV4,
  planPortableProfileImport,
  type PortableProfileV4,
} from './portableProfile';

function createScene(id = 'scene-1'): ScenePresetV1 {
  return {
    appearance: {
      background: { source: 'none' },
      bookmark: {
        iconLayout: DEFAULT_SETTINGS.iconLayout,
        isExpandView: DEFAULT_SETTINGS.isExpandView,
        isFolderEnabled: DEFAULT_SETTINGS.isFolderEnabled,
        isVisibleOnce: DEFAULT_SETTINGS.isVisibleOnce,
      },
      customCSS: '',
      fontFamily: DEFAULT_SETTINGS.fontFamily,
      gridSettings: DEFAULT_GRID_SETTINGS,
      iconSize: 64,
      size: 16,
      theme: DEFAULT_STARLIT_THEME,
    },
    bookmarkCollection: {
      folderId: 'folder-1',
      folderOwnership: 'scene',
      folderPath: ['Other bookmarks', 'Starlit Scenes', 'Work'],
      groupPreferences: [],
      siblingOrder: {},
    },
    canvas: {
      layers: [{ id: 'bookmarks', kind: 'bookmarks' }],
      version: 2,
    },
    createdAt: 1,
    id,
    name: 'Work',
    updatedAt: 1,
    version: 1,
  };
}

function createProfile(): PortableProfileV4 {
  return {
    bookmarks: {
      'scene-1': {
        children: [
          {
            children: [
              {
                id: 'node:0.0',
                title: 'Starlit',
                url: 'https://github.com/fleetia/starlit',
              },
            ],
            id: 'node:0',
            title: 'Development',
          },
        ],
        rootId: 'root',
      },
    },
    categories: { bookmarkUrls: true, media: false, scenes: true },
    exportedAt: '2026-08-31T00:00:00.000Z',
    globalPreferences: { isOpenInNewTab: true, locale: 'ko' },
    schemaVersion: 4,
    scenes: [createScene()],
  };
}

describe('PortableProfileV4', () => {
  it('parses categories and counts Scene, bookmark, and widget data', () => {
    const input = createProfile();
    input.scenes[0]?.canvas.layers.unshift({
      anchor: 'top-left',
      assetId: 'image-widget',
      frame: { height: 80, offsetX: 10, offsetY: 10, width: 120 },
      id: 'image-widget',
      isHidden: false,
      isLocked: false,
      kind: 'decoration',
      mediaType: 'image',
      name: 'image-widget.png',
      playbackMode: 'active-tab-only',
      playbackRate: 1,
      rotationDeg: 0,
      scale: 1,
    });
    input.scenes[0]?.canvas.layers.push({
      anchor: 'top-right',
      config: { hourCycle: 'locale', showSeconds: false },
      frame: { height: 88, offsetX: 24, offsetY: 24, width: 240 },
      id: 'clock-widget',
      isHidden: false,
      isLocked: false,
      kind: 'widget',
      widgetType: 'clock',
    });
    const profile = parsePortableProfileV4(input);

    expect(getPortableProfileCounts(profile)).toEqual({
      assets: 0,
      bookmarkFolders: 1,
      bookmarkUrls: 1,
      scenes: 1,
      widgets: 2,
    });
  });

  it('rejects malformed and future schemas', () => {
    expect(() =>
      parsePortableProfileV4({ ...createProfile(), schemaVersion: 5 }),
    ).toThrow('Unsupported schemaVersion');
    expect(() =>
      parsePortableProfileV4({
        ...createProfile(),
        categories: { bookmarkUrls: false, media: false, scenes: true },
      }),
    ).toThrow('bookmarks must be omitted');
    expect(() =>
      parsePortableProfileV4({
        ...createProfile(),
        bookmarks: undefined,
        categories: { bookmarkUrls: false, media: true, scenes: false },
        scenes: [],
      }),
    ).toThrow('require the Scene category');
    expect(() =>
      parsePortableProfileV4({
        ...createProfile(),
        bookmarks: {},
      }),
    ).toThrow('bookmarks is missing Scene data: scene-1');
  });

  it('normalizes the original V4 bookmark array shape with synthetic ids', () => {
    const profile = createProfile();
    const parsed = parsePortableProfileV4({
      ...profile,
      bookmarks: {
        'scene-1': [
          {
            children: [
              { title: 'Starlit', url: 'https://github.com/fleetia/starlit' },
            ],
            title: 'Development',
          },
        ],
      },
    });

    expect(parsed.bookmarks?.['scene-1']).toEqual({
      children: [
        {
          children: [
            {
              id: 'node:0.0',
              title: 'Starlit',
              url: 'https://github.com/fleetia/starlit',
            },
          ],
          id: 'node:0',
          title: 'Development',
        },
      ],
      rootId: 'root',
    });
  });

  it('rejects an oversized portable asset before base64 decoding', () => {
    const base = createScene();
    const scene = {
      ...base,
      appearance: {
        ...base.appearance,
        background: {
          assetId: 'background',
          mediaType: 'image' as const,
          source: 'asset' as const,
        },
      },
    };
    const oversizedBase64 = 'A'.repeat(
      Math.ceil((20 * 1024 * 1024) / 3) * 4 + 4,
    );

    expect(() =>
      parsePortableProfileV4({
        ...createProfile(),
        assets: {
          background: {
            dataUrl: `data:image/webp;base64,${oversizedBase64}`,
            id: 'background',
            mediaType: 'image/webp',
            name: 'background.webp',
          },
        },
        bookmarks: undefined,
        categories: { bookmarkUrls: false, media: true, scenes: true },
        scenes: [scene],
      }),
    ).toThrow('exceeds the media size limit');
  });

  it('requires included media to match every Scene asset reference', () => {
    const base = createScene();
    const scene = {
      ...base,
      appearance: {
        ...base.appearance,
        background: {
          assetId: 'background',
          mediaType: 'image' as const,
          source: 'asset' as const,
        },
      },
    };
    const profile = {
      ...createProfile(),
      assets: {
        background: {
          dataUrl: 'data:video/webm;base64,dmlkZW8=',
          id: 'background',
          mediaType: 'video/webm',
          name: 'background.webm',
        },
      },
      bookmarks: undefined,
      categories: { bookmarkUrls: false, media: true, scenes: true },
      scenes: [scene],
    };

    expect(() => parsePortableProfileV4(profile)).toThrow(
      'Scene media type does not match: background',
    );
    expect(() =>
      parsePortableProfileV4({
        ...profile,
        assets: {},
      }),
    ).toThrow('Scene media is missing: background');
    expect(() =>
      parsePortableProfileV4({
        ...profile,
        assets: {
          background: {
            dataUrl: 'data:text/plain;base64,dGV4dA==',
            id: 'background',
            mediaType: 'text/plain',
            name: 'background.txt',
          },
        },
      }),
    ).toThrow('mediaType is unsupported');
  });

  it('builds per-Scene conflict diffs and honors add, replace, and skip', () => {
    const profile = createProfile();
    const existing = [{ ...createScene(), name: 'Existing' }];
    const [diff] = getPortableProfileDiff(profile, existing);

    expect(diff?.changedSections).toContain('identity');
    expect(diff?.bookmarkUrlCount).toBe(1);
    expect(
      planPortableProfileImport(profile, existing, { 'scene-1': 'replace' })[0]
        ?.mode,
    ).toBe('replace');
    expect(
      planPortableProfileImport(profile, existing, { 'scene-1': 'skip' })[0]
        ?.mode,
    ).toBe('skip');
    expect(
      planPortableProfileImport(
        profile,
        existing,
        { 'scene-1': 'add-copy' },
        () => 'scene-copy',
      )[0]?.scene,
    ).toMatchObject({ id: 'scene-copy', name: 'Work (복사본)' });
  });

  it.each([
    ['en', 'Work (copy)'],
    ['ja', 'Work（コピー）'],
  ] as const)(
    'localizes copied Scene names for %s profiles',
    (locale, name) => {
      const base = createProfile();
      const profile = {
        ...base,
        globalPreferences: { ...base.globalPreferences, locale },
      };
      const existing = [{ ...createScene(), name: 'Existing' }];

      const copied = planPortableProfileImport(
        profile,
        existing,
        { 'scene-1': 'add-copy' },
        () => 'scene-copy',
      )[0]?.scene;

      expect(copied?.name).toBe(name);
    },
  );

  it('ignores device bookmark folder metadata when URLs are excluded', () => {
    const existing = {
      ...createScene(),
      bookmarkCollection: {
        ...createScene().bookmarkCollection,
        groupPreferences: [
          { key: getBookmarkIdKey('device-folder'), visible: false },
          { key: 'Bookmarks Bar/Work', visible: true },
        ],
        siblingOrder: {
          [getBookmarkIdKey('device-root')]: [
            getBookmarkIdKey('device-folder'),
          ],
          'Bookmarks Bar': ['Bookmarks Bar/Work'],
        },
      },
    };
    const incoming = {
      ...structuredClone(existing),
      bookmarkCollection: {
        ...structuredClone(existing.bookmarkCollection),
        folderId: null,
        folderOwnership: 'external' as const,
        folderPath: [],
        groupPreferences: [{ key: 'Bookmarks Bar/Work', visible: true }],
        siblingOrder: { 'Bookmarks Bar': ['Bookmarks Bar/Work'] },
      },
    };
    const profile: PortableProfileV4 = {
      categories: { bookmarkUrls: false, media: false, scenes: true },
      exportedAt: '2026-08-31T00:00:00.000Z',
      globalPreferences: { isOpenInNewTab: true, locale: 'ko' },
      schemaVersion: 4,
      scenes: [incoming],
    };

    expect(
      getPortableProfileDiff(profile, [existing])[0]?.changedSections,
    ).not.toContain('bookmarks');

    incoming.bookmarkCollection.groupPreferences[0] = {
      key: 'Bookmarks Bar/Work',
      visible: false,
    };
    expect(
      getPortableProfileDiff(profile, [existing])[0]?.changedSections,
    ).toContain('bookmarks');
  });

  it('fails safely when a copied Scene id cannot be made unique', () => {
    const profile = createProfile();
    const existing = [{ ...createScene(), name: 'Existing' }];
    const createId = vi.fn(() => 'scene-1');

    expect(() =>
      planPortableProfileImport(
        profile,
        existing,
        { 'scene-1': 'add-copy' },
        createId,
      ),
    ).toThrow('Could not create a unique copied Scene id.');
    expect(createId).toHaveBeenCalledTimes(100);
  });

  it('warns only when sensitive URL or media categories are included', () => {
    expect(
      getPortableProfilePrivacyWarning({
        bookmarkUrls: true,
        media: true,
        scenes: true,
      }),
    ).toBe('bookmarks-and-media');
    expect(
      getPortableProfilePrivacyWarning({
        bookmarkUrls: false,
        media: false,
        scenes: true,
      }),
    ).toBeNull();
  });
});
