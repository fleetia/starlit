import type { Page } from '@playwright/test';

import { expect, test } from './extension.fixture';
import {
  createProfileSeed,
  LEGACY_GRID_SETTINGS,
  LEGACY_THEME,
} from './profile';

const LEGACY_MEDIA_TEXT = '<svg xmlns="http://www.w3.org/2000/svg" />';

const BACKGROUND_URL_CASES = [
  {
    expectedTag: 'DIV',
    expectedType: 'image',
    name: 'image',
    url: 'https://example.test/background.png',
  },
  {
    expectedTag: 'DIV',
    expectedType: 'image',
    name: 'GIF',
    url: 'https://example.test/background.gif',
  },
  {
    expectedTag: 'VIDEO',
    expectedType: 'video',
    name: 'video',
    url: 'https://example.test/background.mp4',
  },
] as const;

async function waitForBookmarks(page: Page): Promise<void> {
  await expect(page.locator('[data-starlit-part="root"]')).toBeVisible();
  await page.getByRole('button', { name: 'Bookmarks Bar' }).click();
  await expect(page.getByRole('button', { name: 'Atlas 01' })).toBeVisible();
}

test('loads the built MV3 artifact with fresh Lagrange defaults', async ({
  extension,
}) => {
  await extension.seedProfile(createProfileSeed());
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  const manifest = await extension.serviceWorker.evaluate(() =>
    chrome.runtime.getManifest(),
  );
  const syncStorage = await extension.readStorage('sync');

  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions).toEqual(
    expect.arrayContaining(['bookmarks', 'storage']),
  );
  expect(syncStorage.storageSchemaVersion).toBe(2);
  expect(syncStorage.size).toBe(16);
  expect(syncStorage.iconSize).toBe(28);
  expect(syncStorage.gridSettings).toMatchObject({
    gap: '0.5rem',
    icon: { borderRadius: 1, iconRadius: 1 },
  });
  expect(syncStorage.colorTheme).toMatchObject({
    accent: '#4d2d57',
    surface: '#faf6e9',
  });
  expect(syncStorage.settings).toMatchObject({
    fontFamily: 'ibm-plex-sans',
  });
  await expect(page.locator('[data-starlit-part="root"]')).toHaveCSS(
    'font-family',
    /IBM Plex Sans/,
  );
  expect(
    await page.locator('link[data-starlit-font-stylesheet]').count(),
  ).toBeGreaterThan(0);
  expect(extension.getFontStylesheetRequestCount()).toBeGreaterThan(0);
  await expect(
    page.locator('[data-starlit-part="paged-groups"]'),
  ).toBeVisible();
  await expect(page.locator('[data-layout="vertical"]').first()).toBeVisible();
  await expect(
    page.locator('[data-starlit-part="pagination"]').first(),
  ).toBeVisible();
});

