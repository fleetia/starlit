import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultOptionValue } from '../newtab/defaultOptionValue';

const backgroundMocks = vi.hoisted(() => ({
  runStorageMigration: vi.fn(async (): Promise<void> => undefined),
  set: vi.fn(async (): Promise<void> => undefined),
  syncValues: {} as Record<string, unknown>,
}));

vi.mock('../platform/storage/storage', () => ({
  default: {
    sync: {
      get: vi.fn(
        async (key: string): Promise<unknown> =>
          backgroundMocks.syncValues[key],
      ),
      set: backgroundMocks.set,
    },
  },
}));

vi.mock('../platform/storage/migrateStorage', () => ({
  runStorageMigration: backgroundMocks.runStorageMigration,
}));

let initializeInstallDefaults: () => Promise<void>;

beforeAll(async () => {
  ({ initializeInstallDefaults } = await import('./index'));
});

beforeEach(() => {
  backgroundMocks.syncValues = {};
});

describe('initializeInstallDefaults', () => {
  it('sets only missing defaults before running storage migration', async () => {
    const existingTheme = {
      ...defaultOptionValue.colorTheme,
      accent: '#123456',
    };
    backgroundMocks.syncValues = {
      colorTheme: existingTheme,
      size: 20,
    };

    await initializeInstallDefaults();

    expect(backgroundMocks.set).toHaveBeenCalledWith({
      gridSettings: defaultOptionValue.gridSettings,
      iconSize: defaultOptionValue.iconSize,
      settings: defaultOptionValue.settings,
    });
    expect(backgroundMocks.set).toHaveBeenCalledOnce();
    expect(backgroundMocks.runStorageMigration).toHaveBeenCalledOnce();
    expect(backgroundMocks.set.mock.invocationCallOrder[0]).toBeLessThan(
      backgroundMocks.runStorageMigration.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('preserves a complete existing profile', async () => {
    backgroundMocks.syncValues = {
      colorTheme: defaultOptionValue.colorTheme,
      gridSettings: defaultOptionValue.gridSettings,
      iconSize: defaultOptionValue.iconSize,
      settings: defaultOptionValue.settings,
      size: defaultOptionValue.size,
    };

    await initializeInstallDefaults();

    expect(backgroundMocks.set).not.toHaveBeenCalled();
    expect(backgroundMocks.runStorageMigration).toHaveBeenCalledOnce();
  });
});
