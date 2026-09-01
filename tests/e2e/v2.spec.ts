import { readFile } from 'node:fs/promises';
import type { Locator, Page, Worker } from '@playwright/test';

import { expect, test } from './extension.fixture';
import { createProfileSeed } from './profile';

type BookmarkTreeSnapshot = {
  children: BookmarkTreeSnapshot[];
  id: string;
  index: number | null;
  parentId: string | null;
  title: string;
  url: string | null;
};

type PortableBookmarkNodeSnapshot = {
  children?: PortableBookmarkNodeSnapshot[];
  id: string;
  title: string;
  url?: string;
};

type PortableProfileSnapshot = {
  assets?: Record<string, unknown>;
  bookmarks?: Record<
    string,
    { children: PortableBookmarkNodeSnapshot[]; rootId: string }
  >;
  categories: {
    bookmarkUrls: boolean;
    media: boolean;
    scenes: boolean;
  };
  schemaVersion: number;
  scenes: Array<{
    bookmarkCollection: {
      folderId: string | null;
      folderOwnership: string;
      folderPath: string[];
      recoverySnapshotId?: string;
    };
    id: string;
    name: string;
  }>;
};

type DownloadedProfile = {
  buffer: Buffer;
  profile: PortableProfileSnapshot;
};

async function captureBookmarkTree(): Promise<BookmarkTreeSnapshot[]> {
  function captureNode(
    node: chrome.bookmarks.BookmarkTreeNode,
  ): BookmarkTreeSnapshot {
    return {
      children: (node.children ?? []).map(captureNode),
      id: node.id,
      index: node.index ?? null,
      parentId: node.parentId ?? null,
      title: node.title,
      url: node.url ?? null,
    };
  }

  return (await chrome.bookmarks.getTree()).map(captureNode);
}

async function readBookmarkTreeFromPage(
  page: Page,
): Promise<BookmarkTreeSnapshot[]> {
  return page.evaluate(captureBookmarkTree);
}

async function readBookmarkTreeFromWorker(
  worker: Worker,
): Promise<BookmarkTreeSnapshot[]> {
  return worker.evaluate(captureBookmarkTree);
}

async function waitForBookmarks(page: Page): Promise<void> {
  await expect(page.locator('[data-starlit-part="root"]')).toBeVisible();
  await expect(
    page.locator('[data-starlit-part="bookmark-group-title"]').first(),
  ).toBeVisible();
}

async function openSettingsTab(page: Page, tabName: string): Promise<void> {
  const settingsDialog = page.locator('[data-starlit-part="settings-dialog"]');
  if (!(await settingsDialog.isVisible())) {
    await page.locator('[data-starlit-part="settings-trigger"]').click();
  }
  await page.getByRole('tab', { name: tabName, exact: true }).click();
}

async function prepareSceneCreation(
  page: Page,
  name: string,
): Promise<Locator> {
  await openSettingsTab(page, 'Scene');
  const scenePanel = page.locator('[data-starlit-part="settings-scene"]');
  await scenePanel.getByRole('textbox', { name: 'Scene name' }).fill(name);
  await scenePanel
    .getByRole('button', {
      name: /Save (?:current setup as|as new) Scene/u,
    })
    .click();

  const preview = page.getByRole('dialog', {
    name: 'Copy Chrome bookmarks?',
  });
  await expect(preview).toBeVisible();
  await expect(preview.getByText('Folders', { exact: true })).toBeVisible();
  await expect(preview.getByText('URLs', { exact: true })).toBeVisible();
  return preview;
}

async function createScene(page: Page, name: string): Promise<void> {
  const preview = await prepareSceneCreation(page, name);
  await preview
    .getByRole('button', { name: 'Confirm and create Scene' })
    .click();
  await expect(
    page.locator('[data-starlit-part="settings-dialog"]'),
  ).toHaveCount(0);
  await expect(page.locator('.starlit-scene-name')).toHaveText(name);
}

async function activatePaletteResult(
  page: Page,
  query: string,
  arrowDownCount = 1,
): Promise<void> {
  await page.keyboard.press('Control+K');
  const input = page.getByRole('combobox', {
    name: 'Search bookmarks, groups, Scenes, or settings',
  });
  await expect(input).toBeFocused();
  await input.fill(query);
  for (let index = 0; index < arrowDownCount; index += 1) {
    await input.press('ArrowDown');
  }
  await input.press('Enter');
}

