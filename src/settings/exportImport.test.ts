import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_GRID_SETTINGS,
  LEGACY_DEFAULT_GRID_SETTINGS,
} from '../layout/defaults';
import type { GridSettings } from '../layout/types';
import type { OverlayScene } from '../overlays/types';
import { DEFAULT_STARLIT_THEME, LEGACY_DEFAULT_THEME } from '../theme/defaults';
import type { StarlitTheme } from '../theme/types';
import type { Settings } from './types';

const mockState = vi.hoisted(() => ({
  failOverlayBatchDeleteOnce: false,
  failOverlaySceneSetOnce: false,
  localValues: {} as Record<string, unknown>,
  media: null as Blob | null,
  observedMutationLeaseDuringOverlayMutation: false,
  observedOldMediaBeforeSceneCommit: false,
  overlayMedia: {} as Record<string, Blob>,
  syncValues: {} as Record<string, unknown>,
}));

vi.mock('../platform/storage/storage', () => ({
  default: {
    sync: {
      get: vi.fn(
        async (key: string): Promise<unknown> => mockState.syncValues[key],
      ),
      set: vi.fn(async (items: Record<string, unknown>): Promise<void> => {
        Object.assign(mockState.syncValues, items);
      }),
      remove: vi.fn(async (keys: string | string[]): Promise<void> => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        keyList.forEach((key) => delete mockState.syncValues[key]);
      }),
    },
    local: {
      get: vi.fn(
        async (key: string): Promise<unknown> => mockState.localValues[key],
      ),
      set: vi.fn(async (items: Record<string, unknown>): Promise<void> => {
        if (
          mockState.failOverlaySceneSetOnce &&
          Object.hasOwn(items, 'overlayScene')
        ) {
          mockState.observedOldMediaBeforeSceneCommit = Object.hasOwn(
            mockState.overlayMedia,
            'overlayImage:existing-overlay',
          );
          mockState.failOverlaySceneSetOnce = false;
          throw new Error('local set failed');
        }

        Object.assign(mockState.localValues, items);
      }),
      remove: vi.fn(async (keys: string | string[]): Promise<void> => {
        const keyList = Array.isArray(keys) ? keys : [keys];
        keyList.forEach((key) => delete mockState.localValues[key]);
      }),
    },
  },
}));

vi.mock('../platform/storage/mediaStorage', () => ({
  deleteMedia: vi.fn(async (key: string): Promise<void> => {
    if (key === 'backgroundMedia') {
      mockState.media = null;
      return;
    }

    delete mockState.overlayMedia[key];
  }),
  deleteMediaByPrefix: vi.fn(async (prefix: string): Promise<void> => {
    if (prefix === 'overlayImage:') {
      mockState.observedMutationLeaseDuringOverlayMutation ||= Object.keys(
        mockState.localValues,
      ).some((key) => key.startsWith('overlayMediaMutationLease:'));
    }

    Object.keys(mockState.overlayMedia)
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => delete mockState.overlayMedia[key]);
  }),
  deleteMediaBatch: vi.fn(async (keys: readonly string[]): Promise<void> => {
    if (mockState.failOverlayBatchDeleteOnce) {
      mockState.failOverlayBatchDeleteOnce = false;
      throw new Error('overlay batch delete failed');
    }

    keys.forEach((key) => delete mockState.overlayMedia[key]);
  }),
  listMediaKeys: vi.fn(
    async (prefix = ''): Promise<string[]> =>
      Object.keys(mockState.overlayMedia).filter((key) =>
        key.startsWith(prefix),
      ),
  ),
  loadMediaBlob: vi.fn(
    async (key: string): Promise<Blob | null> =>
      key === 'backgroundMedia'
        ? mockState.media
        : (mockState.overlayMedia[key] ?? null),
  ),
  saveMedia: vi.fn(async (key: string, blob: Blob): Promise<string> => {
    if (key === 'backgroundMedia') {
      mockState.media = blob;
    } else {
      mockState.observedMutationLeaseDuringOverlayMutation ||= Object.keys(
        mockState.localValues,
      ).some((storageKey) =>
        storageKey.startsWith('overlayMediaMutationLease:'),
      );
      mockState.overlayMedia[key] = blob;
    }
    return 'blob:mock-media';
  }),
}));

