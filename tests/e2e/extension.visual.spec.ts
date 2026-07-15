import type { Page } from '@playwright/test';

import { expect, test } from './extension.fixture';
import { createProfileSeed } from './profile';

async function waitForBookmarks(page: Page): Promise<void> {
  await expect(page.locator('[data-starlit-part="root"]')).toBeVisible();
  await page.getByRole('button', { name: 'Bookmarks Bar' }).click();
  await expect(page.getByRole('button', { name: 'Atlas 01' })).toBeVisible();
}

test('paged Lagrange canvas', async ({ extension }) => {
  await extension.seedProfile(createProfileSeed());
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  await expect(page).toHaveScreenshot('paged.png', { fullPage: false });
});

test('masonry with horizontal bookmark tiles', async ({ extension }) => {
  await extension.seedProfile(
    createProfileSeed({
      settings: {
        iconLayout: 'horizontal',
        isExpandView: true,
        isFolderEnabled: true,
        isOpenInNewTab: false,
        isVisibleOnce: false,
      },
      storageSchemaVersion: 2,
    }),
  );
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  await expect(
    page.locator('[data-starlit-part="expanded-groups"]'),
  ).toBeVisible();
  await expect(
    page.locator('[data-layout="horizontal"]').first(),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('masonry-horizontal.png', {
    fullPage: false,
  });
});

test('settings dialog', async ({ extension }) => {
  await extension.seedProfile(createProfileSeed());
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  await page.locator('[data-starlit-part="settings-trigger"]').click();
  await expect(
    page.locator('[data-starlit-part="settings-dialog"]'),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('settings.png', { fullPage: false });
});
