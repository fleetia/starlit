import type { Locator, Page } from '@playwright/test';

import type { GridSettings } from '../../src/layout/types';
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

async function expectHiddenScrollbar(scrollable: Locator): Promise<void> {
  await expect(scrollable).toHaveCSS('scrollbar-width', 'none');
  expect(
    await scrollable.evaluate(
      (element) => getComputedStyle(element, '::-webkit-scrollbar').display,
    ),
  ).toBe('none');
}

async function expectScrollableLabel(page: Page, tile: Locator): Promise<void> {
  const label = tile.locator('[data-starlit-part="bookmark-tile-label"]');
  await expect(label).toHaveCSS('overflow-y', 'auto');
  await expect(label).toHaveCSS('overscroll-behavior-y', 'contain');
  await expectHiddenScrollbar(label);
  expect(await label.evaluate((element) => element.tagName)).toBe('SPAN');
  await expect(label).not.toHaveAttribute('tabindex');
  await label.hover();
  const outerScrollTop = await label.evaluate(
    (element) =>
      element.closest('[data-starlit-part="bookmark-grid"]')?.scrollTop,
  );
  await page.mouse.wheel(0, 120);
  await expect
    .poll(() => label.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  expect(
    await label.evaluate(
      (element) =>
        element.closest('[data-starlit-part="bookmark-grid"]')?.scrollTop,
    ),
  ).toBe(outerScrollTop);

  await tile.focus();
  await page.keyboard.press('Tab');
  await expect(label).toBeFocused();
  await page.keyboard.press('Home');
  await expect
    .poll(() => label.evaluate((element) => element.scrollTop))
    .toBe(0);
  await page.keyboard.press('ArrowDown');
  await expect
    .poll(() => label.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await page.keyboard.press('Home');
  await expect
    .poll(() => label.evaluate((element) => element.scrollTop))
    .toBe(0);
  await page.keyboard.press('Tab');
  await expect(label).not.toBeFocused();
  await tile.focus();
  await tile.press('Home');
  await expect
    .poll(() => label.evaluate((element) => element.scrollTop))
    .toBe(0);
  await tile.press('ArrowDown');
  await expect
    .poll(() => label.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await tile.press('ArrowUp');
  await expect
    .poll(() => label.evaluate((element) => element.scrollTop))
    .toBe(0);
  await tile.press('PageDown');
  const expectedPageDistance = await label.evaluate((element) =>
    Math.min(element.clientHeight, element.scrollHeight - element.clientHeight),
  );
  await expect
    .poll(() => label.evaluate((element) => element.scrollTop))
    .toBeCloseTo(expectedPageDistance, 0);
  await tile.press('PageUp');
  await expect
    .poll(() => label.evaluate((element) => element.scrollTop))
    .toBe(0);
  await tile.press('End');
  const maximumScrollTop = await label.evaluate(
    (element) => element.scrollHeight - element.clientHeight,
  );
  await expect
    .poll(() => label.evaluate((element) => element.scrollTop))
    .toBeCloseTo(maximumScrollTop, 0);
  await tile.press('Home');
  await expect
    .poll(() => label.evaluate((element) => element.scrollTop))
    .toBe(0);
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
    local: {
      overlayScene: { layers: [{ kind: 'bookmarks' }] },
    },
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
        fontFamily: 'ibm-plex-sans',
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

  await bookmark.hover();
  await expect(bookmark).toHaveCSS('background-color', 'rgb(0, 0, 0)');
  await expect(bookmark).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(
    bookmark.locator('[data-starlit-part="bookmark-tile-label"]'),
  ).toHaveCSS('color', 'rgb(255, 255, 255)');
  await route.hover();
  await expect(bookmark).toHaveCSS('background-color', 'rgb(210, 211, 212)');

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
  const previewIcon = previewBookmark.locator(
    '[data-starlit-part="bookmark-tile-icon"]',
  );
  const innerBorderColor = await previewIcon.evaluate(
    (element) => getComputedStyle(element).borderTopColor,
  );
  const previewBorderWidth = await previewBookmark.evaluate(
    (element) => getComputedStyle(element).borderTopWidth,
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

  await page.getByRole('tab', { name: 'Bookmark', exact: true }).click();
  const borderColor = page.getByRole('textbox', {
    name: 'Card border color',
    exact: true,
  });
  await borderColor.fill('#66339980');
  await borderColor.press('Enter');
  await expect(previewBookmark).toHaveCSS(
    'border-top-color',
    'rgba(102, 51, 153, 0.5)',
  );
  await expect(previewBookmark).toHaveCSS(
    'border-top-width',
    previewBorderWidth,
  );
  await expect(previewBookmark).toHaveCSS('border-top-style', 'dotted');
  await expect(previewIcon).toHaveCSS('border-top-color', innerBorderColor);
  await expect(bookmark).toHaveCSS('border-top-color', 'rgb(78, 89, 90)');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(bookmark).toHaveCSS(
    'border-top-color',
    'rgba(102, 51, 153, 0.5)',
  );
  await page.reload();
  await waitForBookmarks(page);
  await expect(bookmark).toHaveCSS(
    'border-top-color',
    'rgba(102, 51, 153, 0.5)',
  );
  await expect(bookmark).toHaveCSS('border-top-width', '2px');
  await expect(bookmark).toHaveCSS('border-top-style', 'dotted');
});

for (const isExpandView of [false, true]) {
  for (const iconSize of [28, 32]) {
    test(`wraps tall bookmark names with ${iconSize}px icons in ${isExpandView ? 'expanded' : 'paged'} view`, async ({
      extension,
    }, testInfo) => {
      const koreanTitle =
        '세로로 긴 카드에서는 북마크 이름을 여러 줄로 읽을 수 있어요';
      const unbrokenTitle =
        'https://example.com/DocumentationForAnExtremelyLongUnbrokenBookmarkName';
      const overflowingTitle = '아주긴북마크이름'.repeat(30);
      await extension.seedProfile({
        bookmarkRoots: [
          [
            {
              title: 'Name wrapping',
              children: [
                {
                  title: koreanTitle,
                  children: [
                    { title: 'Child', url: 'https://example.com/child' },
                  ],
                },
                { title: unbrokenTitle, url: 'https://example.com/unbroken' },
                {
                  title: overflowingTitle,
                  url: 'https://example.com/overflowing',
                },
                { title: 'Short name', url: 'https://example.com/short' },
              ],
            },
          ],
        ],
        local: { overlayScene: { layers: [{ kind: 'bookmarks' }] } },
        sync: {
          storageSchemaVersion: 2,
          locale: 'en',
          size: 30,
          iconSize,
          bookmarkTreePrefs: {
            rootPath: ['Bookmarks Bar'],
            siblingOrder: {},
          },
          gridSettings: {
            ...CUSTOM_GRID_SETTINGS,
            columns: 2,
            rows: 2,
            gap: '8px',
            icon: { ...CUSTOM_GRID_SETTINGS.icon, width: 3, height: 10 },
          },
          settings: {
            fontFamily: 'ibm-plex-sans',
            iconLayout: 'vertical',
            isExpandView,
            isFolderEnabled: true,
            isOpenInNewTab: false,
            isVisibleOnce: false,
          },
        },
      });
      const page = await extension.openNewTab();
      await expect(
        page.getByRole('button', { name: unbrokenTitle, exact: true }),
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const shortTile = page.getByRole('button', {
        name: 'Short name',
        exact: true,
      });
      const shortIconTopInset = await shortTile.evaluate((element) => {
        const icon = element.querySelector(
          '[data-starlit-part="bookmark-tile-icon"]',
        );
        if (!icon) {
          throw new Error('Missing bookmark icon');
        }
        return (
          icon.getBoundingClientRect().top - element.getBoundingClientRect().top
        );
      });
      await expect(shortTile).toHaveCSS('padding-top', '8px');
      expect(shortIconTopInset).toBeCloseTo(10, 1);
      if (isExpandView) {
        await expectHiddenScrollbar(
          page.locator('[data-starlit-part="bookmark-grid"]').first(),
        );
        await expectHiddenScrollbar(page.locator('.starlit-masonry__column'));
      }
      const labelGeometries: Record<string, string | number | boolean>[] = [];
      for (const title of [koreanTitle, unbrokenTitle, overflowingTitle]) {
        const tile = page.getByRole('button', { name: title, exact: true });
        const label = tile.locator('[data-starlit-part="bookmark-tile-label"]');
        await expect(label).toHaveCSS('word-break', 'keep-all');
        await expect(label).toHaveCSS('overflow-wrap', 'anywhere');
        await expect(tile).toHaveCSS('padding-top', '8px');
        const geometry = await label.evaluate((element) => {
          const tileElement = element.parentElement;
          if (!tileElement) throw new Error('Missing bookmark tile');
          const labelBounds = element.getBoundingClientRect();
          const tileBounds = tileElement.getBoundingClientRect();
          const labelStyle = getComputedStyle(element);
          const icon = tileElement.querySelector(
            '[data-starlit-part="bookmark-tile-icon"]',
          );
          if (!icon) throw new Error('Missing bookmark icon');
          return {
            gap: labelBounds.top - icon.getBoundingClientRect().bottom,
            iconTopInset: icon.getBoundingClientRect().top - tileBounds.top,
            height: labelBounds.height,
            lineHeight: Number.parseFloat(labelStyle.lineHeight),
            scrollHeight: element.scrollHeight,
            clientHeight: element.clientHeight,
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            paddingTop: getComputedStyle(tileElement).paddingTop,
            wordBreak: labelStyle.wordBreak,
            overflowWrap: labelStyle.overflowWrap,
            scrollbarWidth: labelStyle.scrollbarWidth,
            scrollbarDisplay: getComputedStyle(element, '::-webkit-scrollbar')
              .display,
            tileHeight: tileBounds.height,
            isContained:
              labelBounds.top >= tileBounds.top &&
              labelBounds.bottom <= tileBounds.bottom &&
              labelBounds.left >= tileBounds.left &&
              labelBounds.right <= tileBounds.right,
          };
        });
        labelGeometries.push({ title, ...geometry });
        expect(geometry.height).toBeGreaterThan(geometry.lineHeight);
        expect(geometry.tileHeight).toBe(300);
        expect(geometry.gap).toBeCloseTo(8, 1);
        expect(geometry.iconTopInset).toBeCloseTo(shortIconTopInset, 1);
        expect(geometry.isContained).toBe(true);
        expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
        if (title === overflowingTitle) {
          expect(geometry.scrollHeight).toBeGreaterThan(geometry.clientHeight);
          expect(geometry.height / geometry.lineHeight).toBeCloseTo(
            Math.round(geometry.height / geometry.lineHeight),
            1,
          );
          await expect(tile).toHaveAttribute('title', title);
        } else {
          expect(geometry.scrollHeight).toBeLessThanOrEqual(
            geometry.clientHeight,
          );
        }
      }
      const koreanLabel = page
        .getByRole('button', { name: koreanTitle, exact: true })
        .locator('[data-starlit-part="bookmark-tile-label"]');
      const wordLineCounts = await koreanLabel.evaluate((element) => {
        const text = document
          .createTreeWalker(element, NodeFilter.SHOW_TEXT)
          .nextNode();
        if (!text) {
          throw new Error('Missing bookmark label text');
        }
        const title = text.textContent ?? '';
        return title.split(' ').map((word) => {
          const start = title.indexOf(word);
          const range = document.createRange();
          range.setStart(text, start);
          range.setEnd(text, start + word.length);
          return new Set(
            Array.from(range.getClientRects(), (bounds) => bounds.top),
          ).size;
        });
      });
      expect(wordLineCounts).toEqual(koreanTitle.split(' ').map(() => 1));
      await testInfo.attach('tall-bookmark-geometry.json', {
        body: JSON.stringify({
          shortIconTopInset,
          wordLineCounts,
          labelGeometries,
        }),
        contentType: 'application/json',
      });
      await expectScrollableLabel(
        page,
        page.getByRole('button', { name: overflowingTitle, exact: true }),
      );
      await page
        .locator('[data-starlit-part="bookmark-group"]')
        .first()
        .screenshot({ path: testInfo.outputPath('tall-bookmark-names.png') });
      await page.locator('[data-starlit-part="settings-trigger"]').click();
      await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
      await page.getByRole('tab', { name: 'Bookmark', exact: true }).click();
      const scale = page.getByRole('slider', {
        name: 'Scale (em)',
        exact: true,
      });
      await scale.press('Home');
      for (let step = 0; step < 10; step += 1) await scale.press('ArrowRight');
      for (const name of ['Horizontal size', 'Vertical size']) {
        const dimension = page.getByRole('slider', { name, exact: true });
        await dimension.press('Home');
        for (let step = 0; step < 4; step += 1)
          await dimension.press('ArrowRight');
      }
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      const compactTile = page.getByRole('button', {
        name: unbrokenTitle,
        exact: true,
      });
      await expect(compactTile).toHaveCSS('height', '80px');
      const compactLabel = compactTile.locator(
        '[data-starlit-part="bookmark-tile-label"]',
      );
      const compactGeometry = await compactLabel.evaluate((element) => {
        const tileElement = element.parentElement;
        const icon = tileElement?.querySelector(
          '[data-starlit-part="bookmark-tile-icon"]',
        );
        if (!tileElement || !icon) {
          throw new Error('Missing bookmark icon');
        }
        const bounds = element.getBoundingClientRect();
        const tileBounds = tileElement.getBoundingClientRect();
        const tileStyle = getComputedStyle(tileElement);
        const labelStyle = getComputedStyle(element);
        const lineHeight = Number.parseFloat(labelStyle.lineHeight);
        const availableHeight =
          tileBounds.bottom -
          Number.parseFloat(tileStyle.borderBottomWidth) -
          Number.parseFloat(tileStyle.paddingBottom) -
          bounds.top;
        return {
          gap: bounds.top - icon.getBoundingClientRect().bottom,
          iconTopInset: icon.getBoundingClientRect().top - tileBounds.top,
          isContained: bounds.bottom <= tileBounds.bottom,
          paddingTop: tileStyle.paddingTop,
          wordBreak: labelStyle.wordBreak,
          overflowWrap: labelStyle.overflowWrap,
          scrollbarWidth: labelStyle.scrollbarWidth,
          scrollbarDisplay: getComputedStyle(element, '::-webkit-scrollbar')
            .display,
          scrollHeight: element.scrollHeight,
          clientHeight: element.clientHeight,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
          lines: bounds.height / lineHeight,
          availableLines: Math.max(1, Math.floor(availableHeight / lineHeight)),
        };
      });
      expect(compactGeometry.gap).toBeCloseTo(8, 1);
      expect(compactGeometry.iconTopInset).toBeCloseTo(shortIconTopInset, 1);
      expect(compactGeometry.isContained).toBe(true);
      expect(compactGeometry.lines).toBeCloseTo(
        compactGeometry.availableLines,
        1,
      );
      await testInfo.attach('compact-bookmark-geometry.json', {
        body: JSON.stringify(compactGeometry),
        contentType: 'application/json',
      });
      await expectScrollableLabel(page, compactTile);
      await expect(compactTile).toHaveAttribute('title', unbrokenTitle);
      await page
        .locator('[data-starlit-part="bookmark-group"]')
        .first()
        .screenshot({ path: testInfo.outputPath('80px-bookmark-names.png') });
      await page.locator('[data-starlit-part="settings-trigger"]').click();
      await page.getByRole('tab', { name: 'Appearance', exact: true }).click();
      await page.getByRole('tab', { name: 'Bookmark', exact: true }).click();
      const horizontalSwitch = page.getByRole('switch', {
        name: 'Use horizontal icons',
        exact: true,
      });
      await horizontalSwitch.press('Space');
      await expect(horizontalSwitch).toBeChecked();
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      const horizontalLabel = page
        .getByRole('button', { name: unbrokenTitle, exact: true })
        .locator('[data-starlit-part="bookmark-tile-label"]');
      await expect(horizontalLabel).toHaveCSS('white-space', 'nowrap');
      await expect(horizontalLabel).toHaveCSS('text-overflow', 'ellipsis');
    });
  }
}