import {
  BACKUP_SCHEMA_VERSION,
  exportFull,
  importFromJson,
  importFull,
  type ExportData,
  type LegacyExportData,
  type V2ExportData,
} from './exportImport';

const GRID_SETTINGS: GridSettings = {
  columns: 5,
  rows: 3,
  gap: '0.5rem',
  position: 'center-center',
  background: {
    color: '#faf6e9',
    border: '1px solid #746a75',
    text: '#302a33',
  },
  icon: {
    color: '#faf6e9',
    border: '1px solid #b8adae',
    text: '#302a33',
  },
};

const SETTINGS: Settings = {
  fontFamily: 'ibm-plex-sans',
  isExpandView: false,
  isFolderEnabled: true,
  isOpenInNewTab: false,
  isVisibleOnce: false,
  iconLayout: 'vertical',
};

const STARLIT_THEME: StarlitTheme = {
  accent: '#4d2d57',
  accentText: '#faf6e9',
  surface: '#faf6e9',
  text: '#302a33',
  border: '#746a75',
  hoverBg: '#dfdef0',
  hoverText: '#4d2d57',
  muted: '#665e6a',
};

function createExportData(overrides: Partial<ExportData> = {}): ExportData {
  return {
    backgroundMeta: null,
    bookmarkTreePrefs: {
      rootId: 'bookmarks-bar',
      rootPath: ['Bookmarks bar'],
      siblingOrder: { 'Bookmarks bar': ['Work', 'Personal'] },
    },
    colorTheme: STARLIT_THEME,
    gridSettings: GRID_SETTINGS,
    groupPreferences: [{ key: 'Work', visible: true }],
    iconSize: 28,
    locale: 'ko',
    overlayMedia: {},
    overlayScene: { layers: [{ kind: 'bookmarks' }] },
    schemaVersion: BACKUP_SCHEMA_VERSION,
    settings: SETTINGS,
    size: 16,
    ...overrides,
  };
}

function createV2ExportData(
  overrides: Partial<V2ExportData> = {},
): V2ExportData {
  const current = createExportData();
  const {
    overlayMedia: _overlayMedia,
    overlayScene: _overlayScene,
    ...data
  } = current;

  return { ...data, ...overrides, schemaVersion: 2 };
}

function installExclusiveLockQueue(): void {
  let pending: Promise<unknown> = Promise.resolve();
  const request = vi.fn(
    (
      _name: string,
      _options: LockOptions,
      operation: () => Promise<unknown>,
    ): Promise<unknown> => {
      const result = pending.then(operation, operation);
      pending = result.catch(() => undefined);
      return result;
    },
  );
  vi.stubGlobal('navigator', { locks: { request } });
}

beforeEach(() => {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ close: vi.fn(), height: 1, width: 1 })),
  );
  mockState.failOverlayBatchDeleteOnce = false;
  mockState.failOverlaySceneSetOnce = false;
  mockState.localValues = {};
  mockState.media = null;
  mockState.observedMutationLeaseDuringOverlayMutation = false;
  mockState.observedOldMediaBeforeSceneCommit = false;
  mockState.overlayMedia = {};
  mockState.syncValues = {};
});

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('exportFull', () => {
  it('writes schema version 3 with layout, locale, tree preferences and overlays', async () => {
    mockState.syncValues = {
      bookmarkTreePrefs: {
        rootId: 'bookmarks-bar',
        rootPath: ['Bookmarks bar'],
        siblingOrder: { 'Bookmarks bar': ['Work'] },
      },
      groupPreferences: [{ key: 'Work', visible: false }],
      iconSize: 30,
      locale: 'ja',
      size: 18,
    };
    mockState.localValues = {
      favicons: { bookmark1: 'data:image/png;base64,AAAA' },
    };
    mockState.media = new Blob(['background'], { type: 'video/webm' });
    mockState.localValues.overlayScene = {
      layers: [
        { kind: 'bookmarks' },
        {
          anchor: 'top-right',
          height: 80,
          id: 'sparkle',
          kind: 'image',
          name: 'sparkle.png',
          offsetX: 24,
          offsetY: 32,
          rotationDeg: 15,
          scale: 1.5,
          width: 120,
        },
      ],
    };
    mockState.overlayMedia['overlayImage:sparkle'] = new Blob(['overlay'], {
      type: 'image/webp',
    });

    const data = await exportFull(
      GRID_SETTINGS,
      SETTINGS,
      STARLIT_THEME,
      { source: 'file', type: 'video', url: '' },
      '[data-starlit-part="bookmark"] {}',
    );

    expect(data).toMatchObject({
      schemaVersion: 3,
      size: 18,
      iconSize: 30,
      locale: 'ja',
      settings: { fontFamily: 'ibm-plex-sans' },
      groupPreferences: [{ key: 'Work', visible: false }],
      bookmarkTreePrefs: {
        rootId: 'bookmarks-bar',
        rootPath: ['Bookmarks bar'],
        siblingOrder: { 'Bookmarks bar': ['Work'] },
      },
      favicons: { bookmark1: 'data:image/png;base64,AAAA' },
      overlayScene: mockState.localValues.overlayScene,
    });
    expect(data.backgroundData).toMatch(/^data:video\/webm;base64,/);
    expect(data.overlayMedia.sparkle).toMatch(/^data:image\/webp;base64,/);
  });
});

