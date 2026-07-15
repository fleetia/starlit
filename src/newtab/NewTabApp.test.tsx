import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../i18n';
import { getBookmarkIdKey } from '../bookmarks/bookmarkRoute';
import { NewTabApp } from './NewTabApp';
import type { Bookmark, GridSettings, Settings, StarlitTheme } from './types';

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
  gridSettings: {
    background: { border: '1px solid black', color: 'white', text: 'black' },
    columns: 2,
    gap: '8px',
    icon: { border: '1px solid black', color: 'white', text: 'black' },
    position: 'center-center',
    rows: 2,
  } as GridSettings,
  settings: {
    iconLayout: 'vertical',
    isExpandView: false,
    isFolderEnabled: true,
    isOpenInNewTab: false,
    isVisibleOnce: false,
  } as Settings,
}));

const loadingState = vi.hoisted(() => ({
  background: true,
  bookmarks: true,
  bookmarkTreePrefs: true,
  customCSS: true,
  gridSettings: true,
  groupPreferences: true,
  iconSize: true,
  settings: true,
  size: true,
  theme: true,
}));

const initialSettings = structuredClone(appState.settings);
const initialBookmarks = structuredClone(appState.bookmarks);

const appMocks = vi.hoisted(() => ({
  applyPreset: vi.fn<() => Promise<void>>(),
  clearBackground: vi.fn<() => Promise<void>>(),
  deleteBookmark: vi.fn<(bookmarkId: string) => Promise<void>>(),
  onLocaleChange: vi.fn<(locale: 'en' | 'ja' | 'ko') => Promise<void>>(),
  resetFavicon: vi.fn<(bookmarkId: string) => Promise<void>>(),
  resetTheme: vi.fn<() => Promise<void>>(),
  setCustomCSS: vi.fn<(value: string) => Promise<void>>(),
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

    return {
      isLoaded: loadingState.size,
      setValue: appMocks.setSize,
      value: 16,
    };
  },
}));

vi.mock('../settings/useBackgroundImage', () => ({
  useBackgroundImage: () => ({
    backgroundImage: 'none',
    blobUrl: '',
    clear: appMocks.clearBackground,
    isMediaMissing: false,
    isLoaded: loadingState.background,
    isProcessing: false,
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

function renderApp(): ReturnType<typeof render> {
  return render(
    <I18nProvider locale="en">
      <NewTabApp locale="en" onLocaleChange={appMocks.onLocaleChange} />
    </I18nProvider>,
  );
}

beforeEach((): void => {
  appState.bookmarks = structuredClone(initialBookmarks);
  appState.settings = structuredClone(initialSettings);
  Object.assign(loadingState, {
    background: true,
    bookmarks: true,
    bookmarkTreePrefs: true,
    customCSS: true,
    gridSettings: true,
    groupPreferences: true,
    iconSize: true,
    settings: true,
    size: true,
    theme: true,
  });
  Object.values(appMocks).forEach((mock) => mock.mockClear());
});

describe('NewTabApp', () => {
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

  it('waits for persisted settings before creating the settings session', async () => {
    loadingState.settings = false;
    const view = renderApp();
    const trigger = screen.getByRole('button', { name: 'Options' });

    expect(trigger.hasAttribute('disabled')).toBe(true);
    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog', { name: 'Options' })).toBeNull();

    appState.settings = { ...initialSettings, isExpandView: true };
    loadingState.settings = true;
    view.rerender(
      <I18nProvider locale="en">
        <NewTabApp locale="en" onLocaleChange={appMocks.onLocaleChange} />
      </I18nProvider>,
    );

    expect(trigger.hasAttribute('disabled')).toBe(false);
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

  it('keeps group changes inside the save and discard boundary', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Groups' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }));

    expect(appMocks.updateGroupPreferences).not.toHaveBeenCalled();
  });

  it('persists a staged group visibility change on save', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Groups' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(appMocks.updateGroupPreferences).toHaveBeenCalledWith([
        { key: getBookmarkIdKey('folder-work'), visible: false },
      ]);
    });
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
    fireEvent.click(screen.getByRole('tab', { name: 'Groups' }));
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
