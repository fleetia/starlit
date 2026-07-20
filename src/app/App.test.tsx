import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { lagrangeThemeClass } from '@fleetia/lagrange/theme';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../i18n';
import { getBookmarkIdKey } from '../bookmarks/bookmarkRoute';
import type { Bookmark } from '../bookmarks/types';
import type { ExpandedGroupsState } from '../layout/expandedLayout';
import type { GridSettings } from '../layout/types';
import type { OverlayImageLayer, OverlayScene } from '../overlays/types';
import type { Settings } from '../settings/types';
import type { StarlitTheme } from '../theme/types';
import { App } from './App';

const appState = vi.hoisted(() => ({
  bookmarks: [
    {
      id: 'folder-work',
      list: [
        {
          id: 'bookmark-github',
          title: 'GitHub',
          url: 'https://github.com',
        },
      ],
      title: 'Work',
    },
  ] as Bookmark[],
  colorTheme: {
    accent: '#29213f',
    accentText: '#fffdf7',
    border: '#29213f',
    hoverBg: '#e8e6ff',
    hoverText: '#29213f',
    muted: '#6f6a73',
    surface: '#fffdf7',
    text: '#19171c',
  } as StarlitTheme,
  expandedGroupsState: {
    knownKeys: [],
    openKeys: [],
  } as ExpandedGroupsState,
  gridSettings: {
    background: { border: '1px solid black', color: 'white', text: 'black' },
    columns: 2,
    gap: '8px',
    icon: { border: '1px solid black', color: 'white', text: 'black' },
    position: 'center-center',
    rows: 2,
  } as GridSettings,
  overlayScene: {
    layers: [{ kind: 'bookmarks' }],
  } as OverlayScene,
  settings: {
    fontFamily: 'ibm-plex-sans',
    iconLayout: 'vertical',
    isExpandView: false,
    isFolderEnabled: true,
    isOpenInNewTab: false,
    isVisibleOnce: false,
  } as Settings,
}));

const loadingState = vi.hoisted(() => ({
  background: true,
  backgroundProcessing: false,
  bookmarks: true,
  bookmarkTreePrefs: true,
  customCSS: true,
  expandedGroupsState: true,
  gridSettings: true,
  groupPreferences: true,
  iconSize: true,
  overlay: true,
  settings: true,
  size: true,
  theme: true,
}));

const initialSettings = structuredClone(appState.settings);
const initialBookmarks = structuredClone(appState.bookmarks);
const initialExpandedGroupsState = structuredClone(
  appState.expandedGroupsState,
);
const initialGridSettings = structuredClone(appState.gridSettings);
const initialOverlayScene = structuredClone(appState.overlayScene);

const appMocks = vi.hoisted(() => ({
  applyPreset: vi.fn<() => Promise<void>>(),
  clearBackground: vi.fn<() => Promise<void>>(),
  deleteBookmark: vi.fn<(bookmarkId: string) => Promise<void>>(),
  onLocaleChange: vi.fn<(locale: 'en' | 'ja' | 'ko') => Promise<void>>(),
  discardOverlayImages: vi.fn<(ids: readonly string[]) => Promise<void>>(),
  finalizeOverlayImages: vi.fn<(ids: readonly string[]) => Promise<void>>(),
  prepareOverlayFiles:
    vi.fn<(files: readonly File[]) => Promise<OverlayImageLayer[]>>(),
  resetFavicon: vi.fn<(bookmarkId: string) => Promise<void>>(),
  refreshBookmarks: vi.fn<() => Promise<void>>(),
  resetTheme: vi.fn<() => Promise<void>>(),
  setCustomCSS: vi.fn<(value: string) => Promise<void>>(),
  setExpandedGroupsState:
    vi.fn<
      (
        value:
          | ExpandedGroupsState
          | ((previous: ExpandedGroupsState) => ExpandedGroupsState),
      ) => Promise<void>
    >(),
  setIconSize: vi.fn<(value: number) => Promise<void>>(),
  setRootPath: vi.fn<(path: string[]) => Promise<void>>(),
  setSize: vi.fn<(value: number) => Promise<void>>(),
  toggleVisibility: vi.fn<(key: string) => Promise<void>>(),
  updateBackgroundFromFile: vi.fn<(file: File) => Promise<void>>(),
  updateBackgroundFromUrl: vi.fn<(url: string) => Promise<void>>(),
  updateFavicon:
    vi.fn<
      (folderId: number, bookmarkId: string, favicon: string) => Promise<void>
    >(),
  updateGridSettings: vi.fn<() => Promise<void>>(),
  updateOverlayScene: vi.fn<(scene: OverlayScene) => Promise<void>>(),
  updateGroupPreferences: vi.fn<() => Promise<void>>(),
  updatePreferences: vi.fn<() => Promise<void>>(),
  updateSettings: vi.fn<() => Promise<void>>(),
  updateSiblingOrder: vi.fn<() => Promise<void>>(),
  updateTheme: vi.fn<() => Promise<void>>(),
}));

