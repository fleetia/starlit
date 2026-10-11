import { describe, expect, it } from 'vitest';

import {
  parseCanvasSceneV2,
  parseSceneCollectionV3,
  parseScenePresetV1,
} from './codec';
import { createSceneFixture } from './testFixtures';

const FRAME = { height: 160, offsetX: 24, offsetY: 24, width: 280 };

describe('scene codecs', () => {
  it('parses a valid scene collection without retaining mutable input', () => {
    const scene = createSceneFixture();
    const parsed = parseSceneCollectionV3({
      activeSceneId: scene.id,
      scenes: [scene],
      storageSchemaVersion: 3,
    });

    scene.bookmarkCollection.folderPath.push('mutated');

    expect(parsed).toEqual({
      activeSceneId: 'scene-1',
      scenes: [createSceneFixture()],
      storageSchemaVersion: 3,
    });
  });

  it('rejects future collection and scene schema versions', () => {
    expect(() =>
      parseSceneCollectionV3({
        activeSceneId: null,
        scenes: [],
        storageSchemaVersion: 4,
      }),
    ).toThrow('Scene storage schema version must be 3');
    expect(() =>
      parseScenePresetV1({ ...createSceneFixture(), version: 2 }),
    ).toThrow('Scene preset version must be 1');
  });

  it('requires exactly one bookmark layer and unique layer ids', () => {
    expect(() => parseCanvasSceneV2({ layers: [], version: 2 })).toThrow(
      'exactly one bookmark layer',
    );
    expect(() =>
      parseCanvasSceneV2({
        layers: [
          { id: 'bookmarks', kind: 'bookmarks' },
          {
            anchor: 'bottom-right',
            assetId: 'asset-1',
            frame: FRAME,
            id: 'bookmarks',
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
      }),
    ).toThrow('Canvas layer ids must be unique');
  });

  it('allows multiple widget instances and migrates the previous config', () => {
    const clock = {
      anchor: 'top-right',
      config: { hourCycle: 'locale', showSeconds: false },
      frame: FRAME,
      id: 'clock-1',
      isHidden: false,
      isLocked: false,
      kind: 'widget',
      widgetType: 'clock',
    };

    expect(
      parseCanvasSceneV2({
        layers: [
          { id: 'bookmarks', kind: 'bookmarks' },
          clock,
          { ...clock, id: 'clock-2' },
        ],
        version: 2,
      }).layers,
    ).toEqual([
      { id: 'bookmarks', kind: 'bookmarks' },
      {
        ...clock,
        config: {
          appearance: 'digital',
          format: 'HH:mm',
          showSecondHand: true,
          timeZone: null,
        },
      },
      {
        ...clock,
        config: {
          appearance: 'digital',
          format: 'HH:mm',
          showSecondHand: true,
          timeZone: null,
        },
        id: 'clock-2',
      },
    ]);
  });

  it('normalizes secure Calendar feeds and rejects unsafe URLs', () => {
    const calendar = {
      anchor: 'top-right',
      config: {
        feedUrl: 'webcal://calendar.example.com/private.ics#section',
        maxEvents: 8,
        showAllDay: true,
      },
      frame: FRAME,
      id: 'calendar-1',
      isHidden: false,
      isLocked: false,
      kind: 'widget',
      widgetType: 'calendar',
    };

    expect(
      parseCanvasSceneV2({
        layers: [{ id: 'bookmarks', kind: 'bookmarks' }, calendar],
        version: 2,
      }).layers[1],
    ).toMatchObject({
      config: { feedUrl: 'https://calendar.example.com/private.ics' },
    });
    expect(() =>
      parseCanvasSceneV2({
        layers: [
          { id: 'bookmarks', kind: 'bookmarks' },
          {
            ...calendar,
            config: {
              ...calendar.config,
              feedUrl: 'https://user:secret@calendar.example.com/feed.ics',
            },
          },
        ],
        version: 2,
      }),
    ).toThrow('config.feedUrl is invalid');
  });

  it('rejects a scene-owned bookmark collection without a folder reference', () => {
    const scene = createSceneFixture();

    expect(() =>
      parseScenePresetV1({
        ...scene,
        bookmarkCollection: {
          ...scene.bookmarkCollection,
          folderId: null,
        },
      }),
    ).toThrow('requires a folder id');
  });

  it('rejects an active scene reference that is not in the collection', () => {
    expect(() =>
      parseSceneCollectionV3({
        activeSceneId: 'missing',
        scenes: [createSceneFixture()],
        storageSchemaVersion: 3,
      }),
    ).toThrow('active scene does not exist');
  });
});