async function downloadProfile(
  page: Page,
  exportButton: Locator,
): Promise<DownloadedProfile> {
  const downloadPromise = page.waitForEvent('download');
  await exportButton.click();
  const download = await downloadPromise;
  const path = await download.path();
  if (!path) {
    throw new Error('Portable profile download did not produce a local file.');
  }
  const buffer = await readFile(path);
  return {
    buffer,
    profile: JSON.parse(buffer.toString('utf8')) as PortableProfileSnapshot,
  };
}

test('does not write Chrome bookmarks until Scene creation is confirmed', async ({
  extension,
}) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const beforeOpen = await readBookmarkTreeFromWorker(extension.serviceWorker);
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  expect(await readBookmarkTreeFromPage(page)).toEqual(beforeOpen);

  const preview = await prepareSceneCreation(page, 'Focus');
  await expect(preview.getByText('3', { exact: true })).toBeVisible();
  await expect(preview.getByText('20', { exact: true })).toBeVisible();
  await expect(
    preview.getByRole('combobox', {
      name: 'Create the dedicated folder in',
    }),
  ).toHaveValue('2');
  expect(await readBookmarkTreeFromPage(page)).toEqual(beforeOpen);

  await preview
    .getByRole('button', { name: 'Confirm and create Scene' })
    .click();
  await expect(page.locator('.starlit-scene-name')).toHaveText('Focus');

  const result = await extension.serviceWorker.evaluate(async () => {
    const tree = await chrome.bookmarks.getTree();
    const bookmarksBar = tree[0]?.children?.[0];
    const otherBookmarks = tree[0]?.children?.[1];
    const container = otherBookmarks?.children?.find(
      ({ title, url }) => title === 'Starlit Scenes' && url === undefined,
    );
    const sceneFolder = container?.children?.find(
      ({ title, url }) => title === 'Focus' && url === undefined,
    );
    const local = await chrome.storage.local.get(['sceneIndex']);

    return {
      bookmarksBar: bookmarksBar
        ? {
            childTitles: (bookmarksBar.children ?? []).map(
              ({ title }) => title,
            ),
            id: bookmarksBar.id,
          }
        : null,
      sceneFolder: sceneFolder
        ? {
            childTitles: (sceneFolder.children ?? []).map(({ title }) => title),
            id: sceneFolder.id,
            parentId: sceneFolder.parentId,
          }
        : null,
      sceneIndex: local.sceneIndex,
    };
  });

  expect(result.bookmarksBar).toEqual({
    childTitles: [
      'Projects',
      ...Array.from(
        { length: 18 },
        (_, index) => `Atlas ${String(index + 1).padStart(2, '0')}`,
      ),
    ],
    id: '1',
  });
  expect(result.sceneFolder).toMatchObject({
    childTitles: [
      'Projects',
      ...Array.from(
        { length: 18 },
        (_, index) => `Atlas ${String(index + 1).padStart(2, '0')}`,
      ),
    ],
  });
  expect(result.sceneIndex).toMatchObject({
    activeSceneId: expect.any(String),
    sceneIds: [expect.any(String)],
    storageSchemaVersion: 3,
  });
});

test('adds an Image through the shared widget chooser', async ({
  extension,
}) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  await openSettingsTab(page, 'Widgets');
  await page.getByRole('button', { name: 'Add widget' }).click();
  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('menuitem', { name: 'Image' }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles('assets/overlays/getting.png');

  await expect(page.getByText('getting.png')).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('[data-overlay-image-id]')).toHaveCount(1);
});

test('previews a palette Scene switch without mutating the bookmark tree', async ({
  extension,
}) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  await createScene(page, 'Alpha');
  await createScene(page, 'Beta');
  const beforeSwitch = await readBookmarkTreeFromPage(page);

  await activatePaletteResult(page, 'Alpha', 2);
  const preview = page.getByRole('dialog', { name: 'Apply this Scene?' });
  await expect(preview).toContainText(
    'Appearance, layout, widgets, and the bookmark folder',
  );
  await expect(
    preview.getByText(/Other bookmarks \/ Starlit Scenes \/ Alpha/iu),
  ).toBeVisible();
  await page.keyboard.press('Control+K');
  await expect(
    page.getByRole('dialog', { name: 'Search Starlit' }),
  ).toHaveCount(0);
  expect(await readBookmarkTreeFromPage(page)).toEqual(beforeSwitch);

  await preview.getByRole('button', { name: 'Apply Scene' }).click();
  await expect(preview).toHaveCount(0);
  await expect(page.locator('.starlit-scene-name')).toHaveText('Alpha');
  expect(await readBookmarkTreeFromPage(page)).toEqual(beforeSwitch);
});

