import type { Locator, Page } from '@playwright/test';

import { expect, test } from './extension.fixture';
import { createExpandedColumnsProfileSeed, createProfileSeed } from './profile';

const GROUP_SELECTOR = ':scope > [data-starlit-part="bookmark-group"]';

async function getGroupTitles(column: Locator): Promise<string[]> {
  const titles = await column
    .locator(GROUP_SELECTOR)
    .locator('[aria-current="page"]')
    .allTextContents();

  return titles.map((title) => title.trim());
}

async function getExpandedStates(groups: Locator): Promise<(string | null)[]> {
  return groups.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute('data-expanded')),
  );
}

async function getExpandedGroupHeights(column: Locator): Promise<number[]> {
  return column
    .locator(`${GROUP_SELECTOR}[data-expanded="true"]`)
    .evaluateAll((groups) =>
      groups.map((group) => group.getBoundingClientRect().height),
    );
}

async function expectEqualExpandedGroupHeights(column: Locator): Promise<void> {
  const heights = await getExpandedGroupHeights(column);

  expect(heights.length).toBeGreaterThan(0);
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1);
}

async function waitForBookmarks(page: Page): Promise<void> {
  await expect(page.locator('[data-starlit-part="root"]')).toBeVisible();
  await page.getByRole('button', { name: 'Bookmarks Bar' }).click();
  await expect(page.getByRole('button', { name: 'Atlas 01' })).toBeVisible();
}

type PlacementMetrics = {
  content: { bottom: number; left: number; right: number; top: number };
  group: { bottom: number; centerY: number; height: number };
  surface: { centerX: number; right: number; width: number };
};

