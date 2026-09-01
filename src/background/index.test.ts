import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_LOCAL_STORAGE_VALUES } from '../platform/storage/defaults';

const backgroundMocks = vi.hoisted(() => ({
  hasLegacySyncHydrationChange: vi.fn(
    (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string,
    ): boolean =>
      areaName === 'sync' &&
      ['bookmarks', 'settings'].some(
        (key) =>
          Object.hasOwn(changes, key) && changes[key]?.newValue !== undefined,
      ),
  ),
  localSet: vi.fn(async (): Promise<void> => undefined),
  localValues: {} as Record<string, unknown>,
  runStorageMigration: vi.fn(async (): Promise<void> => undefined),
  syncSet: vi.fn(async (): Promise<void> => undefined),
  syncValues: {} as Record<string, unknown>,
}));

vi.mock('../platform/storage/storage', () => ({
  default: {
    local: {
      get: vi.fn(
        async (key: string): Promise<unknown> =>
          backgroundMocks.localValues[key],
      ),
      set: backgroundMocks.localSet,
    },
    sync: {
      get: vi.fn(
        async (key: string): Promise<unknown> =>
          backgroundMocks.syncValues[key],
      ),
      set: backgroundMocks.syncSet,
    },
  },
}));

vi.mock('../platform/storage/migrateStorage', () => ({
  hasLegacySyncHydrationChange: backgroundMocks.hasLegacySyncHydrationChange,
  runStorageMigration: backgroundMocks.runStorageMigration,
}));

let getInstallLocale: (uiLanguage: string) => 'en' | 'ko' | 'ja';
let initializeFirstInstallState: () => Promise<void>;
let initializeInstallDefaults: () => Promise<void>;
let onInstalledListener: (details: chrome.runtime.InstalledDetails) => void;
let storageChangedListener: (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string,
) => void;

beforeAll(async () => {
  ({
    getInstallLocale,
    initializeFirstInstallState,
    initializeInstallDefaults,
  } = await import('./index'));
  onInstalledListener = vi.mocked(chrome.runtime.onInstalled.addListener).mock
    .calls[0]?.[0] as (details: chrome.runtime.InstalledDetails) => void;
  storageChangedListener = vi.mocked(chrome.storage.onChanged.addListener).mock
    .calls[0]?.[0] as typeof storageChangedListener;
});

beforeEach(() => {
  backgroundMocks.localSet.mockClear();
  backgroundMocks.runStorageMigration.mockClear();
  backgroundMocks.syncSet.mockClear();
  backgroundMocks.localValues = {};
  backgroundMocks.syncValues = {};
  Object.defineProperty(chrome, 'i18n', {
    configurable: true,
    value: { getUILanguage: vi.fn(() => 'en-US') },
  });
});

describe('getInstallLocale', () => {
  it.each([
    ['ko-KR', 'ko'],
    ['ja_JP', 'ja'],
    ['en-US', 'en'],
    ['fr', 'en'],
  ] as const)('maps %s to %s', (uiLanguage, expected) => {
    expect(getInstallLocale(uiLanguage)).toBe(expected);
  });
});

describe('initializeFirstInstallState', () => {
  it('stores the UI locale and pending tutorial marker for a fresh install', async () => {
    vi.mocked(chrome.i18n.getUILanguage).mockReturnValue('ja-JP');

    await initializeFirstInstallState();

    expect(backgroundMocks.syncSet).toHaveBeenCalledWith({ locale: 'ja' });
    expect(backgroundMocks.localSet).toHaveBeenCalledWith({
      tutorialStatus: 'pending',
    });
  });

  it('preserves existing locale and tutorial state', async () => {
    backgroundMocks.syncValues.locale = 'ko';
    backgroundMocks.localValues.tutorialStatus = 'completed';

    await initializeFirstInstallState();

    expect(backgroundMocks.syncSet).not.toHaveBeenCalled();
    expect(backgroundMocks.localSet).not.toHaveBeenCalled();
  });
});

describe('onInstalled', () => {
  it('does not initialize tutorial state during an extension update', () => {
    onInstalledListener({
      reason: 'update' as chrome.runtime.OnInstalledReason,
    });

    expect(backgroundMocks.syncSet).not.toHaveBeenCalled();
    expect(backgroundMocks.localSet).not.toHaveBeenCalled();
  });
});

describe('initializeInstallDefaults', () => {
  it('runs storage migration before filling only missing defaults', async () => {
    const existingTheme = {
      ...DEFAULT_LOCAL_STORAGE_VALUES.colorTheme,
      accent: '#123456',
    };
    backgroundMocks.localValues = {
      colorTheme: existingTheme,
      size: 20,
    };

    await initializeInstallDefaults();

    expect(backgroundMocks.syncSet).toHaveBeenCalledWith({
      locale: 'en',
    });
    expect(backgroundMocks.localSet).toHaveBeenCalledWith({
      gridSettings: DEFAULT_LOCAL_STORAGE_VALUES.gridSettings,
      iconSize: DEFAULT_LOCAL_STORAGE_VALUES.iconSize,
      settings: DEFAULT_LOCAL_STORAGE_VALUES.settings,
    });
    expect(backgroundMocks.syncSet).toHaveBeenCalledOnce();
    expect(backgroundMocks.runStorageMigration).toHaveBeenCalledOnce();
    expect(
      backgroundMocks.runStorageMigration.mock.invocationCallOrder[0],
    ).toBeLessThan(backgroundMocks.syncSet.mock.invocationCallOrder[0] ?? 0);
  });

  it('does not seed local defaults when migration fails', async () => {
    backgroundMocks.runStorageMigration.mockRejectedValueOnce(
      new Error('migration failed'),
    );

    await expect(initializeInstallDefaults()).rejects.toThrow(
      'migration failed',
    );

    expect(backgroundMocks.syncSet).not.toHaveBeenCalled();
    expect(backgroundMocks.localSet).not.toHaveBeenCalled();
  });

  it('preserves a complete existing profile', async () => {
    backgroundMocks.syncValues = {
      locale: 'en',
    };
    backgroundMocks.localValues = {
      ...DEFAULT_LOCAL_STORAGE_VALUES,
      tutorialStatus: 'completed',
    };

    await initializeInstallDefaults();

    expect(backgroundMocks.syncSet).not.toHaveBeenCalled();
    expect(backgroundMocks.localSet).not.toHaveBeenCalled();
    expect(backgroundMocks.runStorageMigration).toHaveBeenCalledOnce();
  });
});

describe('storage migration sync listener', () => {
  it('retries migration when a legacy sync key hydrates later', async () => {
    storageChangedListener(
      { bookmarks: { newValue: [{ title: 'Late bookmark' }] } },
      'sync',
    );

    await vi.waitFor(() =>
      expect(backgroundMocks.runStorageMigration).toHaveBeenCalledOnce(),
    );
  });

  it('ignores local and unrelated sync changes', async () => {
    storageChangedListener(
      { bookmarks: { newValue: [{ title: 'Local bookmark' }] } },
      'local',
    );
    storageChangedListener({ locale: { newValue: 'ko' } }, 'sync');
    await Promise.resolve();

    expect(backgroundMocks.runStorageMigration).not.toHaveBeenCalled();
  });
});
