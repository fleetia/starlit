import type { Page } from '@playwright/test';

import type { GridSettings } from '../../src/newtab/types';
import { expect, test } from './extension.fixture';
import { LEGACY_THEME } from './profile';

const CUSTOM_GRID_SETTINGS = {
  background: {
    border: '3px double #36414c',
    color: '#17222d',
    text: '#e6e7e8',
  },
  columns: 5,
  gap: '2rem',
  heading: {
    titleBackgroundColor: '#ead6a8',
    borderColor: '#c15b73',
    borderEnabled: true,
    borderRadius: 13,
    borderWidth: 1,
    subtitleColor: '#48535e',
    subtitleHoverColor: '#652a79',
    subtitleSize: 11,
    titleColor: '#5b206f',
    titleSize: 18,
  },
  horizontalColumns: 1,
  icon: {
    border: '2px dotted #4e595a',
    borderRadius: 11,
    color: '#d2d3d4',
    height: 4,
    iconRadius: 9,
    text: '#202b36',
    width: 5,
  },
  folder: {
    accent: '#58632c',
    accentText: '#faf9f0',
    border: '#695c6a',
    color: '#bebfc0',
    text: '#2a1f33',
  },
  margin: { bottom: 0, left: 0, right: 0, top: 0 },
  position: 'center-center',
  rows: 3,
} satisfies GridSettings;

async function waitForBookmarks(page: Page): Promise<void> {
  await expect(page.locator('[data-starlit-part="root"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Atlas 01' })).toBeVisible();
}

