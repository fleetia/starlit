import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_GRID_SETTINGS,
  DEFAULT_STARLIT_THEME,
  LEGACY_DEFAULT_GRID_SETTINGS,
  LEGACY_DEFAULT_THEME,
} from '../newtab/defaultOptionValue';
import type { GridSettings, Settings, StarlitTheme } from '../newtab/types';

const mockState = vi.hoisted(() => ({
  failLocalSetOnce: false,
  localValues: {} as Record<string, unknown>,
  media: null as Blob | null,
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
        if (mockState.failLocalSetOnce) {
          mockState.failLocalSetOnce = false;
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
  deleteMedia: vi.fn(async (): Promise<void> => {
    mockState.media = null;
  }),
  loadMediaBlob: vi.fn(async (): Promise<Blob | null> => mockState.media),
  saveMedia: vi.fn(async (_key: string, blob: Blob): Promise<string> => {
    mockState.media = blob;
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
    schemaVersion: BACKUP_SCHEMA_VERSION,
    settings: SETTINGS,
    size: 16,
    ...overrides,
  };
}

beforeEach(() => {
  mockState.failLocalSetOnce = false;
  mockState.localValues = {};
  mockState.media = null;
  mockState.syncValues = {};
});

describe('exportFull', () => {
  it('writes schema version 2 with layout, locale and tree preferences', async () => {
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

    const data = await exportFull(
      GRID_SETTINGS,
      SETTINGS,
      STARLIT_THEME,
      { source: 'file', type: 'video', url: '' },
      '[data-starlit-part="bookmark"] {}',
    );

    expect(data).toMatchObject({
      schemaVersion: 2,
      size: 18,
      iconSize: 30,
      locale: 'ja',
      groupPreferences: [{ key: 'Work', visible: false }],
      bookmarkTreePrefs: {
        rootId: 'bookmarks-bar',
        rootPath: ['Bookmarks bar'],
        siblingOrder: { 'Bookmarks bar': ['Work'] },
      },
      favicons: { bookmark1: 'data:image/png;base64,AAAA' },
    });
    expect(data.backgroundData).toMatch(/^data:video\/webm;base64,/);
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
      ...createExportData(),
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
      ...createExportData(),
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
  it('restores every V2 storage field and file media', async () => {
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
    expect(await mockState.media?.text()).toBe('new-media');
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
    const data = createExportData({
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
    };
    mockState.syncValues = structuredClone(originalSyncValues);
    mockState.localValues = structuredClone(originalLocalValues);
    mockState.media = new Blob(['old-media'], { type: 'video/webm' });
    mockState.failLocalSetOnce = true;
    const data = createExportData({
      backgroundData: `data:video/webm;base64,${btoa('new-media')}`,
      backgroundMeta: { source: 'file', type: 'video', url: '' },
      favicons: { imported: 'imported-data' },
    });

    await expect(importFull(data)).rejects.toThrow('local set failed');

    expect(mockState.syncValues).toEqual(originalSyncValues);
    expect(mockState.localValues).toEqual(originalLocalValues);
    expect(await mockState.media?.text()).toBe('old-media');
  });
});