test('upgrades a V1 profile while preserving behavior and custom leaves', async ({
  extension,
}) => {
  await extension.seedProfile({
    ...createProfileSeed({
      backgroundMeta: { type: 'image', source: 'file', url: '' },
      bookmarkTreePrefs: {
        rootPath: [],
        siblingOrder: { '': ['Bookmarks bar', 'Other bookmarks'] },
      },
      colorTheme: LEGACY_THEME,
      customCSS:
        '[data-starlit-part="bookmark-tile"] { outline-color: rgb(1, 2, 3); }',
      displaySize: 31,
      gridSettings: LEGACY_GRID_SETTINGS,
      groupPreferences: [
        { key: 'Bookmarks bar', visible: true },
        { key: 'Other bookmarks', visible: true },
      ],
      iconSize: 26,
      locale: 'ja',
      settings: {
        fontFamily: 'system',
        iconLayout: 'horizontal',
        isExpandView: false,
        isFolderEnabled: false,
        isOpenInNewTab: true,
        isVisibleOnce: true,
      },
    }),
    indexedDb: [
      {
        base64: Buffer.from(LEGACY_MEDIA_TEXT).toString('base64'),
        databaseName: 'lotuspad',
        key: 'backgroundMedia',
        mimeType: 'image/svg+xml',
        storeName: 'media',
      },
    ],
  });
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  await expect
    .poll(async () => {
      const storage = await extension.readStorage('sync');
      return storage.storageSchemaVersion;
    })
    .toBe(2);

  const syncStorage = await extension.readStorage('sync');
  expect(syncStorage.size).toBe(31);
  expect(syncStorage.iconSize).toBe(26);
  expect(syncStorage.locale).toBe('ja');
  expect(syncStorage.settings).toMatchObject({
    fontFamily: 'system',
    iconLayout: 'horizontal',
    isOpenInNewTab: true,
  });
  expect(syncStorage.gridSettings).toMatchObject({
    gap: '2rem',
    icon: { borderRadius: 1, iconRadius: 1 },
  });
  expect(syncStorage.colorTheme).toMatchObject({
    accent: '#1456a0',
    surface: '#faf6e9',
  });
  expect(syncStorage.bookmarkTreePrefs).toEqual({
    rootPath: [],
    siblingOrder: { '': ['Bookmarks bar', 'Other bookmarks'] },
  });
  await expect(
    page.locator('[data-layout="horizontal"]').first(),
  ).toBeVisible();
  await expect(page.locator('[data-starlit-part="root"]')).toHaveCSS(
    'font-family',
    'system-ui, sans-serif',
  );
  await expect(page.locator('link[data-starlit-font-stylesheet]')).toHaveCount(
    0,
  );
  expect(extension.getFontStylesheetRequestCount()).toBe(0);
  await page.locator('[data-starlit-part="settings-trigger"]').click();
  const fontSelect = page.locator(
    '[data-starlit-part="settings-general"] select',
  );
  await fontSelect.selectOption('ibm-plex-sans');
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.dataset.starlitFontStatus),
    )
    .toBe('loaded');
  expect(
    await page.locator('link[data-starlit-font-stylesheet]').count(),
  ).toBeGreaterThan(0);
  expect(extension.getFontStylesheetRequestCount()).toBeGreaterThan(0);
  expect(
    await page.evaluate(async () => {
      const faces = await document.fonts.load('16px "IBM Plex Sans"');
      return (
        faces.length > 0 &&
        faces.every((fontFace) => fontFace.status === 'loaded')
      );
    }),
  ).toBe(true);
  await fontSelect.selectOption('system');
  await expect(page.locator('link[data-starlit-font-stylesheet]')).toHaveCount(
    0,
  );
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.dataset.starlitFontStatus),
    )
    .toBe('system');
  await expect(
    page.locator('[data-starlit-part="background-media"]'),
  ).toBeVisible();
  await expect
    .poll(() =>
      extension.readIndexedDbBlobText('starlit', 'media', 'backgroundMedia'),
    )
    .toBe(LEGACY_MEDIA_TEXT);
});

test('falls back to the Lagrange canvas when file media is missing', async ({
  extension,
}) => {
  await extension.seedProfile(
    createProfileSeed({
      backgroundMeta: { type: 'image', source: 'file', url: '' },
      storageSchemaVersion: 2,
    }),
  );
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  await expect(
    page.locator('[data-starlit-part="background-media"]'),
  ).toHaveCount(0);
  await expect(page.locator('[data-starlit-part="root"]')).toHaveCSS(
    'background-image',
    /radial-gradient/,
  );
});

test('renders a persisted background URL as a full-bleed layer', async ({
  extension,
}) => {
  await extension.seedProfile(
    createProfileSeed({
      backgroundMeta: {
        source: 'url',
        type: 'image',
        url: 'https://example.test/background.png',
      },
      storageSchemaVersion: 2,
    }),
  );
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  const background = page.locator('[data-starlit-part="background-media"]');
  await expect(background).toBeVisible();
  await expect(background).toHaveCSS(
    'background-image',
    /example\.test\/background\.png/,
  );
});

