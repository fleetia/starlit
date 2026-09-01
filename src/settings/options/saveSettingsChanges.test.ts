import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_GRID_SETTINGS } from '../../layout/defaults';
import { DEFAULT_OVERLAY_SCENE } from '../../overlays/model';
import { DEFAULT_SETTINGS } from '../defaults';
import { DEFAULT_STARLIT_THEME } from '../../theme/defaults';
import type { BackgroundSnapshot } from '../useBackgroundImage';
import type { SettingsSnapshot } from './types';
import { saveSettingsChanges } from './saveSettingsChanges';

function resolvedMock<Arguments extends unknown[] = []>(): ReturnType<
  typeof vi.fn<(...arguments_: Arguments) => Promise<void>>
> {
  return vi
    .fn<(...arguments_: Arguments) => Promise<void>>()
    .mockResolvedValue();
}

function createSnapshot(): SettingsSnapshot {
  return {
    customCSS: '',
    gridSettings: structuredClone(DEFAULT_GRID_SETTINGS),
    groupPreferences: [],
    iconSize: 28,
    locale: 'en',
    overlayScene: structuredClone(DEFAULT_OVERLAY_SCENE),
    rootPath: [],
    settings: structuredClone(DEFAULT_SETTINGS),
    siblingOrder: {},
    size: 16,
    theme: structuredClone(DEFAULT_STARLIT_THEME),
  };
}

describe('saveSettingsChanges', () => {
  it('rolls settings and background back when the active Scene commit fails', async () => {
    const snapshot = createSnapshot();
    const backgroundSnapshot: BackgroundSnapshot = {
      media: new Blob(['old'], { type: 'image/webp' }),
      meta: { source: 'file', type: 'image', url: '' },
    };
    const onBackgroundRestore = resolvedMock<[BackgroundSnapshot]>();
    const onBackgroundSnapshot = vi
      .fn<() => Promise<BackgroundSnapshot>>()
      .mockResolvedValue(backgroundSnapshot);
    const onBackgroundUrl = resolvedMock<[string]>();
    const onSettingsUpdate = resolvedMock<[typeof DEFAULT_SETTINGS]>();
    const afterSave = vi
      .fn<() => Promise<void>>()
      .mockRejectedValue(new Error('Scene commit failed'));

    await expect(
      saveSettingsChanges({
        afterSave,
        callbacks: {
          onBackgroundClear: resolvedMock(),
          onBackgroundFile: resolvedMock<[File]>(),
          onBackgroundRestore,
          onBackgroundSnapshot,
          onBackgroundUrl,
          onBookmarkTreePreferencesUpdate: resolvedMock(),
          onCustomCSSChange: resolvedMock<[string]>(),
          onGridSettingsUpdate: resolvedMock(),
          onGroupPreferencesUpdate: resolvedMock(),
          onIconSizeChange: resolvedMock<[number]>(),
          onLocaleChange: resolvedMock(),
          onOverlaySceneUpdate: resolvedMock(),
          onSettingsUpdate,
          onSizeChange: resolvedMock<[number]>(),
          onThemePreset: resolvedMock(),
        },
        draft: {
          ...structuredClone(snapshot),
          background: {
            kind: 'url',
            url: 'https://example.com/new-background.webp',
          },
          settings: { ...snapshot.settings, isOpenInNewTab: true },
        },
        preparedOverlayImageIds: [],
        snapshot,
      }),
    ).rejects.toThrow('Scene commit failed');

    expect(onBackgroundSnapshot).toHaveBeenCalledOnce();
    expect(onBackgroundUrl).toHaveBeenCalledWith(
      'https://example.com/new-background.webp',
    );
    expect(afterSave).toHaveBeenCalledOnce();
    expect(onBackgroundRestore).toHaveBeenCalledWith(backgroundSnapshot);
    expect(onSettingsUpdate).toHaveBeenNthCalledWith(1, {
      ...DEFAULT_SETTINGS,
      isOpenInNewTab: true,
    });
    expect(onSettingsUpdate).toHaveBeenNthCalledWith(2, DEFAULT_SETTINGS);
  });

  it('rolls the overlay back when its write rejects after changing storage', async () => {
    const snapshot = createSnapshot();
    const draftOverlayScene = structuredClone(snapshot.overlayScene);
    const image = draftOverlayScene.layers.find(
      (layer) => layer.kind === 'image',
    );
    if (!image) throw new Error('Expected a default overlay image.');
    image.offsetX += 10;
    let storedOverlayScene = structuredClone(snapshot.overlayScene);
    let shouldReject = true;
    const onOverlaySceneUpdate = vi.fn<
      (scene: SettingsSnapshot['overlayScene']) => Promise<void>
    >(async (scene): Promise<void> => {
      storedOverlayScene = structuredClone(scene);
      if (shouldReject) {
        shouldReject = false;
        throw new Error('overlay write failed');
      }
    });

    await expect(
      saveSettingsChanges({
        callbacks: {
          onBackgroundClear: resolvedMock(),
          onBackgroundFile: resolvedMock<[File]>(),
          onBackgroundRestore: resolvedMock<[BackgroundSnapshot]>(),
          onBackgroundSnapshot: vi
            .fn<() => Promise<BackgroundSnapshot>>()
            .mockRejectedValue(new Error('unexpected background snapshot')),
          onBackgroundUrl: resolvedMock<[string]>(),
          onBookmarkTreePreferencesUpdate: resolvedMock(),
          onCustomCSSChange: resolvedMock<[string]>(),
          onGridSettingsUpdate: resolvedMock(),
          onGroupPreferencesUpdate: resolvedMock(),
          onIconSizeChange: resolvedMock<[number]>(),
          onLocaleChange: resolvedMock(),
          onOverlaySceneUpdate,
          onSettingsUpdate: resolvedMock(),
          onSizeChange: resolvedMock<[number]>(),
          onThemePreset: resolvedMock(),
        },
        draft: {
          ...structuredClone(snapshot),
          background: null,
          overlayScene: draftOverlayScene,
        },
        preparedOverlayImageIds: [],
        snapshot,
      }),
    ).rejects.toThrow('overlay write failed');

    expect(onOverlaySceneUpdate).toHaveBeenNthCalledWith(1, draftOverlayScene);
    expect(onOverlaySceneUpdate).toHaveBeenNthCalledWith(
      2,
      snapshot.overlayScene,
    );
    expect(storedOverlayScene).toEqual(snapshot.overlayScene);
  });
});
