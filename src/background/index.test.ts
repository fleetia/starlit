import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_SYNC_STORAGE_VALUES } from '../platform/storage/defaults';

const backgroundMocks = vi.hoisted(() => ({
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
  runStorageMigration: backgroundMocks.runStorageMigration,
}));

let getInstallLocale: (uiLanguage: string) => 'en' | 'ko' | 'ja';
let initializeFirstInstallState: () => Promise<void>;
let initializeInstallDefaults: () => Promise<void>;
let onInstalledListener: (details: chrome.runtime.InstalledDetails) => void;

beforeAll(async () => {
  ({
    getInstallLocale,
    initializeFirstInstallState,
    initializeInstallDefaults,
  } = await import('./index'));
  onInstalledListener = vi.mocked(chrome.runtime.onInstalled.addListener).mock
    .calls[0]?.[0] as (details: chrome.runtime.InstalledDetails) => void;
});

beforeEach(() => {
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
  it('sets only missing defaults before running storage migration', async () => {
    const existingTheme = {
      ...DEFAULT_SYNC_STORAGE_VALUES.colorTheme,
      accent: '#123456',
    };
    backgroundMocks.syncValues = {
      colorTheme: existingTheme,
      size: 20,
    };

    await initializeInstallDefaults();

    expect(backgroundMocks.syncSet).toHaveBeenCalledWith({
      locale: 'en',
    });
    expect(backgroundMocks.syncSet).toHaveBeenCalledWith({
      gridSettings: DEFAULT_SYNC_STORAGE_VALUES.gridSettings,
      iconSize: DEFAULT_SYNC_STORAGE_VALUES.iconSize,
      settings: DEFAULT_SYNC_STORAGE_VALUES.settings,
    });
    expect(backgroundMocks.syncSet).toHaveBeenCalledTimes(2);
    expect(backgroundMocks.runStorageMigration).toHaveBeenCalledOnce();
    expect(backgroundMocks.localSet.mock.invocationCallOrder[0]).toBeLessThan(
      backgroundMocks.syncSet.mock.invocationCallOrder[1] ?? 0,
    );
    expect(backgroundMocks.syncSet.mock.invocationCallOrder[1]).toBeLessThan(
      backgroundMocks.runStorageMigration.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('preserves a complete existing profile', async () => {
    backgroundMocks.syncValues = {
      ...DEFAULT_SYNC_STORAGE_VALUES,
      locale: 'en',
    };
    backgroundMocks.localValues.tutorialStatus = 'completed';

    await initializeInstallDefaults();

    expect(backgroundMocks.syncSet).not.toHaveBeenCalled();
    expect(backgroundMocks.localSet).not.toHaveBeenCalled();
    expect(backgroundMocks.runStorageMigration).toHaveBeenCalledOnce();
  });
});