test('opens a palette bookmark in the current tab when configured', async ({
  extension,
}) => {
  await extension.seedProfile(
    createProfileSeed({
      locale: 'en',
      settings: { isOpenInNewTab: false },
    }),
  );
  await extension.context.route('https://example.com/lagrange', async (route) =>
    route.fulfill({ body: '<title>Lagrange target</title>', status: 200 }),
  );
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  await activatePaletteResult(page, 'Lagrange docs');

  await expect(page).toHaveURL('https://example.com/lagrange');
});

test('opens a palette bookmark in a new tab when configured', async ({
  extension,
}) => {
  await extension.seedProfile(
    createProfileSeed({
      locale: 'en',
      settings: { isOpenInNewTab: true },
    }),
  );
  await extension.context.route('https://example.com/lagrange', async (route) =>
    route.fulfill({ body: '<title>Lagrange target</title>', status: 200 }),
  );
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  const targetPromise = extension.context.waitForEvent('page');

  await activatePaletteResult(page, 'Lagrange docs');

  const target = await targetPromise;
  await expect(target).toHaveURL('https://example.com/lagrange');
  await expect(page).toHaveURL(
    new RegExp(`chrome-extension://${extension.extensionId}/`),
  );
});

test('supports palette empty state, focus restore, group navigation, and Settings deep-open', async ({
  extension,
}) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  const settingsTrigger = page.locator(
    '[data-starlit-part="settings-trigger"]',
  );

  await settingsTrigger.focus();
  await page.keyboard.press('Control+K');
  const input = page.getByRole('combobox', {
    name: 'Search bookmarks, groups, Scenes, or settings',
  });
  await input.fill('missing palette result');
  await expect(page.getByText('No matching items.')).toBeVisible();
  await input.press('Escape');
  await expect(settingsTrigger).toBeFocused();

  await activatePaletteResult(page, 'Appearance');
  const appearanceTab = page.getByRole('tab', {
    name: 'Appearance',
    exact: true,
  });
  await expect(
    page.locator('[data-starlit-part="settings-dialog"]'),
  ).toBeVisible();
  await expect(appearanceTab).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  const groupId = await extension.serviceWorker.evaluate(async () => {
    const matches = await chrome.bookmarks.search('Design systems');
    const folder = matches.find(
      ({ title, url }) => title === 'Design systems' && url === undefined,
    );
    if (!folder)
      throw new Error('Expected the Design systems bookmark folder.');
    return folder.id;
  });
  await activatePaletteResult(page, 'Design systems');
  await expect
    .poll(async () => {
      const storage = await extension.readStorage('local');
      const preferences = storage.bookmarkTreePrefs as
        | { rootId?: string }
        | undefined;
      return preferences?.rootId;
    })
    .toBe(groupId);
  await expect(
    page.getByRole('button', { name: 'Lagrange docs' }),
  ).toBeVisible();
});