vi.mock('../bookmarks/useBookmarks', () => ({
  useBookmarks: () => ({
    bookmarks: appState.bookmarks,
    handleDeleteBookmark: appMocks.deleteBookmark,
    handleResetFavicon: appMocks.resetFavicon,
    handleUpdateFavicon: appMocks.updateFavicon,
    isLoaded: loadingState.bookmarks,
    refreshBookmarks: appMocks.refreshBookmarks,
  }),
}));

vi.mock('../bookmarks/useBookmarkTreePrefs', () => ({
  useBookmarkTreePrefs: () => ({
    isLoaded: loadingState.bookmarkTreePrefs,
    rootId: undefined,
    rootPath: [],
    setRootPath: appMocks.setRootPath,
    siblingOrder: {},
    updatePreferences: appMocks.updatePreferences,
    updateSiblingOrder: appMocks.updateSiblingOrder,
  }),
}));

vi.mock('../bookmarks/useGroupPreferences', () => ({
  useGroupPreferences: () => ({
    groupPreferences: [{ key: getBookmarkIdKey('folder-work'), visible: true }],
    isLoaded: loadingState.groupPreferences,
    orderedBookmarks: appState.bookmarks,
    toggleVisibility: appMocks.toggleVisibility,
    updateGroupPreferences: appMocks.updateGroupPreferences,
  }),
}));

vi.mock('../hooks/useStorageState', () => ({
  useStorageState: (key: string) => {
    if (key === 'customCSS') {
      return {
        isLoaded: loadingState.customCSS,
        setValue: appMocks.setCustomCSS,
        value: '',
      };
    }

    if (key === 'iconSize') {
      return {
        isLoaded: loadingState.iconSize,
        setValue: appMocks.setIconSize,
        value: 28,
      };
    }

    if (key === 'expandedGroupsState') {
      return {
        isLoaded: loadingState.expandedGroupsState,
        setValue: appMocks.setExpandedGroupsState,
        value: appState.expandedGroupsState,
      };
    }

    if (key === 'size') {
      return {
        isLoaded: loadingState.size,
        setValue: appMocks.setSize,
        value: 16,
      };
    }

    throw new Error(`Unexpected storage key: ${key}`);
  },
}));

vi.mock('../settings/useBackgroundImage', () => ({
  useBackgroundImage: () => ({
    backgroundImage: 'none',
    blobUrl: '',
    clear: appMocks.clearBackground,
    isMediaMissing: false,
    isLoaded: loadingState.background,
    isProcessing: loadingState.backgroundProcessing,
    meta: null,
    updateFromFile: appMocks.updateBackgroundFromFile,
    updateFromUrl: appMocks.updateBackgroundFromUrl,
  }),
}));

vi.mock('../settings/useGridSettings', () => ({
  useGridSettings: () => ({
    gridSettings: appState.gridSettings,
    isLoaded: loadingState.gridSettings,
    updateGridSettings: appMocks.updateGridSettings,
  }),
}));

vi.mock('../settings/useSettings', () => ({
  useSettings: () => ({
    isLoaded: loadingState.settings,
    settings: appState.settings,
    updateSettings: appMocks.updateSettings,
  }),
}));

vi.mock('../settings/useTheme', () => ({
  useTheme: () => ({
    applyPreset: appMocks.applyPreset,
    colorTheme: appState.colorTheme,
    isLoaded: loadingState.theme,
    resetTheme: appMocks.resetTheme,
    themeStyle: {},
    updateTheme: appMocks.updateTheme,
  }),
}));

vi.mock('../overlays/useOverlayScene', () => ({
  useOverlayScene: () => ({
    discardImages: appMocks.discardOverlayImages,
    finalizeImages: appMocks.finalizeOverlayImages,
    isLoaded: loadingState.overlay,
    isProcessing: false,
    prepareFiles: appMocks.prepareOverlayFiles,
    scene: appState.overlayScene,
    updateScene: appMocks.updateOverlayScene,
  }),
}));

