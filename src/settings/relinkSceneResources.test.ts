import { describe, expect, it, vi } from 'vitest';

import type { SharedAssetRecord } from '../platform/storage/indexedDbRecords';
import { createSceneFixture } from '../scenes/testFixtures';
import type { ScenePresetV1 } from '../scenes/types';
import {
  relinkSceneResources,
  type RelinkSceneResourcesDependencies,
} from './relinkSceneResources';

function createDependencies(): RelinkSceneResourcesDependencies & {
  deleted: string[];
  saved: SharedAssetRecord[];
} {
  const saved: SharedAssetRecord[] = [];
  const deleted: string[] = [];
  return {
    createId: vi.fn().mockReturnValueOnce('replacement'),
    deleteAsset: vi.fn(async (assetId) => {
      deleted.push(assetId);
    }),
    deleted,
    loadAsset: vi.fn(async () => null),
    now: vi.fn(() => new Date('2026-09-01T00:00:00.000Z')),
    processFile: vi.fn(async () => ({
      blob: new Blob(['replacement'], { type: 'image/webp' }),
      height: 80,
      mediaKind: 'static' as const,
      width: 120,
    })),
    saveAsset: vi.fn(async (asset) => {
      saved.push(asset);
    }),
    saved,
  };
}

function createSceneWithMissingAsset(): ScenePresetV1 {
  const scene = createSceneFixture();
  return createSceneFixture({
    appearance: {
      ...scene.appearance,
      background: {
        assetId: 'missing-background',
        mediaType: 'image',
        source: 'asset',
      },
    },
  });
}

describe('relinkSceneResources', () => {
  it('processes replacement media and relinks it with a selected folder', async () => {
    const dependencies = createDependencies();
    const relink = vi.fn(async (): Promise<void> => undefined);
    const file = new File(['image'], 'replacement.png', { type: 'image/png' });

    await relinkSceneResources(
      {
        assetFiles: { 'missing-background': file },
        folder: { id: 'replacement-folder', path: ['Replacement'] },
        relink,
        scene: createSceneWithMissingAsset(),
      },
      dependencies,
    );

    expect(dependencies.saved).toEqual([
      expect.objectContaining({
        createdAt: '2026-09-01T00:00:00.000Z',
        id: 'scene-asset:replacement',
        mediaType: 'image/webp',
        name: 'replacement.png',
      }),
    ]);
    expect(relink).toHaveBeenCalledWith({
      assetIds: { 'missing-background': 'scene-asset:replacement' },
      folder: { id: 'replacement-folder', path: ['Replacement'] },
    });
    expect(dependencies.deleted).toEqual([]);
  });

  it('rejects a mismatched replacement before saving it', async () => {
    const dependencies = createDependencies();
    dependencies.processFile = vi.fn(async () => ({
      blob: new Blob(['video'], { type: 'video/webm' }),
      height: 80,
      mediaKind: 'motion' as const,
      width: 120,
    }));

    await expect(
      relinkSceneResources(
        {
          assetFiles: {
            'missing-background': new File(['video'], 'replacement.webm', {
              type: 'video/webm',
            }),
          },
          relink: vi.fn(),
          scene: createSceneWithMissingAsset(),
        },
        dependencies,
      ),
    ).rejects.toThrow('Replacement media type does not match');

    expect(dependencies.saved).toEqual([]);
  });

  it('deletes prepared assets when the Scene reference update fails', async () => {
    const dependencies = createDependencies();

    await expect(
      relinkSceneResources(
        {
          assetFiles: {
            'missing-background': new File(['image'], 'replacement.png', {
              type: 'image/png',
            }),
          },
          relink: vi.fn(async () => {
            throw new Error('Scene commit failed');
          }),
          scene: createSceneWithMissingAsset(),
        },
        dependencies,
      ),
    ).rejects.toThrow('Scene commit failed');

    expect(dependencies.deleted).toEqual(['scene-asset:replacement']);
  });

  it('deletes an asset when persistence mutates before rejecting', async () => {
    const dependencies = createDependencies();
    dependencies.saveAsset = vi.fn(async (asset) => {
      dependencies.saved.push(asset);
      throw new Error('Asset transaction rejected after write');
    });

    await expect(
      relinkSceneResources(
        {
          assetFiles: {
            'missing-background': new File(['image'], 'replacement.png', {
              type: 'image/png',
            }),
          },
          relink: vi.fn(),
          scene: createSceneWithMissingAsset(),
        },
        dependencies,
      ),
    ).rejects.toThrow('Asset transaction rejected after write');

    expect(dependencies.saved).toEqual([
      expect.objectContaining({ id: 'scene-asset:replacement' }),
    ]);
    expect(dependencies.deleted).toEqual(['scene-asset:replacement']);
  });
});