async function getPlacementMetrics(
  surface: Locator,
): Promise<PlacementMetrics> {
  return surface.evaluate((element) => {
    const main = element.closest('[data-starlit-part="main"]');
    const group = element.querySelector('[data-starlit-part="bookmark-group"]');

    if (!(main instanceof HTMLElement) || !(group instanceof HTMLElement)) {
      throw new Error('Expected expanded placement elements');
    }

    const mainStyle = window.getComputedStyle(main);
    const mainRect = main.getBoundingClientRect();
    const surfaceRect = element.getBoundingClientRect();
    const groupRect = group.getBoundingClientRect();

    return {
      content: {
        bottom: mainRect.bottom - Number.parseFloat(mainStyle.paddingBottom),
        left: mainRect.left + Number.parseFloat(mainStyle.paddingLeft),
        right: mainRect.right - Number.parseFloat(mainStyle.paddingRight),
        top: mainRect.top + Number.parseFloat(mainStyle.paddingTop),
      },
      group: {
        bottom: groupRect.bottom,
        centerY: groupRect.top + groupRect.height / 2,
        height: groupRect.height,
      },
      surface: {
        centerX: surfaceRect.left + surfaceRect.width / 2,
        right: surfaceRect.right,
        width: surfaceRect.width,
      },
    };
  });
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
  const group = page.locator('[data-starlit-part="bookmark-group"]').first();
  const header = group.locator('[data-starlit-part="bookmark-group-header"]');
  const grid = group.locator('[data-starlit-part="bookmark-grid"]');

  await expect(grid).toBeVisible();
  const viewport = page.viewportSize();
  const groupBox = await group.boundingBox();
  const headerBoxBeforeScroll = await header.boundingBox();

  expect(viewport).not.toBeNull();
  expect(groupBox).not.toBeNull();
  expect(headerBoxBeforeScroll).not.toBeNull();

  if (!viewport || !groupBox || !headerBoxBeforeScroll) {
    throw new Error('Expected masonry layout metrics');
  }

  expect(groupBox.y + groupBox.height).toBeLessThanOrEqual(viewport.height + 1);

  const scrollMetrics = await grid.evaluate((element) => ({
    clientHeight: element.clientHeight,
    overflowY: window.getComputedStyle(element).overflowY,
    scrollHeight: element.scrollHeight,
  }));

  expect(scrollMetrics.overflowY).toBe('auto');
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(
    scrollMetrics.clientHeight,
  );
  await expect(page).toHaveScreenshot('masonry-horizontal.png', {
    fullPage: false,
  });

  await grid.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });

  await expect(page.getByRole('button', { name: 'Atlas 18' })).toBeInViewport();
  const headerBoxAfterScroll = await header.boundingBox();

  expect(headerBoxAfterScroll).not.toBeNull();

  if (!headerBoxAfterScroll) {
    throw new Error('Expected masonry header metrics after scrolling');
  }

  expect(headerBoxAfterScroll.y).toBeCloseTo(headerBoxBeforeScroll.y, 1);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('expanded groups stay in fixed columns with shared height', async ({
  extension,
}) => {
  await extension.seedProfile(createExpandedColumnsProfileSeed());
  const page = await extension.openNewTab();
  const surface = page.locator('[data-starlit-part="expanded-groups"]');
  const columns = surface.locator(':scope > .starlit-masonry__column');

  await expect(surface).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Group 01', exact: true }),
  ).toBeVisible();

  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error('Expected expanded layout viewport metrics');
  }

  if (viewport.width <= 720) {
    await expect(columns).toHaveCount(1);
    const column = columns.first();
    const groups = column.locator(GROUP_SELECTOR);

    await expect(groups).toHaveCount(9);
    expect(await getGroupTitles(column)).toEqual(
      Array.from(
        { length: 9 },
        (_, index) => `Group ${String(index + 1).padStart(2, '0')}`,
      ),
    );

    const expandedStates = await getExpandedStates(groups);
    const expandedCount = expandedStates.filter(
      (state) => state === 'true',
    ).length;

    expect(expandedCount).toBeGreaterThan(0);
    expect(expandedCount).toBeLessThan(9);

    const columnScrollMetrics = await column.evaluate((element) => ({
      clientHeight: element.clientHeight,
      overflowY: window.getComputedStyle(element).overflowY,
      scrollHeight: element.scrollHeight,
    }));

    expect(columnScrollMetrics.overflowY).toBe('auto');
    expect(columnScrollMetrics.scrollHeight).toBeGreaterThan(
      columnScrollMetrics.clientHeight,
    );
    await column.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    await expect(groups.last()).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await column.evaluate((element) => {
      element.scrollTop = 0;
    });
  } else {
    await expect(columns).toHaveCount(2);
    const leftColumn = columns.nth(0);
    const rightColumn = columns.nth(1);
    const leftGroups = leftColumn.locator(GROUP_SELECTOR);
    const rightGroups = rightColumn.locator(GROUP_SELECTOR);
    const leftTitles = ['Group 01', 'Group 02', 'Group 03', 'Group 04'];
    const rightTitles = [
      'Group 05',
      'Group 06',
      'Group 07',
      'Group 08',
      'Group 09',
    ];

    await expect(leftGroups).toHaveCount(4);
    await expect(rightGroups).toHaveCount(5);
    expect(await getGroupTitles(leftColumn)).toEqual(leftTitles);
    expect(await getGroupTitles(rightColumn)).toEqual(rightTitles);
    await expect
      .poll(() => getExpandedStates(leftGroups))
      .toEqual(['true', 'true', 'true', 'true']);
    await expect
      .poll(() => getExpandedStates(rightGroups))
      .toEqual(['true', 'true', 'true', 'true', 'false']);
    await expectEqualExpandedGroupHeights(leftColumn);
    await expectEqualExpandedGroupHeights(rightColumn);

    const leftHeightBeforeCollapse = (
      await getExpandedGroupHeights(leftColumn)
    )[0];
    const rightHeightsBeforeCollapse =
      await getExpandedGroupHeights(rightColumn);

    await leftGroups
      .first()
      .getByRole('button', { name: 'Group 01: Collapse' })
      .click();

    await expect
      .poll(() => getExpandedStates(leftGroups))
      .toEqual(['false', 'true', 'true', 'true']);
    expect(
      await leftGroups
        .first()
        .evaluate((group) => group.getBoundingClientRect().height),
    ).toBeCloseTo(72, 0);
    await expectEqualExpandedGroupHeights(leftColumn);
    const leftHeightsAfterCollapse = await getExpandedGroupHeights(leftColumn);
    const rightHeightsAfterCollapse =
      await getExpandedGroupHeights(rightColumn);

    expect(leftHeightBeforeCollapse).toBeDefined();
    expect(
      leftHeightsAfterCollapse.every(
        (height) => height > (leftHeightBeforeCollapse ?? 0),
      ),
    ).toBe(true);
    expect(
      Math.max(
        ...rightHeightsBeforeCollapse.map((height, index) =>
          Math.abs(height - (rightHeightsAfterCollapse[index] ?? 0)),
        ),
      ),
    ).toBeLessThanOrEqual(1);

    await leftGroups
      .first()
      .getByRole('button', { name: 'Group 01: Expand' })
      .click();

    await expect
      .poll(() => getExpandedStates(leftGroups))
      .toEqual(['true', 'true', 'true', 'true']);

    await expect
      .poll(async () => {
        const localStorage = await extension.readStorage('local');
        return localStorage.expandedGroupsState !== undefined;
      })
      .toBe(true);
    const persistedStateBeforeAutoClose = JSON.stringify(
      (await extension.readStorage('local')).expandedGroupsState,
    );

    await rightGroups
      .nth(4)
      .getByRole('button', { name: 'Group 09: Expand' })
      .click();

    await expect
      .poll(() => getExpandedStates(rightGroups))
      .toEqual(['false', 'true', 'true', 'true', 'true']);
    await expect
      .poll(() => getExpandedStates(leftGroups))
      .toEqual(['true', 'true', 'true', 'true']);
    expect(await getGroupTitles(leftColumn)).toEqual(leftTitles);
    expect(await getGroupTitles(rightColumn)).toEqual(rightTitles);
    await expectEqualExpandedGroupHeights(leftColumn);
    await expectEqualExpandedGroupHeights(rightColumn);

    await expect
      .poll(async () => {
        const localStorage = await extension.readStorage('local');
        return JSON.stringify(localStorage.expandedGroupsState);
      })
      .not.toBe(persistedStateBeforeAutoClose);
    expect(
      (await extension.readStorage('sync')).expandedGroupsState,
    ).toBeUndefined();

    const reopenedPage = await extension.openNewTab();
    const reopenedColumns = reopenedPage
      .locator('[data-starlit-part="expanded-groups"]')
      .locator(':scope > .starlit-masonry__column');

    await expect(reopenedColumns).toHaveCount(2);
    await expect
      .poll(() =>
        getExpandedStates(reopenedColumns.nth(1).locator(GROUP_SELECTOR)),
      )
      .toEqual(['false', 'true', 'true', 'true', 'true']);
    await reopenedPage.close();
  }

  await expect(page).toHaveScreenshot('expanded-columns.png', {
    fullPage: false,
  });
});