vi.mock('../theme/FontStylesheets', () => ({
  FontStylesheets: ({
    fontFamily,
    locale,
  }: {
    fontFamily: Settings['fontFamily'];
    locale: string;
  }): ReactElement => (
    <span
      data-font-family={fontFamily}
      data-font-locale={locale}
      data-testid="font-stylesheets"
    />
  ),
}));

vi.mock('../tutorial', () => ({
  FirstInstallTutorial: (): null => null,
}));

function renderApp(): ReturnType<typeof render> {
  return render(
    <I18nProvider locale="en">
      <App locale="en" onLocaleChange={appMocks.onLocaleChange} />
    </I18nProvider>,
  );
}

beforeEach((): void => {
  appState.bookmarks = structuredClone(initialBookmarks);
  appState.expandedGroupsState = structuredClone(initialExpandedGroupsState);
  appState.gridSettings = structuredClone(initialGridSettings);
  appState.overlayScene = structuredClone(initialOverlayScene);
  appState.settings = structuredClone(initialSettings);
  Object.assign(loadingState, {
    background: true,
    backgroundProcessing: false,
    bookmarks: true,
    bookmarkTreePrefs: true,
    customCSS: true,
    expandedGroupsState: true,
    gridSettings: true,
    groupPreferences: true,
    iconSize: true,
    overlay: true,
    settings: true,
    size: true,
    theme: true,
  });
  Object.values(appMocks).forEach((mock) => mock.mockClear());
  appMocks.deleteBookmark.mockResolvedValue(undefined);
  appMocks.setExpandedGroupsState.mockImplementation(
    async (value): Promise<void> => {
      appState.expandedGroupsState =
        typeof value === 'function'
          ? value(appState.expandedGroupsState)
          : value;
    },
  );
  appMocks.discardOverlayImages.mockResolvedValue(undefined);
  appMocks.finalizeOverlayImages.mockResolvedValue(undefined);
  appMocks.prepareOverlayFiles.mockResolvedValue([]);
  appMocks.updateOverlayScene.mockResolvedValue(undefined);
});

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('exposes stable custom CSS parts for paged group navigation', () => {
    appState.bookmarks = [
      ...appState.bookmarks,
      {
        id: 'folder-personal',
        list: [],
        title: 'Personal',
      },
    ];
    renderApp();
    const navigationControls = document.querySelectorAll(
      '[data-starlit-part="group-navigation"]',
    );

    expect(
      document.querySelector('[data-starlit-part="group-rail"]'),
    ).not.toBeNull();
    expect(navigationControls).toHaveLength(2);
    expect(navigationControls[0]?.getAttribute('data-direction')).toBe(
      'previous',
    );
    expect(navigationControls[1]?.getAttribute('data-direction')).toBe('next');
  });

  it('shows the support links before the settings tabs', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    await screen.findByRole('dialog', { name: 'Options' });

    const tabList = screen.getByRole('tablist', { name: 'Options' });
    const fairyLink = screen.getByRole('link', { name: 'Support on Fairy' });
    const coffeeLink = screen.getByRole('link', { name: 'Buy Me a Coffee' });
    const support = screen.getByRole('complementary', {
      name: 'Support Starlit',
    });

    expect(support.compareDocumentPosition(tabList)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(fairyLink.getAttribute('href')).toBe(
      'https://fairy.hada.io/@starlit#support',
    );
    expect(coffeeLink.getAttribute('href')).toBe(
      'https://buymeacoffee.com/starlight.space',
    );
    expect(fairyLink.getAttribute('target')).toBe('_blank');
    expect(fairyLink.getAttribute('rel')).toBe('noopener noreferrer');
    expect(coffeeLink.getAttribute('target')).toBe('_blank');
    expect(coffeeLink.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('keeps the settings dialog on the default Lagrange theme', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    const dialog = await screen.findByRole('dialog', { name: 'Options' });

    expect(dialog.classList.contains(lagrangeThemeClass)).toBe(true);
  });

  it('distinguishes background sources and announces file processing', async () => {
    const view = renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    await screen.findByRole('dialog', { name: 'Options' });
    fireEvent.click(screen.getByRole('tab', { name: 'Appearance' }));

    expect(
      screen.getByRole('group', { name: 'Background source' }),
    ).toBeDefined();
    expect(
      screen.getByText(
        'URLs sync across devices. Uploaded files are stored only on this device.',
      ),
    ).toBeDefined();
    expect(
      screen.getByRole('textbox', { name: 'Image or video URL' }),
    ).toBeDefined();

    fireEvent.click(screen.getByRole('radio', { name: 'Upload file' }));

    expect(
      screen.getByText(
        /saving converts images to WebP and GIFs to WebM; videos are stored unchanged/u,
      ),
    ).toBeDefined();
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeDefined();

    loadingState.backgroundProcessing = true;
    view.rerender(
      <I18nProvider locale="en">
        <App locale="en" onLocaleChange={appMocks.onLocaleChange} />
      </I18nProvider>,
    );

    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Choose file' })
        .disabled,
    ).toBe(true);
    fireEvent.click(screen.getByRole('tab', { name: 'Layout' }));

    const status = screen.getByRole('status');
    const spinner = status.querySelector('[aria-hidden="true"]');

    expect(status.textContent).toContain(
      'Processing and saving background file',
    );
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.firstElementChild).toBe(spinner);
    expect(spinner).not.toBeNull();
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Save' }).disabled,
    ).toBe(true);
  });

  it('documents stable selectors in the custom CSS placeholder', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    await screen.findByRole('dialog', { name: 'Options' });
    fireEvent.click(screen.getByRole('tab', { name: 'CSS' }));

    const customCSSInput = screen.getByRole('textbox', {
      name: 'Custom CSS',
    });
    const help = screen.getByText(
      /Use #root \[data-starlit-part="\.\.\."\] for public selectors/u,
    );
    const placeholder = customCSSInput.getAttribute('placeholder');

    expect(customCSSInput.getAttribute('aria-describedby')).toContain(help.id);
    expect(placeholder).toContain('#root');
    expect(placeholder).toContain('[data-starlit-part="bookmark-tile-label"]');
    expect(placeholder).toContain('[data-starlit-part^="bookmark-tile"]');
    expect(placeholder).toContain('data-kind="folder"');
  });

  it('explains how Chrome bookmarks appear in Starlit', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    await screen.findByRole('dialog', { name: 'Options' });
    fireEvent.click(screen.getByRole('tab', { name: 'Bookmark groups' }));

    expect(
      screen.getByText(/Starlit displays your Chrome bookmark folders/u),
    ).toBeDefined();
    expect(
      screen.getByText(/Root selection, hidden groups, custom order/u),
    ).toBeDefined();
    expect(
      screen.getByText(/Deleting a bookmark in Starlit also deletes it/u),
    ).toBeDefined();

    fireEvent.click(
      screen.getByRole('button', { name: 'Open Chrome bookmarks' }),
    );

    await waitFor(() => {
      expect(chrome.tabs.create).toHaveBeenCalledWith({
        url: 'chrome://bookmarks/',
      });
    });

    vi.mocked(chrome.tabs.create).mockRejectedValueOnce(
      new Error('manager unavailable'),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Open Chrome bookmarks' }),
    );

    expect(
      await screen.findByText(
        'We could not open the Chrome bookmark manager. Please try again.',
      ),
    ).toBeDefined();
  });

  it('edits and saves the background alpha', async () => {
    appState.gridSettings = {
      ...appState.gridSettings,
      background: {
        ...appState.gridSettings.background,
        color: 'rgba(250, 246, 233, 0.94)',
      },
    };
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    await screen.findByRole('dialog', { name: 'Options' });
    fireEvent.click(screen.getByRole('tab', { name: 'Appearance' }));

    const alpha = screen.getByRole<HTMLInputElement>('slider', {
      name: 'Color Alpha',
    });

    expect(alpha.value).toBe('94');
    fireEvent.change(alpha, { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(appMocks.updateGridSettings).toHaveBeenCalledWith({
        ...appState.gridSettings,
        background: {
          ...appState.gridSettings.background,
          color: '#faf6e980',
        },
      });
    });
  });

  it('edits and saves the bookmark heading background', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    await screen.findByRole('dialog', { name: 'Options' });
    fireEvent.click(screen.getByRole('tab', { name: 'Appearance' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Container' }));

    const color = screen.getByRole('textbox', { name: 'Title background' });
    fireEvent.change(color, { target: { value: '#123456' } });
    fireEvent.blur(color);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(appMocks.updateGridSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          heading: expect.objectContaining({
            titleBackgroundColor: '#123456ff',
          }),
        }),
      );
    });
  });

  it('waits for persisted settings before creating the settings session', async () => {
    loadingState.settings = false;
    const view = renderApp();
    const trigger = screen.getByRole('button', { name: 'Options' });
    const root = document.querySelector<HTMLElement>(
      '[data-starlit-part="root"]',
    );

    expect(trigger.hasAttribute('disabled')).toBe(true);
    expect(
      root?.style.getPropertyValue('--lagrange-semantic-typography-family-ui'),
    ).toBe('system-ui, sans-serif');
    expect(screen.queryByTestId('font-stylesheets')).toBeNull();
    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog', { name: 'Options' })).toBeNull();

    appState.settings = { ...initialSettings, isExpandView: true };
    loadingState.settings = true;
    view.rerender(
      <I18nProvider locale="en">
        <App locale="en" onLocaleChange={appMocks.onLocaleChange} />
      </I18nProvider>,
    );

    expect(trigger.hasAttribute('disabled')).toBe(false);
    expect(
      root?.style.getPropertyValue('--lagrange-semantic-typography-family-ui'),
    ).toContain('IBM Plex Sans');
    expect(
      screen.getByTestId('font-stylesheets').getAttribute('data-font-family'),
    ).toBe('ibm-plex-sans');
    fireEvent.click(trigger);
    fireEvent.click(
      await screen.findByRole('switch', {
        name: 'Open in new tab by default',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(appMocks.updateSettings).toHaveBeenCalledWith({
        ...initialSettings,
        isExpandView: true,
        isOpenInNewTab: true,
      });
    });
  });

  it('confirms before discarding a changed settings draft', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    const settingsDialog = await screen.findByRole('dialog', {
      name: 'Options',
    });
    fireEvent.click(
      screen.getByRole('switch', { name: 'Open in new tab by default' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(settingsDialog).toBeDefined();
    expect(
      await screen.findByRole('alertdialog', { name: 'Cancel' }),
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Options' })).toBeNull();
      expect(screen.queryByRole('alertdialog', { name: 'Cancel' })).toBeNull();
    });
  });

  it('moves focus through bookmark actions and restores it on Escape', async () => {
    renderApp();
    const bookmark = screen.getByRole('button', { name: 'GitHub' });
    bookmark.focus();

    fireEvent.contextMenu(bookmark, { clientX: 120, clientY: 80 });

    const menu = screen.getByRole('menu', { name: 'Bookmark actions' });
    const changeIcon = screen.getByRole('menuitem', { name: 'Change icon' });
    const resetIcon = screen.getByRole('menuitem', { name: 'Reset icon' });
    const deleteBookmark = screen.getByRole('menuitem', {
      name: 'Delete bookmark',
    });

    expect(document.activeElement).toBe(changeIcon);
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(resetIcon);
    fireEvent.keyDown(menu, { key: 'End' });
    expect(document.activeElement).toBe(deleteBookmark);
    fireEvent.keyDown(menu, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('menu')).toBeNull();
      expect(document.activeElement).toBe(bookmark);
    });
  });

  it('requires confirmation before deleting a Chrome bookmark', async () => {
    appState.bookmarks[0]?.list?.push({
      id: 'bookmark-docs',
      title: 'Docs',
      url: 'https://docs.example.com',
    });
    appMocks.deleteBookmark.mockImplementation(
      async (bookmarkId): Promise<void> => {
        appState.bookmarks = appState.bookmarks.map((folder) => ({
          ...folder,
          list: folder.list?.filter((item) => item.id !== bookmarkId),
        }));
      },
    );
    renderApp();
    const bookmark = screen.getByRole('button', { name: 'GitHub' });

    fireEvent.contextMenu(bookmark, { clientX: 120, clientY: 80 });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete bookmark' }));

    await screen.findByRole('alertdialog', {
      name: 'Delete from Chrome bookmarks?',
    });
    const cancel = screen.getByRole('button', { name: 'Cancel' });

    await waitFor(() => {
      expect(document.activeElement).toBe(cancel);
    });
    expect(
      screen.getByText(
        'This bookmark will be removed from both Starlit and your Chrome bookmarks.',
      ),
    ).toBeDefined();
    expect(appMocks.deleteBookmark).not.toHaveBeenCalled();

    fireEvent.click(cancel);
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(document.activeElement).toBe(bookmark);
    });
    expect(appMocks.deleteBookmark).not.toHaveBeenCalled();

    appMocks.deleteBookmark.mockRejectedValueOnce(new Error('delete failed'));
    fireEvent.contextMenu(bookmark, { clientX: 120, clientY: 80 });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete bookmark' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete from Chrome' }),
    );

    expect(
      await screen.findByText(
        'We could not delete this Chrome bookmark. Please try again.',
      ),
    ).toBeDefined();
    expect(
      screen.getByRole('alertdialog', {
        name: 'Delete from Chrome bookmarks?',
      }),
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Delete from Chrome' }));

    await waitFor(() => {
      expect(appMocks.deleteBookmark).toHaveBeenCalledTimes(2);
      expect(appMocks.deleteBookmark).toHaveBeenLastCalledWith(
        'bookmark-github',
      );
      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Docs' }),
      );
    });
  });

  it('persists the complete settings draft once and previews its layout', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(
      screen.getByRole('switch', { name: 'Open in new tab by default' }),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Layout' }));
    fireEvent.click(
      screen.getByRole('switch', { name: 'Use horizontal icons' }),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Appearance' }));

    const preview = document.querySelector(
      '[data-starlit-part="settings-preview"]',
    );
    expect(preview?.querySelector('[data-layout="horizontal"]')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(appMocks.updateSettings).toHaveBeenCalledTimes(1);
    });
    expect(appMocks.updateSettings).toHaveBeenCalledWith({
      ...appState.settings,
      iconLayout: 'horizontal',
      isOpenInNewTab: true,
    });
  });

  it('previews and saves the system font through the settings transaction', async () => {
    renderApp();
    const root = document.querySelector<HTMLElement>(
      '[data-starlit-part="root"]',
    );

    expect(
      root?.style.getPropertyValue('--lagrange-semantic-typography-family-ui'),
    ).toContain('IBM Plex Sans');
    expect(
      screen.getByTestId('font-stylesheets').getAttribute('data-font-family'),
    ).toBe('ibm-plex-sans');

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    const settingsDialog = await screen.findByRole('dialog', {
      name: 'Options',
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Font' }), {
      target: { value: 'system' },
    });

    expect(
      settingsDialog.style.getPropertyValue(
        '--lagrange-semantic-typography-family-ui',
      ),
    ).toBe('system-ui, sans-serif');
    await waitFor(() => {
      expect(
        root?.style.getPropertyValue(
          '--lagrange-semantic-typography-family-ui',
        ),
      ).toBe('system-ui, sans-serif');
      expect(
        screen.getByTestId('font-stylesheets').getAttribute('data-font-family'),
      ).toBe('system');
    });
    expect(appMocks.updateSettings).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(appMocks.updateSettings).toHaveBeenCalledWith({
        ...appState.settings,
        fontFamily: 'system',
      });
    });
  });

  it('loads an IBM font preview before saving over a system font', async () => {
    appState.settings.fontFamily = 'system';
    renderApp();
    const root = document.querySelector<HTMLElement>(
      '[data-starlit-part="root"]',
    );

    expect(
      root?.style.getPropertyValue('--lagrange-semantic-typography-family-ui'),
    ).toBe('system-ui, sans-serif');

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Font' }), {
      target: { value: 'ibm-plex-sans' },
    });

    await waitFor(() => {
      expect(
        root?.style.getPropertyValue(
          '--lagrange-semantic-typography-family-ui',
        ),
      ).toContain('IBM Plex Sans');
      expect(
        screen.getByTestId('font-stylesheets').getAttribute('data-font-family'),
      ).toBe('ibm-plex-sans');
    });
    expect(appMocks.updateSettings).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(
        root?.style.getPropertyValue(
          '--lagrange-semantic-typography-family-ui',
        ),
      ).toBe('system-ui, sans-serif');
      expect(
        screen.getByTestId('font-stylesheets').getAttribute('data-font-family'),
      ).toBe('system');
    });
  });

  it('keeps group changes inside the save and discard boundary', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Bookmark groups' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    expect(appMocks.updateGroupPreferences).not.toHaveBeenCalled();
  });

  it('persists a staged group visibility change on save', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Bookmark groups' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(appMocks.updateGroupPreferences).toHaveBeenCalledWith([
        { key: getBookmarkIdKey('folder-work'), visible: false },
      ]);
    });
  });

  it('adds, positions, and saves an overlay image as one settings draft', async () => {
    const overlayImage: OverlayImageLayer = {
      anchor: 'top-left',
      height: 120,
      id: 'overlay-badge',
      kind: 'image',
      name: 'badge.png',
      offsetX: 24,
      offsetY: 24,
      rotationDeg: 0,
      width: 160,
    };
    appMocks.prepareOverlayFiles.mockResolvedValue([overlayImage]);
    renderApp();

    const settingsTrigger = screen.getByRole('button', { name: 'Options' });
    fireEvent.click(settingsTrigger);
    fireEvent.click(screen.getByRole('tab', { name: 'Layers' }));
    fireEvent.change(screen.getByLabelText('Add images'), {
      target: {
        files: [new File(['image'], 'badge.png', { type: 'image/png' })],
      },
    });

    expect(await screen.findByText('badge.png')).toBeDefined();
    expect(appMocks.updateOverlayScene).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Edit positions' }));
    await screen.findByRole('dialog', { name: 'Edit overlay positions' });
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Back to settings' }),
      );
    });
    expect(
      document
        .querySelector('[data-starlit-part="main"]')
        ?.hasAttribute('inert'),
    ).toBe(true);
    fireEvent.keyDown(
      screen.getByRole('button', { name: 'Image: badge.png' }),
      { key: 'ArrowRight' },
    );
    fireEvent.change(screen.getByRole('slider', { name: 'Rotation' }), {
      target: { value: '45' },
    });
    fireEvent.change(screen.getByRole('slider', { name: 'Zoom' }), {
      target: { value: '150' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Back to settings' }));
    expect(
      document
        .querySelector('[data-starlit-part="main"]')
        ?.hasAttribute('inert'),
    ).toBe(false);
    fireEvent.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(appMocks.updateOverlayScene).toHaveBeenCalledWith({
        layers: [
          { kind: 'bookmarks' },
          {
            ...overlayImage,
            offsetX: 25,
            rotationDeg: 45,
            scale: 1.5,
          },
        ],
      });
      expect(document.activeElement).toBe(settingsTrigger);
    });
    expect(appMocks.discardOverlayImages).toHaveBeenCalledWith([]);
    expect(appMocks.finalizeOverlayImages).toHaveBeenCalledWith([
      'overlay-badge',
    ]);
  });

  it('discards prepared overlay media when its settings draft is canceled', async () => {
    const overlayImage: OverlayImageLayer = {
      anchor: 'top-left',
      height: 120,
      id: 'overlay-draft',
      kind: 'image',
      name: 'draft.png',
      offsetX: 24,
      offsetY: 24,
      rotationDeg: 0,
      width: 160,
    };
    appMocks.prepareOverlayFiles.mockResolvedValue([overlayImage]);
    renderApp();

    const settingsTrigger = screen.getByRole('button', { name: 'Options' });
    fireEvent.click(settingsTrigger);
    fireEvent.click(screen.getByRole('tab', { name: 'Layers' }));
    fireEvent.change(screen.getByLabelText('Add images'), {
      target: {
        files: [new File(['image'], 'draft.png', { type: 'image/png' })],
      },
    });
    await screen.findByText('draft.png');
    fireEvent.click(screen.getByRole('button', { name: 'Edit positions' }));
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Back to settings' }),
      );
    });
    fireEvent.click(screen.getByRole('button', { name: 'Back to settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(appMocks.discardOverlayImages).toHaveBeenCalledWith([
        'overlay-draft',
      ]);
      expect(document.activeElement).toBe(settingsTrigger);
    });
    expect(appMocks.updateOverlayScene).not.toHaveBeenCalled();
  });

  it('closes an invalidated draft when cancel media cleanup fails', async () => {
    const reportError = vi.fn();
    vi.stubGlobal('reportError', reportError);
    appMocks.prepareOverlayFiles.mockResolvedValue([
      {
        anchor: 'top-left',
        height: 120,
        id: 'overlay-cleanup-failure',
        kind: 'image',
        name: 'cleanup-failure.png',
        offsetX: 24,
        offsetY: 24,
        rotationDeg: 0,
        width: 160,
      },
    ]);
    appMocks.discardOverlayImages.mockRejectedValueOnce(
      new Error('cleanup failed'),
    );
    renderApp();

    const settingsTrigger = screen.getByRole('button', { name: 'Options' });
    fireEvent.click(settingsTrigger);
    fireEvent.click(screen.getByRole('tab', { name: 'Layers' }));
    fireEvent.change(screen.getByLabelText('Add images'), {
      target: {
        files: [
          new File(['image'], 'cleanup-failure.png', { type: 'image/png' }),
        ],
      },
    });
    await screen.findByText('cleanup-failure.png');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Yes' }));

    await waitFor(() => {
      expect(document.activeElement).toBe(settingsTrigger);
      expect(reportError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'cleanup failed' }),
      );
    });
    expect(appMocks.updateOverlayScene).not.toHaveBeenCalled();
  });

  it('removes persisted overlay media only after the layer draft is saved', async () => {
    appState.overlayScene = {
      layers: [
        { kind: 'bookmarks' },
        {
          anchor: 'bottom-right',
          height: 120,
          id: 'overlay-old',
          kind: 'image',
          name: 'old.png',
          offsetX: 24,
          offsetY: 24,
          rotationDeg: 0,
          width: 160,
        },
      ],
    };
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Layers' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove image: old.png' }),
    );
    expect(appMocks.discardOverlayImages).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(appMocks.updateOverlayScene).toHaveBeenCalledWith({
        layers: [{ kind: 'bookmarks' }],
      });
      expect(appMocks.discardOverlayImages).toHaveBeenCalledWith([
        'overlay-old',
      ]);
    });
  });

  it('rolls earlier writes back without retrying a stale overlay conflict', async () => {
    const conflictMessage =
      'Overlay scene changed in another session. Reload Starlit and try again.';
    const overlayImage: OverlayImageLayer = {
      anchor: 'top-left',
      height: 120,
      id: 'overlay-conflict',
      kind: 'image',
      name: 'conflict.png',
      offsetX: 24,
      offsetY: 24,
      rotationDeg: 0,
      width: 160,
    };
    appMocks.prepareOverlayFiles.mockResolvedValue([overlayImage]);
    appMocks.updateOverlayScene.mockRejectedValue(new Error(conflictMessage));
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(
      screen.getByRole('switch', { name: 'Open in new tab by default' }),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Layers' }));
    fireEvent.change(screen.getByLabelText('Add images'), {
      target: {
        files: [new File(['image'], 'conflict.png', { type: 'image/png' })],
      },
    });
    await screen.findByText('conflict.png');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText(conflictMessage)).toBeDefined();
      expect(appMocks.updateSettings).toHaveBeenCalledTimes(2);
      expect(appMocks.updateOverlayScene).toHaveBeenCalledTimes(1);
    });
    expect(appMocks.updateSettings).toHaveBeenNthCalledWith(1, {
      ...appState.settings,
      isOpenInNewTab: true,
    });
    expect(appMocks.updateSettings).toHaveBeenNthCalledWith(
      2,
      appState.settings,
    );
    expect(appMocks.updateOverlayScene).toHaveBeenCalledWith({
      layers: [{ kind: 'bookmarks' }, overlayImage],
    });
    expect(appMocks.discardOverlayImages).not.toHaveBeenCalled();
    expect(appMocks.finalizeOverlayImages).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Options' })).toBeDefined();
  });

  it('rolls a successful overlay write back when background saving fails', async () => {
    const initialScene: OverlayScene = {
      layers: [
        { kind: 'bookmarks' },
        {
          anchor: 'bottom-right',
          height: 120,
          id: 'overlay-to-restore',
          kind: 'image',
          name: 'restore.png',
          offsetX: 24,
          offsetY: 24,
          rotationDeg: 0,
          width: 160,
        },
      ],
    };
    appState.overlayScene = initialScene;
    appMocks.updateBackgroundFromUrl.mockRejectedValueOnce(
      new Error('background save failed'),
    );
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Layers' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove image: restore.png' }),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Appearance' }));
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Image or video URL' }),
      { target: { value: 'https://example.com/background.png' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('background save failed')).toBeDefined();
      expect(appMocks.updateOverlayScene).toHaveBeenCalledTimes(2);
    });
    expect(appMocks.updateOverlayScene).toHaveBeenNthCalledWith(1, {
      layers: [{ kind: 'bookmarks' }],
    });
    expect(appMocks.updateOverlayScene).toHaveBeenNthCalledWith(
      2,
      initialScene,
    );
    expect(appMocks.discardOverlayImages).not.toHaveBeenCalled();
    expect(appMocks.finalizeOverlayImages).not.toHaveBeenCalled();
  });

  it('rolls earlier settings writes back when a later save step fails', async () => {
    appMocks.updateGroupPreferences.mockRejectedValueOnce(
      new Error('group save failed'),
    );
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(
      screen.getByRole('switch', { name: 'Open in new tab by default' }),
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Bookmark groups' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.getByText('group save failed')).toBeDefined();
      expect(appMocks.updateSettings).toHaveBeenCalledTimes(2);
    });
    expect(appMocks.updateSettings).toHaveBeenNthCalledWith(1, {
      ...appState.settings,
      isOpenInNewTab: true,
    });
    expect(appMocks.updateSettings).toHaveBeenNthCalledWith(
      2,
      appState.settings,
    );
    expect(appMocks.updateGroupPreferences).toHaveBeenLastCalledWith([
      { key: getBookmarkIdKey('folder-work'), visible: true },
    ]);
    expect(screen.getByRole('dialog', { name: 'Options' })).toBeDefined();
  });
});