test('renders persisted visual leaves in the live surface and settings preview', async ({
  extension,
}) => {
  await extension.seedProfile({
    bookmarkRoots: [
      [
        {
          children: [
            {
              children: [
                {
                  title: 'Project note',
                  url: 'https://example.com/project-note',
                },
              ],
              title: 'Projects',
            },
            {
              title: 'Atlas 01',
              url: 'https://example.com/atlas-01',
            },
          ],
          title: 'Visual leaves',
        },
      ],
    ],
    sync: {
      bookmarkTreePrefs: {
        rootPath: ['Bookmarks Bar'],
        siblingOrder: {},
      },
      colorTheme: LEGACY_THEME,
      customCSS:
        '#root [data-starlit-part="bookmark-tile"] { outline-color: rgb(1, 2, 3); }\n' +
        '#root [data-starlit-part="bookmark-tile"][data-kind="folder"] { border-style: solid; }',
      gridSettings: CUSTOM_GRID_SETTINGS,
      iconSize: 24,
      locale: 'en',
      settings: {
        iconLayout: 'vertical',
        isExpandView: false,
        isFolderEnabled: true,
        isOpenInNewTab: false,
        isVisibleOnce: false,
      },
      size: 20,
      storageSchemaVersion: 2,
    },
  });
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  const group = page.locator('[data-starlit-part="bookmark-group"]').first();
  const title = group.locator('[aria-current="page"]');
  const route = group.locator('[data-starlit-part="bookmark-route"]');
  const bookmark = page.getByRole('button', { name: 'Atlas 01' });
  const folder = page.getByRole('button', { name: 'Projects' });
  const folderIcon = folder.locator('[data-starlit-part="bookmark-tile-icon"]');

  await expect(group).toHaveCSS('background-color', 'rgb(23, 34, 45)');
  await expect(group).toHaveCSS('border-top-color', 'rgb(54, 65, 76)');
  await expect(group).toHaveCSS('border-top-style', 'double');
  await expect(group).toHaveCSS('border-top-width', '3px');
  await expect(group).toHaveCSS('border-radius', '13px');
  await expect(group).toHaveCSS('color', 'rgb(230, 231, 232)');
  await expect(title).toHaveCSS('color', 'rgb(91, 32, 111)');
  await expect(title).toHaveCSS('background-color', 'rgb(234, 214, 168)');
  await expect(title).toHaveCSS('font-size', '18px');
  expect(
    await title.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        color: style.getPropertyValue('-webkit-text-stroke-color'),
        width: style.getPropertyValue('-webkit-text-stroke-width'),
      };
    }),
  ).toEqual({ color: 'rgb(193, 91, 115)', width: '1px' });
  await expect(route).toHaveCSS('color', 'rgb(72, 83, 94)');
  await expect(route).toHaveCSS('font-size', '11px');
  await route.hover();
  await expect(route).toHaveCSS('color', 'rgb(101, 42, 121)');

  await expect(bookmark).toHaveCSS('background-color', 'rgb(210, 211, 212)');
  await expect(bookmark).toHaveCSS('border-top-color', 'rgb(78, 89, 90)');
  await expect(bookmark).toHaveCSS('border-top-style', 'dotted');
  await expect(bookmark).toHaveCSS('border-top-width', '2px');
  await expect(bookmark).toHaveCSS('border-radius', '11px');
  await expect(bookmark).toHaveCSS('color', 'rgb(32, 43, 54)');
  await expect(bookmark).toHaveCSS('outline-color', 'rgb(1, 2, 3)');
  expect(
    await bookmark.evaluate((element) => {
      const style = getComputedStyle(element);
      const paged = element.closest('[data-starlit-part="paged-groups"]');

      return {
        height: element.getBoundingClientRect().height,
        iconHeight: style.getPropertyValue('--icon-height'),
        iconWidth: style.getPropertyValue('--icon-width'),
        pagedWidth: paged ? getComputedStyle(paged).width : null,
        width: element.getBoundingClientRect().width,
      };
    }),
  ).toEqual({
    height: 80,
    iconHeight: '80px',
    iconWidth: '100px',
    pagedWidth: '692px',
    width: 100,
  });

  await expect(folder).toHaveCSS('background-color', 'rgb(190, 191, 192)');
  await expect(folder).toHaveCSS('border-top-color', 'rgb(78, 89, 90)');
  await expect(folder).toHaveCSS('border-top-style', 'solid');
  await expect(folder).toHaveCSS('color', 'rgb(42, 31, 51)');
  await expect(folderIcon).toHaveCSS('background-color', 'rgb(88, 99, 44)');
  await expect(folderIcon).toHaveCSS('border-top-color', 'rgb(105, 92, 106)');
  await expect(folderIcon).toHaveCSS('color', 'rgb(250, 249, 240)');
  await expect(folderIcon).toHaveCSS('border-radius', '9px');

  await page.locator('[data-starlit-part="settings-trigger"]').click();
  const settingsDialog = page.locator('[data-starlit-part="settings-dialog"]');
  await expect(settingsDialog).toHaveCSS(
    'background-color',
    'rgb(250, 246, 233)',
  );
  await expect(settingsDialog).toHaveCSS('color', 'rgb(48, 42, 51)');
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
  const preview = page
    .locator('[data-starlit-part="settings-preview"]:visible')
    .first();
  const previewGroup = preview.locator('[data-starlit-part="bookmark-group"]');
  const previewBookmark = preview.locator(
    '[data-starlit-part="bookmark-tile"][data-kind="bookmark"]',
  );
  const previewFolderIcon = preview.locator(
    '[data-starlit-part="bookmark-tile-icon"][data-kind="folder"]',
  );

  await expect(previewGroup).toHaveAttribute('inert', '');
  await expect(previewGroup).toHaveCSS('background-color', 'rgb(23, 34, 45)');
  await expect(previewGroup.locator('[aria-current="page"]')).toHaveCSS(
    'font-size',
    '18px',
  );
  await expect(previewGroup.locator('[aria-current="page"]')).toHaveCSS(
    'background-color',
    'rgb(234, 214, 168)',
  );
  await expect(previewBookmark).toHaveCSS(
    'background-color',
    'rgb(210, 211, 212)',
  );
  await expect(previewFolderIcon).toHaveCSS('color', 'rgb(250, 249, 240)');
});