test('expanded placement anchors compact columns and collapsed stacks', async ({
  extension,
}) => {
  const placements = ['center-center', 'bottom-right'] as const;

  for (const position of placements) {
    await extension.seedProfile(
      createExpandedColumnsProfileSeed({ groupCount: 1, position }),
    );
    const page = await extension.openNewTab();
    const surface = page.locator('[data-starlit-part="expanded-groups"]');
    const group = surface.locator('[data-starlit-part="bookmark-group"]');

    await expect(group).toBeVisible();
    await group.getByRole('button', { name: 'Group 01: Collapse' }).click();
    await expect(group).toHaveAttribute('data-expanded', 'false');

    const metrics = await getPlacementMetrics(surface);
    const viewport = page.viewportSize();
    const contentCenterX =
      metrics.content.left + (metrics.content.right - metrics.content.left) / 2;
    const contentCenterY =
      metrics.content.top + (metrics.content.bottom - metrics.content.top) / 2;

    expect(metrics.group.height).toBeCloseTo(72, 0);

    if (viewport && viewport.width > 720) {
      expect(metrics.surface.width).toBeLessThan(
        metrics.content.right - metrics.content.left,
      );
    }

    if (position === 'center-center') {
      expect(metrics.surface.centerX).toBeCloseTo(contentCenterX, 0);
      expect(metrics.group.centerY).toBeCloseTo(contentCenterY, 0);
    } else {
      expect(metrics.surface.right).toBeCloseTo(metrics.content.right, 0);
      expect(metrics.group.bottom).toBeCloseTo(metrics.content.bottom, 0);
    }

    await page.close();
  }

  await extension.seedProfile(
    createExpandedColumnsProfileSeed({
      groupCount: 3,
      masonryColumns: 1,
      position: 'bottom-right',
    }),
  );
  const bottomPage = await extension.openNewTab();
  const bottomColumn = bottomPage.locator('.starlit-masonry__column');

  await expect(bottomColumn.locator(GROUP_SELECTOR)).toHaveCount(3);
  for (const title of ['Group 01', 'Group 02', 'Group 03']) {
    await bottomPage
      .getByRole('button', { name: `${title}: Collapse` })
      .click();
  }

  expect(await getGroupTitles(bottomColumn)).toEqual([
    'Group 03',
    'Group 02',
    'Group 01',
  ]);
  const bottomGroupRects = await bottomColumn
    .locator(GROUP_SELECTOR)
    .evaluateAll((groups) =>
      groups.map((group) => {
        const rect = group.getBoundingClientRect();
        return { bottom: rect.bottom, top: rect.top };
      }),
    );
  const bottomColumnBox = await bottomColumn.boundingBox();
  const [topGroupRect, middleGroupRect, bottomGroupRect] = bottomGroupRects;

  if (
    !bottomColumnBox ||
    !topGroupRect ||
    !middleGroupRect ||
    !bottomGroupRect
  ) {
    throw new Error('Expected bottom-aligned group metrics');
  }

  expect(topGroupRect.top).toBeLessThan(middleGroupRect.top);
  expect(middleGroupRect.top).toBeLessThan(bottomGroupRect.top);
  expect(bottomGroupRect.bottom).toBeCloseTo(
    bottomColumnBox.y + bottomColumnBox.height,
    0,
  );
  await bottomPage.close();
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

test('background settings keep a fixed dialog theme', async ({ extension }) => {
  await extension.seedProfile(
    createProfileSeed({
      colorTheme: {
        accent: '#0057b8',
        accentText: '#ffffff',
        border: '#052e16',
        hoverBg: '#f97316',
        hoverText: '#111827',
        muted: '#475569',
        surface: '#dcfce7',
        text: '#7f1d1d',
      },
      locale: 'en',
      storageSchemaVersion: 2,
    }),
  );
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  await page.locator('[data-starlit-part="settings-trigger"]').click();
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
  const dialog = page.locator('[data-starlit-part="settings-dialog"]');
  const appearanceTabs = page.getByRole('tablist', { name: 'Appearance' });

  await expect(dialog).toHaveCSS('background-color', 'rgb(250, 246, 233)');
  await expect(dialog).toHaveCSS('color', 'rgb(48, 42, 51)');
  await expect(appearanceTabs).toHaveAttribute(
    'aria-orientation',
    'horizontal',
  );
  await expect(page).toHaveScreenshot('background-settings.png', {
    fullPage: false,
  });
});

test('bookmark group guidance', async ({ extension }) => {
  await extension.seedProfile(createProfileSeed({ locale: 'en' }));
  const page = await extension.openNewTab();
  await waitForBookmarks(page);

  await page.locator('[data-starlit-part="settings-trigger"]').click();
  await page.getByRole('tab', { name: 'Bookmark groups' }).click();
  await page.getByText('How it works', { exact: true }).click();
  await expect(
    page.locator('[data-starlit-part="bookmark-connection-guide"]'),
  ).toHaveAttribute('open', '');
  await expect(page).toHaveScreenshot('bookmark-groups.png', {
    fullPage: false,
  });
});
