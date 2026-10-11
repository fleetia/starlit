import type { Locator, Page } from '@playwright/test';

import { expect, test } from './extension.fixture';
import { createProfileSeed } from './profile';

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

async function activatePaletteResult(page: Page, query: string): Promise<void> {
  await page.keyboard.press('Control+K');
  const input = page.getByRole('combobox', {
    name: 'Search bookmarks, groups, Scenes, or settings',
  });
  await expect(input).toBeFocused();
  await input.fill(query);
  await input.press('ArrowDown');
  await input.press('ArrowDown');
  await input.press('Enter');
}

test('Scene creation preview', async ({ extension }) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  const preview = await prepareSceneCreation(page, 'Deep Focus');

  await expect(preview).toContainText('Folders');
  await expect(preview).toContainText('20');
  await expect(page).toHaveScreenshot('scene-create-preview.png', {
    fullPage: false,
  });
});

test('Command palette bookmark search', async ({ extension }) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  await page.keyboard.press('Control+K');
  const input = page.getByRole('combobox', {
    name: 'Search bookmarks, groups, Scenes, or settings',
  });
  await input.fill('Atlas 0');
  await expect(page.getByRole('option')).toHaveCount(9);
  await expect(page).toHaveScreenshot('command-palette.png', {
    fullPage: false,
  });
});

test('active Scene toolbar keeps a long name quiet', async ({ extension }) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  const sceneName = 'Quiet Deep Focus for Product Research and Writing';
  await createScene(page, sceneName);

  await expect(page.locator('.starlit-scene-name')).toHaveText(sceneName);
  await expect(page).toHaveScreenshot('active-scene-toolbar.png', {
    fullPage: false,
  });
});

test('Scene apply preview shows the incoming resources', async ({
  extension,
}) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  await createScene(page, 'Alpha');
  await createScene(page, 'Beta');

  await activatePaletteResult(page, 'Alpha');
  const preview = page.getByRole('dialog', { name: 'Apply this Scene?' });
  await expect(
    preview.getByText(/Other bookmarks \/ Starlit Scenes \/ Alpha/iu),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('scene-apply-preview.png', {
    fullPage: false,
  });
});

test('widget type chooser', async ({ extension }) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  await openSettingsTab(page, 'Widgets');
  await page.getByRole('button', { name: 'Add widget' }).click();
  await expect(
    page.getByRole('menu', { name: 'Choose a widget' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('widget-type-chooser.png', {
    fullPage: false,
  });
});

test('Clock widget remains secondary to bookmarks', async ({ extension }) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  await createScene(page, 'Clock');
  await openSettingsTab(page, 'Widgets');
  await page.getByRole('button', { name: 'Add widget' }).click();
  await page.getByRole('menuitem', { name: 'Clock' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Edit Canvas items' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('clock-widget-editor.png', {
    fullPage: false,
  });
  await page.getByRole('button', { name: 'Back to settings' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await expect(
    page.locator('[data-starlit-part="widget-clock"]'),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('clock-widget.png', {
    fullPage: false,
  });
});

test('image widget position editor', async ({ extension }) => {
  await extension.seedProfile(
    createProfileSeed({ locale: 'en' }, { includeEmptyOverlayScene: false }),
  );
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  await expect(page.locator('[data-overlay-image-id]').first()).toBeVisible();

  await openSettingsTab(page, 'Widgets');
  await page.getByRole('button', { name: 'Edit positions' }).click();
  await expect(
    page.locator('[data-starlit-part="overlay-position-editor"]'),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('decorative-image-editor.png', {
    fullPage: false,
  });
});

test('Calendar consent before subscription', async ({ extension }) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  await createScene(page, 'Calendar');

  await openSettingsTab(page, 'Widgets');
  await page.getByRole('button', { name: 'Add widget' }).click();
  await page.getByRole('menuitem', { name: 'Calendar' }).click();
  await page
    .getByRole('textbox', { name: 'Calendar URL' })
    .fill('webcal://calendar.example.test/private.ics');
  const subscribeButton = page.getByRole('button', {
    name: 'Allow and subscribe',
  });
  await expect(subscribeButton).toBeEnabled();
  await subscribeButton.scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot('calendar-consent.png', {
    fullPage: false,
  });
});

test('Calendar feed error stays beside consent', async ({ extension }) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  await extension.serviceWorker.evaluate(() => {
    Object.defineProperty(chrome.permissions, 'contains', {
      configurable: true,
      value: async () => true,
    });
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: async () =>
        new Response('<html>not an iCalendar feed</html>', {
          headers: { 'content-type': 'text/html' },
          status: 200,
        }),
    });
  });
  const page = await extension.openNewTab();
  await page.evaluate(() => {
    Object.defineProperty(chrome.permissions, 'request', {
      configurable: true,
      value: async () => true,
    });
  });
  await waitForBookmarks(page);
  await createScene(page, 'Calendar Error');
  await openSettingsTab(page, 'Widgets');
  await page.getByRole('button', { name: 'Add widget' }).click();
  await page.getByRole('menuitem', { name: 'Calendar' }).click();
  await page
    .getByRole('textbox', { name: 'Calendar URL' })
    .fill('https://calendar.example.test/invalid.ics');
  await page.getByRole('button', { name: 'Allow and subscribe' }).click();

  const error = page
    .getByRole('dialog', { name: 'Edit Canvas items' })
    .getByText('Events could not be loaded.');
  await expect(error).toBeVisible();
  await error.scrollIntoViewIfNeeded();
  await expect(page).toHaveScreenshot('calendar-connection-error.png', {
    fullPage: false,
  });
});

test('Scene missing bookmark recovery', async ({ extension }) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);
  await createScene(page, 'Recover Me');
  await extension.serviceWorker.evaluate(async () => {
    const matches = await chrome.bookmarks.search('Recover Me');
    const sceneFolder = matches.find(
      ({ title, url }) => title === 'Recover Me' && url === undefined,
    );
    if (!sceneFolder) throw new Error('Expected the Scene bookmark folder.');
    await chrome.bookmarks.removeTree(sceneFolder.id);
  });

  await openSettingsTab(page, 'Scene');
  await expect(
    page.getByText(
      'This Scene cannot be applied because a bookmark folder or media file is missing.',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Restore recovery snapshot' }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot('scene-missing-recovery.png', {
    fullPage: false,
  });
});
