import { describe, expect, it } from 'vitest';

import { DEFAULT_GRID_SETTINGS } from '../layout/defaults';
import { DEFAULT_STARLIT_THEME } from '../theme/defaults';
import { migrateLegacySceneCollection } from './migration';
import type { LegacySceneMigrationInput } from './migration';

function createLegacyInput(): LegacySceneMigrationInput {
  return {
    backgroundMeta: { source: 'file', type: 'video', url: '' },
    bookmarkTreePrefs: {
      rootId: 'existing-root',
      rootPath: ['Work'],
      siblingOrder: { Work: ['One', 'Two'] },
    },
    colorTheme: { ...DEFAULT_STARLIT_THEME },
    customCSS: '.starlit-main { opacity: 0.9; }',
    gridSettings: structuredClone(DEFAULT_GRID_SETTINGS),
    groupPreferences: [{ key: 'Work', visible: true }],
    iconSize: 30,
    overlayScene: {
      layers: [
        {
          anchor: 'bottom-right',
          height: 100,
          id: 'moon-media',
          kind: 'image',
          name: 'Moon',
          offsetX: 20,
          offsetY: 30,
          rotationDeg: 15,
          width: 120,
        },
        { kind: 'bookmarks' },
      ],
    },
    settings: {
      fontFamily: 'system',
      iconLayout: 'horizontal',
      isExpandView: true,
      isFolderEnabled: true,
      isOpenInNewTab: true,
      isVisibleOnce: false,
    },
    size: 18,
  };
}

describe('legacy scene migration', () => {
  it('preserves canvas order and links the existing bookmark root without copying it', () => {
    const collection = migrateLegacySceneCollection(createLegacyInput(), {
      id: 'legacy-scene',
      name: 'Current setup',
      now: 1_000,
    });
    const scene = collection.scenes[0];

    expect(collection.activeSceneId).toBe('legacy-scene');
    expect(scene?.bookmarkCollection).toEqual({
      folderId: 'existing-root',
      folderOwnership: 'external',
      folderPath: ['Work'],
      groupPreferences: [{ key: 'Work', visible: true }],
      siblingOrder: { Work: ['One', 'Two'] },
    });
    expect(scene?.canvas.layers).toEqual([
      {
        anchor: 'bottom-right',
        assetId: 'moon-media',
        frame: { height: 100, offsetX: 20, offsetY: 30, width: 120 },
        id: 'moon-media',
        isHidden: false,
        isLocked: false,
        kind: 'decoration',
        mediaType: 'image',
        name: 'Moon',
        playbackMode: 'active-tab-only',
        playbackRate: 1,
        rotationDeg: 15,
        scale: 1,
      },
      { id: 'bookmarks', kind: 'bookmarks' },
    ]);
  });

  it('keeps file backgrounds as asset references and excludes global open behavior', () => {
    const scene = migrateLegacySceneCollection(createLegacyInput(), {
      backgroundAssetId: 'shared-background',
      id: 'legacy-scene',
      name: 'Current setup',
      now: 1_000,
    }).scenes[0];

    expect(scene?.appearance.background).toEqual({
      assetId: 'shared-background',
      mediaType: 'video',
      source: 'asset',
    });
    expect(scene?.appearance.bookmark).not.toHaveProperty('isOpenInNewTab');
  });

  it('preserves v1 overlay motion and editing state when it is available', () => {
    const input = createLegacyInput();
    const image = input.overlayScene as {
      layers: Array<Record<string, unknown>>;
    };
    Object.assign(image.layers[0] ?? {}, {
      groupId: 'night-sky',
      hidden: true,
      locked: true,
      mediaKind: 'motion',
      playbackMode: 'always',
      playbackRate: 1.5,
    });

    const scene = migrateLegacySceneCollection(input, {
      id: 'legacy-scene',
      name: 'Current setup',
      now: 1_000,
    }).scenes[0];

    expect(scene?.canvas.layers[0]).toMatchObject({
      groupId: 'night-sky',
      isHidden: true,
      isLocked: true,
      mediaType: 'video',
      playbackMode: 'always',
      playbackRate: 1.5,
    });
  });

  it('recovers a malformed legacy overlay as a bookmark-only canvas', () => {
    const input = createLegacyInput();
    input.overlayScene = { layers: [{ kind: 'unknown' }] };

    const scene = migrateLegacySceneCollection(input, {
      id: 'legacy-scene',
      name: 'Current setup',
      now: 1_000,
    }).scenes[0];

    expect(scene?.canvas.layers).toEqual([
      { id: 'bookmarks', kind: 'bookmarks' },
    ]);
  });
});