test('exports independent Portable V4 categories and restores a full profile after reset', async ({
  extension,
}) => {
  const baseProfile = createProfileSeed(
    { locale: 'en' },
    { includeEmptyOverlayScene: false },
  );
  await extension.seedProfile({
    ...baseProfile,
    local: {
      ...baseProfile.local,
      'googleCalendar.selectedCalendarIds': ['private-calendar@example.test'],
      tutorialStatus: 'completed',
    },
  });
  await extension.serviceWorker.evaluate(async () => {
    await chrome.storage.session.set({
      'googleCalendar.eventCache.v1': {
        privateSummary: 'private-calendar-event',
      },
    });
  });
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  await expect(page.locator('[data-overlay-image-id]').first()).toBeVisible();
  await createScene(page, 'Round Trip');
  await openSettingsTab(page, 'Portable profile');

  const scenes = page.getByRole('checkbox', {
    name: 'Scenes, appearance, and layout',
  });
  const bookmarkUrls = page.getByRole('checkbox', {
    name: 'Chrome bookmark URLs',
  });
  const media = page.getByRole('checkbox', { name: 'Uploaded media' });
  const exportButton = page.getByRole('button', {
    name: 'Export',
    exact: true,
  });

  await expect(scenes).toBeChecked();
  await expect(bookmarkUrls).not.toBeChecked();
  await expect(media).not.toBeChecked();
  const defaultExport = await downloadProfile(page, exportButton);
  expect(defaultExport.profile).toMatchObject({
    categories: { bookmarkUrls: false, media: false, scenes: true },
    schemaVersion: 4,
    scenes: [
      {
        bookmarkCollection: {
          folderId: null,
          folderOwnership: 'external',
          folderPath: [],
        },
        name: 'Round Trip',
      },
    ],
  });
  expect(defaultExport.profile.assets).toBeUndefined();
  expect(defaultExport.profile.bookmarks).toBeUndefined();
  expect(
    defaultExport.profile.scenes[0]?.bookmarkCollection,
  ).not.toHaveProperty('recoverySnapshotId');

  await bookmarkUrls.focus();
  await bookmarkUrls.press('Space');
  await expect(bookmarkUrls).toBeChecked();
  await expect(
    page.getByText(/URLs or media can contain private information/u),
  ).toBeVisible();
  const bookmarksExport = await downloadProfile(page, exportButton);
  expect(bookmarksExport.profile.categories).toEqual({
    bookmarkUrls: true,
    media: false,
    scenes: true,
  });
  expect(
    Object.values(bookmarksExport.profile.bookmarks ?? {}).flat(),
  ).not.toHaveLength(0);
  expect(bookmarksExport.profile.assets).toBeUndefined();

  await bookmarkUrls.press('Space');
  await expect(bookmarkUrls).not.toBeChecked();
  await media.focus();
  await media.press('Space');
  await expect(media).toBeChecked();
  const mediaExport = await downloadProfile(page, exportButton);
  expect(mediaExport.profile.categories).toEqual({
    bookmarkUrls: false,
    media: true,
    scenes: true,
  });
  expect(Object.keys(mediaExport.profile.assets ?? {})).not.toHaveLength(0);
  expect(mediaExport.profile.bookmarks).toBeUndefined();

  await bookmarkUrls.focus();
  await bookmarkUrls.press('Space');
  await expect(bookmarkUrls).toBeChecked();
  const fullExport = await downloadProfile(page, exportButton);
  expect(fullExport.profile.categories).toEqual({
    bookmarkUrls: true,
    media: true,
    scenes: true,
  });
  const exportedJson = fullExport.buffer.toString('utf8');
  expect(exportedJson).not.toContain('private-calendar@example.test');
  expect(exportedJson).not.toContain('private-calendar-event');
  expect(exportedJson).not.toContain('tutorialStatus');

  await openSettingsTab(page, 'General');
  await page.getByRole('button', { name: 'Reset all' }).click();
  const resetDialog = page.getByRole('alertdialog', {
    name: 'Reset all Starlit data?',
  });
  await expect(resetDialog).toBeVisible();
  const reloadPromise = page.waitForEvent('load');
  await resetDialog.getByRole('button', { name: 'Permanently reset' }).click();
  await reloadPromise;
  await waitForBookmarks(page);
  expect((await extension.readStorage('local')).sceneIndex).toBeUndefined();

  await page.locator('[data-starlit-part="settings-trigger"]').click();
  await page.getByRole('tab', { name: 'Portable profile' }).click();
  await expect(
    page.locator('[data-starlit-part="settings-portable"]'),
  ).toBeVisible();
  await page
    .locator('[data-starlit-part="settings-portable"] input[type="file"]')
    .setInputFiles({
      buffer: fullExport.buffer,
      mimeType: 'application/json',
      name: 'starlit-profile-v4.json',
    });
  const importPreview = page.getByRole('dialog', {
    name: /^(?:Import preview|가져오기 미리보기)$/u,
  });
  await expect(importPreview).toContainText('Round Trip');
  await expect(importPreview).toContainText(
    /(?:Folders and URLs to copy|복사할 폴더와 URL)/u,
  );
  await importPreview
    .getByRole('button', { name: /^(?:Import|가져오기)$/u })
    .click();
  await expect(importPreview).toHaveCount(0);

  await openSettingsTab(page, 'Scene');
  const scenePanel = page.locator('[data-starlit-part="settings-scene"]');
  await expect(
    scenePanel.getByText('Round Trip', { exact: true }),
  ).toBeVisible();
  await scenePanel.getByRole('button', { name: 'Apply Scene' }).click();
  await expect(
    page.locator('[data-starlit-part="settings-dialog"]'),
  ).toHaveCount(0);
  await expect(page.locator('.starlit-scene-name')).toHaveText('Round Trip');
  await expect(page.getByRole('button', { name: 'Atlas 01' })).toBeVisible();
  await expect(page.locator('[data-overlay-image-id]').first()).toBeVisible();
});
