import type { Page } from '@playwright/test';

import {
  DEFAULT_OVERLAY_IMAGE_ID,
  DEFAULT_OVERLAY_SCENE,
  getOverlayMediaKey,
} from '../../src/overlays/model';
import { expect, tabGroupTest, test } from './extension.fixture';
import {
  createProfileSeed,
  LEGACY_GRID_SETTINGS,
  LEGACY_THEME,
} from './profile';

const LEGACY_MEDIA_TEXT = '<svg xmlns="http://www.w3.org/2000/svg" />';
const OVERLAY_MEDIA_BASE64 = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="40"><rect width="80" height="40" fill="#7a2458" /></svg>',
).toString('base64');

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
  await expect(
    page.locator('[data-starlit-part="bookmark-group-title"]').first(),
  ).toBeVisible();
}

test('seeds the bundled default overlay at the bottom right', async ({
  extension,
}) => {
  await extension.seedProfile(
    createProfileSeed({ locale: 'en' }, { includeEmptyOverlayScene: false }),
  );
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  const overlay = page.locator(
    `[data-overlay-image-id="${DEFAULT_OVERLAY_IMAGE_ID}"]`,
  );
  await expect(overlay).toBeVisible();
  await expect(overlay).toHaveCSS('right', '24px');
  await expect(overlay).toHaveCSS('bottom', '24px');
  await expect(overlay).toHaveCSS('width', '392px');
  await expect(overlay).toHaveCSS('height', '351px');
  expect(
    await overlay.evaluate((image) =>
      image instanceof HTMLImageElement
        ? { height: image.naturalHeight, width: image.naturalWidth }
        : null,
    ),
  ).toEqual({ height: 351, width: 392 });
  expect((await extension.readStorage('local')).overlayScene).toEqual(
    DEFAULT_OVERLAY_SCENE,
  );
  expect(
    await extension.readIndexedDbBlobBase64(
      'starlit',
      'media',
      getOverlayMediaKey(DEFAULT_OVERLAY_IMAGE_ID),
    ),
  ).not.toBeNull();
});

test('renders overlay images around bookmarks and keeps anchor offsets on resize', async ({
  extension,
}) => {
  const profile = createProfileSeed({ locale: 'en' });
  await extension.seedProfile({
    ...profile,
    indexedDb: ['below', 'above'].map((id) => ({
      base64: OVERLAY_MEDIA_BASE64,
      databaseName: 'starlit',
      key: `overlayImage:${id}`,
      mimeType: 'image/svg+xml',
      storeName: 'media',
    })),
    local: {
      ...profile.local,
      overlayScene: {
        layers: [
          {
            anchor: 'top-left',
            height: 40,
            id: 'below',
            kind: 'image',
            name: 'below.svg',
            offsetX: 16,
            offsetY: 20,
            rotationDeg: 0,
            width: 80,
          },
          { kind: 'bookmarks' },
          {
            anchor: 'bottom-center',
            height: 40,
            id: 'above',
            kind: 'image',
            name: 'above.svg',
            offsetX: 30,
            offsetY: 40,
            rotationDeg: 0,
            scale: 1.5,
            width: 80,
          },
        ],
      },
    },
  });
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  const below = page.locator(
    '[data-overlay-stack="below"] [data-overlay-image-id="below"]',
  );
  const above = page.locator(
    '[data-overlay-stack="above"] [data-overlay-image-id="above"]',
  );
  await expect(below).toBeVisible();
  await expect(above).toBeVisible();
  await expect(below).toHaveCSS('left', '16px');
  await expect(below).toHaveCSS('top', '20px');
  await expect(below).toHaveCSS('width', '80px');
  await expect(below).toHaveCSS('height', '40px');
  await expect(above).toHaveCSS('bottom', '40px');
  await expect(above).toHaveCSS('width', '120px');
  await expect(above).toHaveCSS('height', '60px');
  await expect(above).toHaveCSS('pointer-events', 'none');
  await expect(page.locator('[data-starlit-part="paged-groups"]')).toHaveCSS(
    'z-index',
    '1',
  );

  await page.setViewportSize({ height: 720, width: 1000 });
  const resizedBox = await above.boundingBox();
  expect(resizedBox).not.toBeNull();
  expect(
    Math.round((resizedBox?.x ?? 0) + (resizedBox?.width ?? 0) / 2 - 1000 / 2),
  ).toBe(30);
  expect(
    Math.round(720 - (resizedBox?.y ?? 0) - (resizedBox?.height ?? 0)),
  ).toBe(40);

  await page.locator('[data-starlit-part="settings-trigger"]').click();
  await page.getByRole('tab', { name: 'Layers', exact: true }).click();
  await expect(
    page.locator('[data-starlit-part="settings-layers"] li'),
  ).toHaveText([/above\.svg/u, /Bookmarks/u, /below\.svg/u]);
});