for (const backgroundCase of BACKGROUND_URL_CASES) {
  test(`applies a ${backgroundCase.name} URL through settings and renders the correct layer`, async ({
    extension,
  }) => {
    await extension.seedProfile(
      createProfileSeed({ locale: 'en', storageSchemaVersion: 2 }),
    );
    const page = await extension.openNewTab();
    await waitForBookmarks(page);

    await page.locator('[data-starlit-part="settings-trigger"]').click();
    await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
    await page.getByPlaceholder('Enter URL').fill(backgroundCase.url);
    const mediaResponsePromise = page.waitForResponse(
      (response) => response.url() === backgroundCase.url,
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();

    const mediaResponse = await mediaResponsePromise;
    expect(mediaResponse.ok()).toBe(true);

    await expect
      .poll(async () => {
        const storage = await extension.readStorage('sync');
        return storage.backgroundMeta;
      })
      .toEqual({
        source: 'url',
        type: backgroundCase.expectedType,
        url: backgroundCase.url,
      });

    const background = page.locator('[data-starlit-part="background-media"]');
    await expect(background).toBeVisible();
    await expect
      .poll(() => background.evaluate((element) => element.tagName))
      .toBe(backgroundCase.expectedTag);

    if (backgroundCase.expectedTag === 'VIDEO') {
      await expect(background).toHaveAttribute('src', backgroundCase.url);
    } else {
      await expect(background).toHaveCSS(
        'background-image',
        new RegExp(backgroundCase.url.replaceAll('.', '\\.')),
      );
      const decoded = await page.evaluate(
        (url) =>
          new Promise<boolean>((resolveImage) => {
            const image = new Image();
            const timeout = window.setTimeout(() => resolveImage(false), 5000);
            image.onload = () => {
              window.clearTimeout(timeout);
              resolveImage(image.naturalWidth > 0);
            };
            image.onerror = () => {
              window.clearTimeout(timeout);
              resolveImage(false);
            };
            image.src = url;
          }),
        backgroundCase.url,
      );
      expect(decoded).toBe(true);
    }
  });
}

test('imports an unversioned V1 backup with file media through settings', async ({
  extension,
}) => {
  const preservedGroups = [{ key: '북마크', visible: true }];
  const preservedTree = { rootPath: [], siblingOrder: {} };
  await extension.seedProfile(
    createProfileSeed({
      bookmarkTreePrefs: preservedTree,
      groupPreferences: preservedGroups,
      iconSize: 29,
      locale: 'en',
      size: 23,
      storageSchemaVersion: 2,
    }),
  );
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  const importedMediaBase64 = extension.backgroundVideo.toString('base64');

  const legacyBackup = {
    backgroundData: `data:video/webm;base64,${importedMediaBase64}`,
    backgroundMeta: { source: 'file', type: 'video', url: '' },
    colorTheme: { ...LEGACY_THEME, accent: '#7a2458' },
    customCSS:
      '[data-starlit-part="bookmark-group"] { border-color: #7a2458; }',
    gridSettings: { ...LEGACY_GRID_SETTINGS, gap: '3rem' },
    settings: {
      iconLayout: 'horizontal',
      isExpandView: true,
      isFolderEnabled: false,
      isOpenInNewTab: true,
      isVisibleOnce: true,
    },
  };

  await page.locator('[data-starlit-part="settings-trigger"]').click();
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Import', exact: true }).click();
  const fileChooser = await fileChooserPromise;
  const reloadPromise = page.waitForEvent('load');
  await fileChooser.setFiles({
    buffer: Buffer.from(JSON.stringify(legacyBackup)),
    mimeType: 'application/json',
    name: 'starlit-v1-backup.json',
  });
  await reloadPromise;

  await expect
    .poll(async () => {
      const storage = await extension.readStorage('sync');
      return {
        backgroundMeta: storage.backgroundMeta,
        colorTheme: storage.colorTheme,
        gridSettings: storage.gridSettings,
        settings: storage.settings,
      };
    })
    .toMatchObject({
      backgroundMeta: { source: 'file', type: 'video', url: '' },
      colorTheme: { accent: '#7a2458', surface: '#faf6e9' },
      gridSettings: { gap: '3rem', icon: { borderRadius: 1, iconRadius: 1 } },
      settings: {
        iconLayout: 'horizontal',
        isExpandView: true,
        isOpenInNewTab: true,
      },
    });

  const syncStorage = await extension.readStorage('sync');
  expect(syncStorage.size).toBe(23);
  expect(syncStorage.iconSize).toBe(29);
  expect(syncStorage.locale).toBe('en');
  expect(syncStorage.groupPreferences).toEqual(preservedGroups);
  expect(syncStorage.bookmarkTreePrefs).toEqual(preservedTree);
  await expect
    .poll(() =>
      extension.readIndexedDbBlobBase64('starlit', 'media', 'backgroundMedia'),
    )
    .toBe(importedMediaBase64);
  const importedVideo = page.locator(
    'video[data-starlit-part="background-media"]',
  );
  await expect(importedVideo).toBeVisible();
  await expect(importedVideo).toHaveAttribute('src', /^blob:/);
});

test('saves settings and background drafts only after confirmation', async ({
  extension,
}) => {
  await extension.seedProfile(
    createProfileSeed({ locale: 'en', storageSchemaVersion: 2 }),
  );
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  async function stageDraft(): Promise<void> {
    await page.locator('[data-starlit-part="settings-trigger"]').click();
    const openInNewTab = page.getByRole('switch', {
      name: 'Open in new tab by default',
    });
    await openInNewTab.focus();
    await openInNewTab.press('Space');
    await expect(openInNewTab).toBeChecked();
    await page.getByRole('combobox', { name: 'Font' }).selectOption('system');
    await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
    await page
      .getByPlaceholder('Enter URL')
      .fill('https://example.test/draft-background.png');
  }

  await stageDraft();
  let syncStorage = await extension.readStorage('sync');
  expect(syncStorage.backgroundMeta).toBeUndefined();
  expect(syncStorage.settings).toBeUndefined();

  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.getByText('You have unsaved changes. Close anyway?'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await expect(
    page.locator('[data-starlit-part="settings-dialog"]'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await expect(
    page.locator('[data-starlit-part="settings-dialog"]'),
  ).toHaveCount(0);

  syncStorage = await extension.readStorage('sync');
  expect(syncStorage.backgroundMeta).toBeUndefined();
  expect(syncStorage.settings).toBeUndefined();

  await stageDraft();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect
    .poll(async () => {
      const storage = await extension.readStorage('sync');
      return {
        backgroundMeta: storage.backgroundMeta,
        settings: storage.settings,
      };
    })
    .toMatchObject({
      backgroundMeta: {
        source: 'url',
        type: 'image',
        url: 'https://example.test/draft-background.png',
      },
      settings: { fontFamily: 'system', isOpenInNewTab: true },
    });
  await expect(page.locator('[data-starlit-part="root"]')).toHaveCSS(
    'font-family',
    'system-ui, sans-serif',
  );
});

test('deletes a Chrome bookmark only after explicit confirmation', async ({
  extension,
}) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  const bookmark = page.getByRole('button', { name: 'Atlas 01' });

  await bookmark.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Delete bookmark' }).click();
  await expect(
    page.getByRole('alertdialog', { name: 'Delete from Chrome bookmarks?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  expect(
    await extension.serviceWorker.evaluate(async () =>
      chrome.bookmarks.search('Atlas 01'),
    ),
  ).toHaveLength(1);

  await bookmark.click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Delete bookmark' }).click();
  await page
    .getByRole('button', { name: 'Delete from Chrome', exact: true })
    .click();

  await expect
    .poll(() =>
      extension.serviceWorker.evaluate(async () =>
        chrome.bookmarks.search('Atlas 01'),
      ),
    )
    .toHaveLength(0);
  await expect(page.getByRole('button', { name: 'Atlas 02' })).toBeFocused();
});