describe('importFromJson', () => {
  it('accepts an unversioned V1 backup', async () => {
    const legacyData = {
      colorTheme: STARLIT_THEME,
      gridSettings: GRID_SETTINGS,
      settings: SETTINGS,
    };
    const file = new File([JSON.stringify(legacyData)], 'legacy.json', {
      type: 'application/json',
    });

    await expect(importFromJson(file)).resolves.toMatchObject(legacyData);
  });

  it('accepts a V2 backup without overlay data', async () => {
    const data = createV2ExportData();
    const file = new File([JSON.stringify(data)], 'v2.json', {
      type: 'application/json',
    });

    await expect(importFromJson(file)).resolves.toMatchObject({
      schemaVersion: 2,
      size: data.size,
    });
  });

  it('keeps special overlay ids as own media properties', async () => {
    const id = '__proto__';
    const data = createExportData({
      overlayMedia: Object.fromEntries([
        [id, `data:image/webp;base64,${btoa('overlay-media')}`],
      ]),
      overlayScene: {
        layers: [
          { kind: 'bookmarks' },
          {
            anchor: 'top-left',
            height: 80,
            id,
            kind: 'image',
            name: 'special.webp',
            offsetX: 20,
            offsetY: 30,
            rotationDeg: 0,
            width: 120,
          },
        ],
      },
    });
    const file = new File([JSON.stringify(data)], 'special-id.json', {
      type: 'application/json',
    });

    const imported = await importFromJson(file);

    expect(imported.schemaVersion).toBe(3);
    if (imported.schemaVersion === 3) {
      expect(Object.hasOwn(imported.overlayMedia, id)).toBe(true);
      expect(imported.overlayMedia[id]).toMatch(/^data:image\/webp;base64,/);
    }
  });

  it('defaults a legacy backup without a font to IBM Plex Sans', async () => {
    const legacySettings: Record<string, unknown> = structuredClone(SETTINGS);
    delete legacySettings.fontFamily;
    const file = new File(
      [
        JSON.stringify({
          colorTheme: STARLIT_THEME,
          gridSettings: GRID_SETTINGS,
          settings: legacySettings,
        }),
      ],
      'legacy-without-font.json',
      { type: 'application/json' },
    );

    await expect(importFromJson(file)).resolves.toMatchObject({
      settings: { fontFamily: 'ibm-plex-sans' },
    });
  });

  it('rejects an unknown font family', async () => {
    const invalidData = {
      ...createV2ExportData(),
      settings: { ...SETTINGS, fontFamily: 'comic-sans' },
    };
    const file = new File([JSON.stringify(invalidData)], 'invalid-font.json', {
      type: 'application/json',
    });

    await expect(importFromJson(file)).rejects.toThrow(
      'settings가 올바르지 않습니다.',
    );
  });

  it('normalizes only untouched V1 visual defaults', async () => {
    const customText = '#123456';
    const legacyData = {
      colorTheme: {
        ...LEGACY_DEFAULT_THEME,
        text: customText,
      },
      gridSettings: {
        ...LEGACY_DEFAULT_GRID_SETTINGS,
        background: {
          ...LEGACY_DEFAULT_GRID_SETTINGS.background,
          text: customText,
        },
      },
      settings: SETTINGS,
    };
    const file = new File([JSON.stringify(legacyData)], 'legacy.json', {
      type: 'application/json',
    });

    const imported = await importFromJson(file);

    expect(imported.colorTheme).toEqual({
      ...DEFAULT_STARLIT_THEME,
      text: customText,
    });
    expect(imported.gridSettings).toEqual({
      ...DEFAULT_GRID_SETTINGS,
      background: {
        ...DEFAULT_GRID_SETTINGS.background,
        text: customText,
      },
    });
  });

  it('rejects a V2 backup with an invalid locale', async () => {
    const invalidData = {
      ...createV2ExportData(),
      locale: 'fr',
    };
    const file = new File([JSON.stringify(invalidData)], 'invalid.json', {
      type: 'application/json',
    });

    await expect(importFromJson(file)).rejects.toThrow(
      'locale이 올바르지 않습니다.',
    );
  });

  it('rejects a V2 backup with a non-string root id', async () => {
    const invalidData = {
      ...createV2ExportData(),
      bookmarkTreePrefs: {
        rootId: 42,
        rootPath: ['Bookmarks bar'],
        siblingOrder: {},
      },
    };
    const file = new File([JSON.stringify(invalidData)], 'invalid.json', {
      type: 'application/json',
    });

    await expect(importFromJson(file)).rejects.toThrow(
      'bookmarkTreePrefs가 올바르지 않습니다.',
    );
  });
});