test('shows the first-install tutorial once and persists completion', async ({
  extension,
}) => {
  const page = await extension.openNewTab();

  await expect(
    page.getByRole('dialog', { name: 'Your bookmarks, already here' }),
  ).toBeVisible();
  await expect(page.getByText('Step 1 of 4')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Browse folders and reopen a group' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Next' }).click();

  const fullGuideLink = page.getByRole('link', {
    name: 'Open the full guide',
  });
  const tabGroupsGuideLink = page.getByRole('link', {
    name: 'Read about Chrome tab groups',
  });
  await expect(fullGuideLink).toHaveAttribute(
    'href',
    /guide\.html\?locale=en#getting-started$/,
  );
  await expect(tabGroupsGuideLink).toHaveAttribute(
    'href',
    /guide\.html\?locale=en#tab-groups$/,
  );
  await page.getByRole('button', { name: 'Finish' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect
    .poll(async () => (await extension.readStorage('local')).tutorialStatus)
    .toBe('completed');

  const nextPage = await extension.openNewTab();
  await expect(nextPage.getByRole('dialog')).toHaveCount(0);
});

test('opens the guide from Settings and focuses a localized section', async ({
  extension,
}) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  await page.locator('[data-starlit-part="settings-trigger"]').click();

  const guideLink = page.getByRole('link', {
    name: 'Open the full user guide',
  });
  await expect(guideLink).toHaveAttribute(
    'href',
    /guide\.html\?locale=en#getting-started$/,
  );
  const guidePagePromise = page.waitForEvent('popup');
  await guideLink.click();
  const guidePage = await guidePagePromise;
  await expect(
    guidePage.getByRole('heading', { level: 1, name: 'Starlit user guide' }),
  ).toBeVisible();
  const guideScreenshots = guidePage.locator('img[src^="/assets/guide/"]');
  const overviewScreenshot = guidePage.locator(
    'img[src="/assets/guide/new-tab-overview.jpg"]',
  );

  await expect(guideScreenshots).toHaveCount(7);
  await expect(overviewScreenshot).toBeVisible();
  expect(
    await overviewScreenshot.evaluate((image) =>
      image instanceof HTMLImageElement ? image.naturalWidth : 0,
    ),
  ).toBeGreaterThan(0);

  await guidePage.goto(
    `chrome-extension://${extension.extensionId}/guide.html?locale=ja#tab-groups`,
  );
  const localizedSection = guidePage.getByRole('heading', {
    level: 2,
    name: 'Chrome タブグループの取り込みと再オープン',
  });
  await expect(localizedSection).toBeVisible();
  await expect(localizedSection).toBeFocused();
  await expect(guidePage.locator('html')).toHaveAttribute('lang', 'ja');
});

tabGroupTest(
  'confirms before opening every non-empty folder as a tab group',
  async ({ extension }) => {
    await extension.seedProfile(createProfileSeed({ locale: 'en' }));
    const page = await extension.openNewTab();
    await waitForBookmarks(page);

    await page
      .getByRole('button', { name: 'Design systems', exact: true })
      .click();
    await page
      .getByRole('button', {
        name: 'Design systems: Open this folder as a tab group',
        exact: true,
      })
      .click();

    const confirmation = page.getByRole('alertdialog', {
      name: 'Open bookmarks as a tab group?',
    });
    await expect(confirmation).toContainText('Design systems: 1 tab.');
    expect(
      await extension.serviceWorker.evaluate(async () =>
        (await chrome.tabGroups.query({})).some(
          ({ title }) => title === 'Design systems',
        ),
      ),
    ).toBe(false);

    await confirmation.getByRole('button', { name: 'Cancel' }).click();
    await expect(confirmation).toHaveCount(0);
  },
);

