import { describe, expect, it } from 'vitest';

import { getSceneReadiness } from './readiness';
import { createSceneFixture } from './testFixtures';

describe('scene readiness', () => {
  it('blocks apply and reports relink when a folder or asset is missing', () => {
    const scene = createSceneFixture({
      appearance: {
        ...createSceneFixture().appearance,
        background: {
          assetId: 'background-asset',
          mediaType: 'video',
          source: 'asset',
        },
      },
      canvas: {
        layers: [
          { id: 'bookmarks', kind: 'bookmarks' },
          {
            anchor: 'bottom-right',
            assetId: 'decoration-asset',
            frame: { height: 100, offsetX: 10, offsetY: 20, width: 100 },
            id: 'moon',
            isHidden: false,
            isLocked: false,
            kind: 'decoration',
            mediaType: 'image',
            name: 'Moon',
            playbackMode: 'active-tab-only',
            playbackRate: 1,
            rotationDeg: 0,
            scale: 1,
          },
        ],
        version: 2,
      },
    });

    expect(
      getSceneReadiness(scene, {
        assetIds: new Set(),
        folderIds: new Set(),
      }),
    ).toEqual({
      availableActions: ['relink'],
      canRestore: false,
      isReady: false,
      issues: [
        { kind: 'bookmark-folder', resourceId: 'scene-folder' },
        {
          kind: 'asset',
          resourceId: 'background-asset',
          usages: ['background'],
        },
        {
          kind: 'asset',
          resourceId: 'decoration-asset',
          usages: ['decoration:moon'],
        },
      ],
    });
  });

  it('offers restore only when every missing resource is recoverable', () => {
    const base = createSceneFixture();
    const scene = createSceneFixture({
      bookmarkCollection: {
        ...base.bookmarkCollection,
        recoverySnapshotId: 'bookmark-snapshot',
      },
      canvas: {
        layers: [
          { id: 'bookmarks', kind: 'bookmarks' },
          {
            anchor: 'center-center',
            assetId: 'recoverable-asset',
            frame: { height: 100, offsetX: 0, offsetY: 0, width: 100 },
            id: 'stars',
            isHidden: false,
            isLocked: false,
            kind: 'decoration',
            mediaType: 'image',
            name: 'Stars',
            playbackMode: 'active-tab-only',
            playbackRate: 1,
            rotationDeg: 0,
            scale: 1,
          },
        ],
        version: 2,
      },
    });

    expect(
      getSceneReadiness(scene, {
        assetIds: new Set(),
        folderIds: new Set(),
        recoverableAssetIds: new Set(['recoverable-asset']),
        recoverySnapshotIds: new Set(['bookmark-snapshot']),
      }),
    ).toMatchObject({
      availableActions: ['relink', 'restore'],
      canRestore: true,
      isReady: false,
    });
  });

  it('accepts an external whole-tree bookmark root without a folder id', () => {
    const base = createSceneFixture();
    const scene = createSceneFixture({
      bookmarkCollection: {
        ...base.bookmarkCollection,
        folderId: null,
        folderOwnership: 'external',
      },
    });

    expect(
      getSceneReadiness(scene, {
        assetIds: new Set(),
        folderIds: new Set(),
      }),
    ).toEqual({
      availableActions: [],
      canRestore: false,
      isReady: true,
      issues: [],
    });
  });
});