describe('importFull', () => {
  it('rejects undecodable overlay media before replacing the current scene', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('decode failed');
      }),
    );
    const originalScene: OverlayScene = {
      layers: [
        { kind: 'bookmarks' },
        {
          anchor: 'top-left',
          height: 80,
          id: 'existing-overlay',
          kind: 'image',
          name: 'existing.webp',
          offsetX: 20,
          offsetY: 30,
          rotationDeg: 0,
          width: 120,
        },
      ],
    };
    mockState.localValues = { overlayScene: structuredClone(originalScene) };
    mockState.overlayMedia['overlayImage:existing-overlay'] = new Blob(
      ['old-overlay'],
      { type: 'image/webp' },
    );
    const data = createExportData({
      overlayMedia: {
        invalid: `data:image/webp;base64,${btoa('not-an-image')}`,
      },
      overlayScene: {
        layers: [
          { kind: 'bookmarks' },
          {
            anchor: 'bottom-right',
            height: 90,
            id: 'invalid',
            kind: 'image',
            name: 'invalid.webp',
            offsetX: 24,
            offsetY: 36,
            rotationDeg: 0,
            width: 140,
          },
        ],
      },
    });

    await expect(importFull(data)).rejects.toThrow(
      'overlay media를 디코딩할 수 없습니다: invalid.webp',
    );

    expect(mockState.localValues).toEqual({ overlayScene: originalScene });
    expect(Object.keys(mockState.overlayMedia)).toEqual([
      'overlayImage:existing-overlay',
    ]);
    expect(
      await mockState.overlayMedia['overlayImage:existing-overlay']?.text(),
    ).toBe('old-overlay');
  });

  it('serializes overlapping V3 imports into a consistent final scene', async () => {
    installExclusiveLockQueue();
    const first = createExportData({
      overlayMedia: {
        first: `data:image/webp;base64,${btoa('first-overlay')}`,
      },
      overlayScene: {
        layers: [
          { kind: 'bookmarks' },
          {
            anchor: 'top-left',
            height: 80,
            id: 'first',
            kind: 'image',
            name: 'first.webp',
            offsetX: 20,
            offsetY: 30,
            rotationDeg: 0,
            width: 120,
          },
        ],
      },
    });
    const second = createExportData({
      overlayMedia: {
        second: `data:image/webp;base64,${btoa('second-overlay')}`,
      },
      overlayScene: {
        layers: [
          { kind: 'bookmarks' },
          {
            anchor: 'bottom-right',
            height: 90,
            id: 'second',
            kind: 'image',
            name: 'second.webp',
            offsetX: 24,
            offsetY: 36,
            rotationDeg: 10,
            width: 140,
          },
        ],
      },
    });

    await Promise.all([importFull(first), importFull(second)]);

    const importedScene = mockState.localValues.overlayScene as OverlayScene;
    const importedImage = importedScene.layers.find(
      (layer) => layer.kind === 'image',
    );
    expect(importedImage).toEqual(
      expect.objectContaining({ name: 'second.webp' }),
    );
    if (!importedImage || importedImage.kind !== 'image') {
      throw new Error('Expected an imported overlay image.');
    }
    expect(importedImage.id).not.toBe('second');
    expect(Object.keys(mockState.overlayMedia)).toEqual([
      `overlayImage:${importedImage.id}`,
    ]);
    expect(
      await mockState.overlayMedia[`overlayImage:${importedImage.id}`]?.text(),
    ).toBe('second-overlay');
    expect(
      Object.keys(mockState.localValues).some((key) =>
        key.startsWith('overlayMediaMutationLease:'),
      ),
    ).toBe(false);
  });

  it('restores every V3 storage field and file media', async () => {
    mockState.localValues = {
      favicons: { existing: 'existing-data' },
    };
    const data = createExportData({
      backgroundData: `data:video/webm;base64,${btoa('new-media')}`,
      backgroundMeta: { source: 'file', type: 'video', url: '' },
      customCSS: '.bookmark { color: red; }',
      favicons: { imported: 'imported-data' },
      iconSize: 32,
      locale: 'en',
      overlayMedia: {
        sparkle: `data:image/webp;base64,${btoa('overlay-media')}`,
      },
      overlayScene: {
        layers: [
          { kind: 'bookmarks' },
          {
            anchor: 'bottom-right',
            height: 80,
            id: 'sparkle',
            kind: 'image',
            name: 'sparkle.webp',
            offsetX: 20,
            offsetY: 30,
            rotationDeg: 12,
            scale: 1.25,
            width: 120,
          },
        ],
      },
      size: 20,
    });

    await importFull(data);

    expect(mockState.syncValues).toMatchObject({
      gridSettings: GRID_SETTINGS,
      settings: SETTINGS,
      colorTheme: STARLIT_THEME,
      size: 20,
      iconSize: 32,
      locale: 'en',
      groupPreferences: data.groupPreferences,
      bookmarkTreePrefs: data.bookmarkTreePrefs,
      customCSS: '.bookmark { color: red; }',
      backgroundMeta: { source: 'file', type: 'video', url: '' },
    });
    expect(mockState.localValues.favicons).toEqual({
      existing: 'existing-data',
      imported: 'imported-data',
    });
    const importedScene = mockState.localValues.overlayScene as OverlayScene;
    const importedImage = importedScene.layers.find(
      (layer) => layer.kind === 'image',
    );
    expect(importedImage).toEqual(
      expect.objectContaining({
        name: 'sparkle.webp',
        offsetX: 20,
        rotationDeg: 12,
        scale: 1.25,
      }),
    );
    if (!importedImage || importedImage.kind !== 'image') {
      throw new Error('Expected an imported overlay image.');
    }
    expect(importedImage.id).not.toBe('sparkle');
    expect(await mockState.media?.text()).toBe('new-media');
    expect(
      await mockState.overlayMedia[`overlayImage:${importedImage.id}`]?.text(),
    ).toBe('overlay-media');
    expect(mockState.observedMutationLeaseDuringOverlayMutation).toBe(true);
    expect(
      Object.keys(mockState.localValues).some((key) =>
        key.startsWith('overlayMediaMutationLease:'),
      ),
    ).toBe(false);
  });

  it('preserves current file media when a V1 backup has metadata without data', async () => {
    const currentBackground = {
      source: 'file' as const,
      type: 'video' as const,
      url: '',
    };
    mockState.syncValues = { backgroundMeta: currentBackground };
    mockState.media = new Blob(['current-media'], { type: 'video/webm' });
    const data: LegacyExportData = {
      backgroundMeta: { source: 'file', type: 'image', url: '' },
      colorTheme: STARLIT_THEME,
      gridSettings: GRID_SETTINGS,
      settings: SETTINGS,
    };

    await importFull(data);

    expect(mockState.syncValues.backgroundMeta).toEqual(currentBackground);
    expect(await mockState.media.text()).toBe('current-media');
  });

  it('preserves current file media when a V2 backup has metadata without data', async () => {
    const currentBackground = {
      source: 'file' as const,
      type: 'video' as const,
      url: '',
    };
    mockState.syncValues = { backgroundMeta: currentBackground };
    mockState.media = new Blob(['current-media'], { type: 'video/webm' });
    const data = createV2ExportData({
      backgroundMeta: { source: 'file', type: 'image', url: '' },
    });

    await importFull(data);

    expect(mockState.syncValues.backgroundMeta).toEqual(currentBackground);
    expect(await mockState.media.text()).toBe('current-media');
  });

  it('rolls storage and IndexedDB media back when an import write fails', async () => {
    const originalSyncValues = {
      backgroundMeta: { source: 'file', type: 'video', url: '' },
      colorTheme: { ...STARLIT_THEME, accent: '#111111' },
      gridSettings: { ...GRID_SETTINGS, columns: 4 },
      iconSize: 24,
      locale: 'ja',
      settings: { ...SETTINGS, isExpandView: true },
      size: 14,
    };
    const originalLocalValues = {
      favicons: { existing: 'existing-data' },
      overlayScene: {
        layers: [
          { kind: 'bookmarks' },
          {
            anchor: 'top-left',
            height: 80,
            id: 'existing-overlay',
            kind: 'image',
            name: 'existing.webp',
            offsetX: 20,
            offsetY: 30,
            rotationDeg: 0,
            width: 120,
          },
        ],
      },
    };
    mockState.syncValues = structuredClone(originalSyncValues);
    mockState.localValues = structuredClone(originalLocalValues);
    mockState.media = new Blob(['old-media'], { type: 'video/webm' });
    mockState.overlayMedia['overlayImage:existing-overlay'] = new Blob(
      ['old-overlay'],
      { type: 'image/webp' },
    );
    mockState.failOverlaySceneSetOnce = true;
    const data = createExportData({
      backgroundData: `data:video/webm;base64,${btoa('new-media')}`,
      backgroundMeta: { source: 'file', type: 'video', url: '' },
      favicons: { imported: 'imported-data' },
    });

    await expect(importFull(data)).rejects.toThrow('local set failed');

    expect(mockState.syncValues).toEqual(originalSyncValues);
    expect(mockState.localValues).toEqual(originalLocalValues);
    expect(await mockState.media?.text()).toBe('old-media');
    expect(
      await mockState.overlayMedia['overlayImage:existing-overlay']?.text(),
    ).toBe('old-overlay');
    expect(mockState.observedMutationLeaseDuringOverlayMutation).toBe(true);
    expect(mockState.observedOldMediaBeforeSceneCommit).toBe(true);
  });

  it('restores the previous scene when old media cleanup fails after commit', async () => {
    const originalScene: OverlayScene = {
      layers: [
        { kind: 'bookmarks' },
        {
          anchor: 'top-left',
          height: 80,
          id: 'existing-overlay',
          kind: 'image',
          name: 'existing.webp',
          offsetX: 20,
          offsetY: 30,
          rotationDeg: 0,
          width: 120,
        },
      ],
    };
    mockState.localValues = { overlayScene: structuredClone(originalScene) };
    mockState.overlayMedia['overlayImage:existing-overlay'] = new Blob(
      ['old-overlay'],
      { type: 'image/webp' },
    );
    mockState.failOverlayBatchDeleteOnce = true;
    const data = createExportData({
      overlayMedia: {
        imported: `data:image/webp;base64,${btoa('new-overlay')}`,
      },
      overlayScene: {
        layers: [
          { kind: 'bookmarks' },
          {
            anchor: 'bottom-right',
            height: 90,
            id: 'imported',
            kind: 'image',
            name: 'imported.webp',
            offsetX: 24,
            offsetY: 36,
            rotationDeg: 10,
            width: 140,
          },
        ],
      },
    });

    await expect(importFull(data)).rejects.toThrow(
      'overlay batch delete failed',
    );

    expect(mockState.localValues).toEqual({ overlayScene: originalScene });
    expect(Object.keys(mockState.overlayMedia)).toEqual([
      'overlayImage:existing-overlay',
    ]);
    expect(
      await mockState.overlayMedia['overlayImage:existing-overlay']?.text(),
    ).toBe('old-overlay');
  });
});