tabGroupTest(
  'opens direct bookmarks as a new native tab group in bookmark order',
  async ({ extension }) => {
    await extension.seedProfile(createProfileSeed({ locale: 'en' }));
    const page = await extension.openNewTab();
    await waitForBookmarks(page);

    await page
      .locator('[data-starlit-part="bookmark-group-title"]')
      .first()
      .click();
    const confirmation = page.getByRole('alertdialog', {
      name: 'Open bookmarks as a tab group?',
    });
    await expect(confirmation).toContainText('Bookmarks Bar: 18 tabs.');
    await confirmation.getByRole('button', { name: 'Open tab group' }).click();
    await expect(page.getByRole('status')).toContainText(
      '18 bookmarks opened as a tab group.',
    );

    const result = await extension.serviceWorker.evaluate(async () => {
      const groups = await chrome.tabGroups.query({});
      const group = groups.find(({ title }) => title === 'Bookmarks Bar');

      if (!group) {
        throw new Error('Expected the new Bookmarks Bar tab group.');
      }

      const tabs = (await chrome.tabs.query({ groupId: group.id })).sort(
        (left, right) => left.index - right.index,
      );
      const [starlitTab] = await chrome.tabs.query({
        url: chrome.runtime.getURL('index.html'),
      });
      const activeTab = tabs.find(({ active }) => active);

      return {
        activeUrl: activeTab?.url || activeTab?.pendingUrl,
        starlitGroupId: starlitTab?.groupId,
        title: group.title,
        urls: tabs.map(({ pendingUrl, url }) => url || pendingUrl),
      };
    });

    expect(result.title).toBe('Bookmarks Bar');
    expect(result.starlitGroupId).toBe(-1);
    expect(result.activeUrl).toBe('https://example.com/atlas-1');
    expect(result.urls).toEqual(
      Array.from(
        { length: 18 },
        (_, index) => `https://example.com/atlas-${index + 1}`,
      ),
    );
  },
);

tabGroupTest(
  'imports an open native tab group into Chrome bookmarks',
  async ({ extension }) => {
    await extension.seedProfile(createProfileSeed({ locale: 'en' }));
    const page = await extension.openNewTab();
    await waitForBookmarks(page);
    await extension.serviceWorker.evaluate(async () => {
      const [starlitTab] = await chrome.tabs.query({
        url: chrome.runtime.getURL('index.html'),
      });

      if (!starlitTab) {
        throw new Error('Expected the Starlit tab.');
      }

      const first = await chrome.tabs.create({
        active: false,
        url: 'https://example.test/import-one.png',
        windowId: starlitTab.windowId,
      });
      const second = await chrome.tabs.create({
        active: false,
        url: 'https://example.test/import-two.png',
        windowId: starlitTab.windowId,
      });

      if (first.id === undefined || second.id === undefined) {
        throw new Error('Expected created Chrome tab IDs.');
      }

      const groupId = await chrome.tabs.group({
        tabIds: [first.id, second.id],
      });
      await chrome.tabGroups.update(groupId, { title: 'Imported Work' });

      for (let attempt = 0; attempt < 100; attempt += 1) {
        const tabs = await Promise.all([
          chrome.tabs.get(first.id),
          chrome.tabs.get(second.id),
        ]);

        if (tabs.every(({ status, url }) => status === 'complete' && url)) {
          return;
        }

        await new Promise((resolveAttempt) => setTimeout(resolveAttempt, 25));
      }

      throw new Error('Source tabs did not finish loading.');
    });
    await page.locator('[data-starlit-part="settings-trigger"]').click();
    await page.getByRole('tab', { name: 'Bookmark groups' }).click();
    await page
      .getByRole('button', { name: 'Import Chrome tab groups' })
      .click();
    const importer = page.getByRole('dialog', {
      name: 'Import Chrome tab groups',
    });
    await expect(importer).toBeVisible();
    await importer.getByRole('checkbox', { name: 'Imported Work' }).check();
    await importer
      .getByRole('button', { name: 'Import selected groups' })
      .click();
    await expect(importer).toContainText('Import result: 1 imported');

    const imported = await extension.serviceWorker.evaluate(async () => {
      const matches = await chrome.bookmarks.search('Imported Work');
      const folder = matches.find(
        ({ title, url }) => title === 'Imported Work' && url === undefined,
      );

      if (!folder) {
        throw new Error('Expected imported bookmark folder.');
      }

      const children = await chrome.bookmarks.getChildren(folder.id);
      return children.map(({ url }) => url);
    });

    expect(imported).toEqual([
      'https://example.test/import-one.png',
      'https://example.test/import-two.png',
    ]);
  },
);

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
