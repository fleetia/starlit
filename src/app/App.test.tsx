import type { ReactElement } from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { lagrangeThemeClass } from '@fleetia/lagrange/theme';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../i18n';
import { getBookmarkIdKey } from '../bookmarks/bookmarkRoute';
import type { Bookmark } from '../bookmarks/types';
import type { ExpandedGroupsState } from '../layout/expandedLayout';
import type { GridSettings } from '../layout/types';
import type { OverlayImageLayer, OverlayScene } from '../overlays/types';
import type {
  CreateSceneOptions,
  DeleteSceneOptions,
  SceneBookmarkCreateInput,
  SceneBookmarkNode,
  SceneCollectionV3,
  ScenePresetV1,
  SceneReadiness,
  SceneRuntimeSnapshot,
} from '../scenes';
import type { Settings } from '../settings/types';
import type { BackgroundSnapshot } from '../settings/useBackgroundImage';
import type { StarlitTheme } from '../theme/types';
import { App } from './App';

const appState = vi.hoisted(() => ({
  activeScene: null as ScenePresetV1 | null,
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
  scenes: [] as ScenePresetV1[],
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
  createBackgroundSnapshot: vi.fn<() => Promise<BackgroundSnapshot>>(),
  deleteBookmark: vi.fn<(bookmarkId: string) => Promise<void>>(),
  onLocaleChange: vi.fn<(locale: 'en' | 'ja' | 'ko') => Promise<void>>(),
  discardOverlayImages: vi.fn<(ids: readonly string[]) => Promise<void>>(),
  finalizeOverlayImages: vi.fn<(ids: readonly string[]) => Promise<void>>(),
  prepareOverlayFiles:
    vi.fn<(files: readonly File[]) => Promise<OverlayImageLayer[]>>(),
  resetFavicon: vi.fn<(bookmarkId: string) => Promise<void>>(),
  refreshBookmarks: vi.fn<() => Promise<void>>(),
  resetTheme: vi.fn<() => Promise<void>>(),
  restoreBackgroundSnapshot:
    vi.fn<(snapshot: BackgroundSnapshot) => Promise<void>>(),
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
  applyScene: vi.fn<(sceneId: string) => Promise<SceneCollectionV3>>(),
  createScene:
    vi.fn<
      (
        snapshot: SceneRuntimeSnapshot,
        options: CreateSceneOptions,
      ) => Promise<SceneCollectionV3>
    >(),
  createSceneBookmark:
    vi.fn<(input: SceneBookmarkCreateInput) => Promise<SceneBookmarkNode>>(),
  deleteScene:
    vi.fn<
      (
        sceneId: string,
        options?: DeleteSceneOptions,
      ) => Promise<SceneCollectionV3>
    >(),
  duplicateScene: vi.fn<() => Promise<never>>(),
  getSceneBookmarkChildren:
    vi.fn<(id: string) => Promise<SceneBookmarkNode[]>>(),
  getSceneBookmarkSubTree:
    vi.fn<(id: string) => Promise<SceneBookmarkNode[]>>(),
  getSceneReadiness: vi.fn<(sceneId: string) => Promise<SceneReadiness>>(),
  reloadScenes: vi.fn<() => Promise<never>>(),
  relinkScene: vi.fn<() => Promise<never>>(),
  removeSceneBookmarkTree: vi.fn<(id: string) => Promise<void>>(),
  restoreScene: vi.fn<() => Promise<never>>(),
  updateScene:
    vi.fn<
      (
        sceneId: string,
        snapshot: SceneRuntimeSnapshot,
      ) => Promise<SceneCollectionV3>
    >(),
}));

vi.mock('../scenes', async (importOriginal) => {
  const original = await importOriginal<typeof import('../scenes')>();
  return {
    ...original,
    useScenes: () => ({
      activeScene: appState.activeScene,
      activeSceneId: appState.activeScene?.id ?? null,
      applyScene: appMocks.applyScene,
      createScene: appMocks.createScene,
      deleteScene: appMocks.deleteScene,
      duplicateScene: appMocks.duplicateScene,
      error: null,
      getReadiness: appMocks.getSceneReadiness,
      isLoaded: true,
      isProcessing: false,
      relinkScene: appMocks.relinkScene,
      reload: appMocks.reloadScenes,
      restoreScene: appMocks.restoreScene,
      scenes: appState.scenes,
      updateScene: appMocks.updateScene,
    }),
  };
});

vi.mock('../platform/bookmarks/sceneBookmarkGateway', () => ({
  createChromeSceneBookmarkGateway: () => ({
    create: appMocks.createSceneBookmark,
    getChildren: appMocks.getSceneBookmarkChildren,
    getSubTree: appMocks.getSceneBookmarkSubTree,
    removeTree: appMocks.removeSceneBookmarkTree,
  }),
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
    createSnapshot: appMocks.createBackgroundSnapshot,
    isMediaMissing: false,
    isLoaded: loadingState.background,
    isProcessing: loadingState.backgroundProcessing,
    meta: null,
    restoreSnapshot: appMocks.restoreBackgroundSnapshot,
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

function openImageWidgetPicker(): void {
  fireEvent.click(screen.getByRole('tab', { name: 'Widgets' }));
  fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
  fireEvent.click(
    within(screen.getByRole('menu', { name: 'Choose a widget' })).getByRole(
      'menuitem',
      { name: 'Image' },
    ),
  );
}

function createActiveScene(image: OverlayImageLayer): ScenePresetV1 {
  return {
    appearance: {
      background: { source: 'none' },
      bookmark: {
        iconLayout: appState.settings.iconLayout,
        isExpandView: appState.settings.isExpandView,
        isFolderEnabled: appState.settings.isFolderEnabled,
        isVisibleOnce: appState.settings.isVisibleOnce,
      },
      customCSS: '',
      fontFamily: appState.settings.fontFamily,
      gridSettings: appState.gridSettings,
      iconSize: 28,
      size: 16,
      theme: appState.colorTheme,
    },
    bookmarkCollection: {
      folderId: null,
      folderOwnership: 'external',
      folderPath: [],
      groupPreferences: [],
      siblingOrder: {},
    },
    canvas: {
      layers: [
        {
          anchor: 'top-left',
          config: {
            appearance: 'digital',
            format: 'HH:mm',
            showSecondHand: true,
            timeZone: null,
          },
          frame: { height: 80, offsetX: 12, offsetY: 18, width: 120 },
          id: 'clock',
          isHidden: false,
          isLocked: false,
          kind: 'widget',
          widgetType: 'clock',
        },
        {
          anchor: image.anchor,
          assetId: 'active-decoration-asset',
          frame: {
            height: image.height,
            offsetX: image.offsetX,
            offsetY: image.offsetY,
            width: image.width,
          },
          id: image.id,
          isHidden: false,
          isLocked: false,
          kind: 'decoration',
          mediaType: 'image',
          name: image.name,
          playbackMode: 'active-tab-only',
          playbackRate: 1,
          rotationDeg: image.rotationDeg,
          scale: 1,
        },
        { id: 'bookmarks', kind: 'bookmarks' },
      ],
      version: 2,
    },
    createdAt: 1,
    id: 'active-scene',
    name: 'Active Scene',
    updatedAt: 1,
    version: 1,
  };
}

beforeEach((): void => {
  appState.activeScene = null;
  appState.bookmarks = structuredClone(initialBookmarks);
  appState.expandedGroupsState = structuredClone(initialExpandedGroupsState);
  appState.gridSettings = structuredClone(initialGridSettings);
  appState.overlayScene = structuredClone(initialOverlayScene);
  appState.scenes = [];
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
  appMocks.createBackgroundSnapshot.mockResolvedValue({
    media: null,
    meta: null,
  });
  appMocks.finalizeOverlayImages.mockResolvedValue(undefined);
  appMocks.getSceneReadiness.mockResolvedValue({
    availableActions: [],
    canRestore: false,
    isReady: true,
    issues: [],
  });
  appMocks.prepareOverlayFiles.mockResolvedValue([]);
  appMocks.removeSceneBookmarkTree.mockResolvedValue(undefined);
  appMocks.updateOverlayScene.mockResolvedValue(undefined);
  appMocks.updateScene.mockResolvedValue({
    activeSceneId: null,
    scenes: [],
    storageSchemaVersion: 3,
  });
});

afterEach((): void => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('previews the selected Scene details and blocks palette re-entry until the choice is resolved', async () => {
    const decoration: OverlayImageLayer = {
      anchor: 'top-left',
      height: 100,
      id: 'preview-decoration',
      kind: 'image',
      name: 'preview.png',
      offsetX: 20,
      offsetY: 20,
      rotationDeg: 0,
      width: 120,
    };
    const pending = createActiveScene(decoration);
    pending.id = 'pending-scene';
    pending.name = 'Night Focus';
    pending.appearance.gridSettings = {
      ...pending.appearance.gridSettings,
      columns: 3,
      rows: 4,
    };
    pending.bookmarkCollection = {
      ...pending.bookmarkCollection,
      folderId: 'night-folder',
      folderPath: ['Other bookmarks', 'Starlit Scenes', 'Night Focus'],
    };
    appState.scenes = [pending];
    renderApp();

    fireEvent.keyDown(document, { ctrlKey: true, key: 'k' });
    const input = await screen.findByRole('combobox', {
      name: 'Search bookmarks, groups, Scenes, or settings',
    });
    fireEvent.change(input, { target: { value: pending.name } });
    fireEvent.click(
      await screen.findByRole('option', { name: /Night Focus/u }),
    );

    const preview = await screen.findByRole('dialog', {
      name: 'Apply this Scene?',
    });
    expect(within(preview).getByText(/ibm-plex-sans.*3 × 4/u)).toBeDefined();
    expect(
      within(preview).getByText(
        'Other bookmarks / Starlit Scenes / Night Focus',
      ),
    ).toBeDefined();
    expect(
      within(preview).getByText('Image × 1 · Clock', { exact: true }),
    ).toBeDefined();

    fireEvent.keyDown(document, { ctrlKey: true, key: 'k' });
    expect(screen.queryByRole('dialog', { name: 'Search Starlit' })).toBeNull();
    expect(appMocks.applyScene).not.toHaveBeenCalled();
  });

  it('shows localized feedback when a palette command rejects', async () => {
    appMocks.updatePreferences.mockRejectedValueOnce(
      new Error('bookmark route unavailable'),
    );
    renderApp();

    fireEvent.keyDown(document, { ctrlKey: true, key: 'k' });
    const input = await screen.findByRole('combobox', {
      name: 'Search bookmarks, groups, Scenes, or settings',
    });
    fireEvent.change(input, { target: { value: 'Work' } });
    const options = await screen.findAllByRole('option', { name: /Work/u });
    const groupOption = options.find((option) =>
      within(option).queryByText('Group · Work'),
    );
    if (!groupOption) throw new Error('Expected the Work group result.');
    fireEvent.click(groupOption);

    expect(
      await screen.findByText('The command could not be completed.'),
    ).toBeDefined();
  });

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

  it('persists a decorative context action into the active Canvas snapshot', async () => {
    const image: OverlayImageLayer = {
      anchor: 'top-left',
      height: 100,
      id: 'context-image',
      kind: 'image',
      name: 'context.png',
      offsetX: 20,
      offsetY: 20,
      rotationDeg: 0,
      width: 120,
    };
    appState.overlayScene = {
      layers: [image, { kind: 'bookmarks' }],
    };
    appState.activeScene = createActiveScene(image);
    appState.scenes = [appState.activeScene];
    appMocks.updateScene.mockResolvedValue({
      activeSceneId: appState.activeScene.id,
      scenes: appState.scenes,
      storageSchemaVersion: 3,
    });
    renderApp();

    fireEvent.contextMenu(document.body, { clientX: 40, clientY: 40 });
    expect(screen.queryByRole('menu', { name: 'Options' })).toBeNull();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Hide' }));

    const nextOverlayScene: OverlayScene = {
      layers: [{ ...image, hidden: true }, { kind: 'bookmarks' }],
    };
    await waitFor(() => {
      expect(appMocks.updateOverlayScene).toHaveBeenCalledWith(
        nextOverlayScene,
      );
      expect(appMocks.updateScene).toHaveBeenCalledOnce();
    });
    const runtimeSnapshot = appMocks.updateScene.mock.calls[0]?.[1];
    expect(runtimeSnapshot?.overlayScene).toEqual(nextOverlayScene);
    expect(runtimeSnapshot?.canvas?.layers).toEqual([
      appState.activeScene.canvas.layers[0],
      expect.objectContaining({
        id: image.id,
        isHidden: true,
        kind: 'decoration',
      }),
      { id: 'bookmarks', kind: 'bookmarks' },
    ]);
  });

  it('opens the context image directly in the image widget editor', async () => {
    const firstImage: OverlayImageLayer = {
      anchor: 'top-left',
      height: 100,
      id: 'first-context-image',
      kind: 'image',
      name: 'first.png',
      offsetX: 20,
      offsetY: 20,
      rotationDeg: 0,
      width: 120,
    };
    const targetImage: OverlayImageLayer = {
      ...firstImage,
      id: 'target-context-image',
      name: 'target.png',
      offsetX: 300,
      offsetY: 300,
    };
    appState.overlayScene = {
      layers: [firstImage, { kind: 'bookmarks' }, targetImage],
    };
    renderApp();

    fireEvent.contextMenu(document.body, { clientX: 320, clientY: 320 });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Edit' }));

    expect(
      await screen.findByRole('dialog', {
        name: 'Edit Canvas items',
      }),
    ).toBeDefined();
    expect(screen.queryByRole('dialog', { name: 'Options' })).toBeNull();
    expect(screen.getByLabelText<HTMLSelectElement>('Canvas item').value).toBe(
      targetImage.id,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Back to settings' }));
    expect(
      screen
        .getByRole('tab', { name: 'Widgets' })
        .getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('does not open image widget actions through the command palette', async () => {
    appState.overlayScene = {
      layers: [
        {
          anchor: 'top-left',
          height: 100,
          id: 'behind-palette',
          kind: 'image',
          name: 'behind-palette.png',
          offsetX: 20,
          offsetY: 20,
          rotationDeg: 0,
          width: 120,
        },
        { kind: 'bookmarks' },
      ],
    };
    renderApp();

    fireEvent.keyDown(document, { ctrlKey: true, key: 'k' });
    const palette = await screen.findByRole('dialog', {
      name: 'Search Starlit',
    });
    fireEvent.contextMenu(within(palette).getByRole('combobox'), {
      clientX: 40,
      clientY: 50,
    });

    expect(palette).toBeDefined();
    expect(
      screen.queryByRole('menu', { name: 'Image widget actions' }),
    ).toBeNull();
  });

  it('lists every Settings section when the empty canvas is right-clicked', async () => {
    renderApp();

    fireEvent.contextMenu(screen.getByRole('main'), {
      clientX: 72,
      clientY: 84,
    });

    const menu = screen.getByRole('menu', { name: 'Options' });
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual([
      'General',
      'Appearance',
      'Widgets',
      'Layout',
      'CSS',
      'Bookmark groups',
      'Scene',
      'Portable profile',
    ]);
    expect(within(menu).getAllByRole('separator')).toHaveLength(3);
    expect(document.activeElement).toBe(
      within(menu).getByRole('menuitem', { name: 'General' }),
    );
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(
      within(menu).getByRole('menuitem', { name: 'Appearance' }),
    );

    fireEvent.keyDown(document, { ctrlKey: true, key: 'k' });
    expect(screen.queryByRole('dialog', { name: 'Search Starlit' })).toBeNull();

    fireEvent.click(
      within(menu).getByRole('menuitem', { name: 'Portable profile' }),
    );

    expect(
      await screen.findByRole('dialog', { name: 'Options' }),
    ).toBeDefined();
    expect(
      screen
        .getByRole('tab', { name: 'Portable profile' })
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(
      screen.getByRole('checkbox', {
        name: 'Scenes, appearance, and layout',
      }),
    ).toBeDefined();
  });

  it('opens the exact Clock instance editor from the widget context menu', async () => {
    const image: OverlayImageLayer = {
      anchor: 'bottom-right',
      height: 80,
      id: 'context-widget-image',
      kind: 'image',
      name: 'context-widget.png',
      offsetX: 12,
      offsetY: 12,
      rotationDeg: 0,
      width: 80,
    };
    const activeScene = createActiveScene(image);
    activeScene.canvas.layers.splice(1, 0, {
      anchor: 'bottom-right',
      config: {
        appearance: 'analog',
        format: 'hh:mm:ss a',
        showSecondHand: false,
        timeZone: 'Asia/Seoul',
      },
      frame: { height: 160, offsetX: 24, offsetY: 24, width: 160 },
      id: 'target-clock',
      isHidden: false,
      isLocked: false,
      kind: 'widget',
      widgetType: 'clock',
    });
    appState.activeScene = activeScene;
    appState.scenes = [activeScene];
    renderApp();

    const targetClock = document.querySelector(
      '[data-canvas-layer-id="target-clock"] [data-starlit-part="widget-clock"]',
    );
    expect(targetClock).not.toBeNull();
    fireEvent.contextMenu(targetClock as Element, {
      clientX: 140,
      clientY: 160,
    });

    const menu = screen.getByRole('menu', { name: 'Configure widget' });
    fireEvent.click(
      within(menu).getByRole('menuitem', { name: 'Configure widget' }),
    );

    expect(
      await screen.findByRole('dialog', { name: 'Edit Canvas items' }),
    ).toBeDefined();
    expect(screen.getByLabelText<HTMLSelectElement>('Canvas item').value).toBe(
      'target-clock',
    );
    expect(
      (
        screen.getByRole('combobox', {
          name: 'Clock style',
        }) as HTMLSelectElement
      ).value,
    ).toBe('analog');
    expect(screen.queryByRole('dialog', { name: 'Options' })).toBeNull();
  });

  it('preserves the original settings IA and appends the v2 tabs', async () => {
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    await screen.findByRole('dialog', { name: 'Options' });

    const tabList = screen.getByRole('tablist', { name: 'Options' });
    const fairyLink = screen.getByRole('link', { name: 'Support on Fairy' });
    const coffeeLink = screen.getByRole('link', { name: 'Buy Me a Coffee' });
    const support = screen.getByRole('complementary', {
      name: 'Support Starlit',
    });

    expect(
      within(tabList)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual([
      'General',
      'Appearance',
      'Widgets',
      'Layout',
      'CSS',
      'Bookmark groups',
      'Scene',
      'Portable profile',
    ]);
    expect(tabList.compareDocumentPosition(support)).toBe(
      Node.DOCUMENT_POSITION_PRECEDING,
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

  it('remaps bookmark preferences to the copied Chrome node identities', async () => {
    const image: OverlayImageLayer = {
      anchor: 'top-left',
      height: 100,
      id: 'created-image',
      kind: 'image',
      name: 'created.png',
      offsetX: 20,
      offsetY: 20,
      rotationDeg: 0,
      width: 120,
    };
    const createdScene: ScenePresetV1 = {
      ...createActiveScene(image),
      id: 'created-scene',
      name: 'Focus',
    };
    appMocks.getSceneBookmarkSubTree.mockImplementation(async (id) => {
      if (id === '0') {
        return [
          {
            children: [{ children: [], id: 'folder-work', title: 'Work' }],
            id: '0',
            title: '',
          },
        ];
      }
      return [{ children: [], id, title: 'Other bookmarks' }];
    });
    appMocks.getSceneBookmarkChildren.mockResolvedValue([]);
    appMocks.createSceneBookmark
      .mockResolvedValueOnce({
        id: 'scene-container',
        parentId: '2',
        title: 'Starlit Scenes',
      })
      .mockResolvedValueOnce({
        id: 'created-scene-folder',
        parentId: 'scene-container',
        title: 'Focus',
      })
      .mockResolvedValueOnce({
        id: 'created-work',
        parentId: 'created-scene-folder',
        title: 'Work',
      });
    appMocks.createScene.mockResolvedValue({
      activeSceneId: null,
      scenes: [createdScene],
      storageSchemaVersion: 3,
    });
    appMocks.applyScene.mockResolvedValue({
      activeSceneId: createdScene.id,
      scenes: [createdScene],
      storageSchemaVersion: 3,
    });
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Scene' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Scene name' }), {
      target: { value: 'Focus' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Save current setup as Scene' }),
    );
    await screen.findByRole('dialog', { name: 'Copy Chrome bookmarks?' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm and create Scene' }),
    );

    await waitFor(() => {
      expect(appMocks.createSceneBookmark).toHaveBeenCalledTimes(3);
      expect(appMocks.createScene).toHaveBeenCalledOnce();
      expect(appMocks.applyScene).toHaveBeenCalledWith(createdScene.id);
      expect(screen.queryByRole('dialog', { name: 'Options' })).toBeNull();
    });
    expect(appMocks.createScene).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        bookmarkCollection: expect.objectContaining({
          groupPreferences: [
            { key: getBookmarkIdKey('created-work'), visible: true },
          ],
        }),
      }),
    );
  });

  it('restores the previous Scene before cleaning a created Scene when bookmark refresh fails', async () => {
    const image: OverlayImageLayer = {
      anchor: 'top-left',
      height: 100,
      id: 'previous-image',
      kind: 'image',
      name: 'previous.png',
      offsetX: 20,
      offsetY: 20,
      rotationDeg: 0,
      width: 120,
    };
    const previousScene = createActiveScene(image);
    const createdScene: ScenePresetV1 = {
      ...structuredClone(previousScene),
      bookmarkCollection: {
        folderId: 'created-scene-folder',
        folderOwnership: 'scene',
        folderPath: ['Other bookmarks', 'Starlit Scenes', 'Focus'],
        groupPreferences: [],
        siblingOrder: {},
      },
      id: 'created-scene',
      name: 'Focus',
    };
    const createdCollection: SceneCollectionV3 = {
      activeSceneId: previousScene.id,
      scenes: [previousScene, createdScene],
      storageSchemaVersion: 3,
    };
    const restoredCollection: SceneCollectionV3 = {
      activeSceneId: previousScene.id,
      scenes: [previousScene],
      storageSchemaVersion: 3,
    };
    appState.activeScene = previousScene;
    appState.scenes = [previousScene];
    appMocks.getSceneBookmarkSubTree.mockImplementation(async (id) => [
      {
        children: [],
        id,
        title: id === '2' ? 'Other bookmarks' : '',
      },
    ]);
    appMocks.getSceneBookmarkChildren.mockResolvedValue([]);
    appMocks.createSceneBookmark
      .mockResolvedValueOnce({
        id: 'scene-container',
        parentId: '2',
        title: 'Starlit Scenes',
      })
      .mockResolvedValueOnce({
        id: 'created-scene-folder',
        parentId: 'scene-container',
        title: 'Focus',
      });
    appMocks.createScene.mockResolvedValue(createdCollection);
    appMocks.applyScene
      .mockResolvedValueOnce({
        ...createdCollection,
        activeSceneId: createdScene.id,
      })
      .mockResolvedValueOnce(createdCollection);
    appMocks.refreshBookmarks.mockRejectedValueOnce(
      new Error('bookmark refresh failed'),
    );
    appMocks.deleteScene.mockResolvedValue(restoredCollection);
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Scene' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Scene name' }), {
      target: { value: 'Focus' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save as new Scene' }));
    await screen.findByRole('dialog', { name: 'Copy Chrome bookmarks?' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm and create Scene' }),
    );

    await waitFor(() => {
      expect(appMocks.deleteScene).toHaveBeenCalledOnce();
    });
    expect(appMocks.createScene).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ makeActive: false, name: 'Focus' }),
    );
    expect(appMocks.applyScene).toHaveBeenNthCalledWith(1, createdScene.id);
    expect(appMocks.applyScene).toHaveBeenNthCalledWith(2, previousScene.id);
    expect(appMocks.deleteScene).toHaveBeenCalledWith(createdScene.id, {
      deleteAssets: true,
    });
    expect(appMocks.removeSceneBookmarkTree).toHaveBeenNthCalledWith(
      1,
      'created-scene-folder',
    );
    expect(appMocks.removeSceneBookmarkTree).toHaveBeenNthCalledWith(
      2,
      'scene-container',
    );
    expect(appMocks.applyScene.mock.invocationCallOrder[0]).toBeLessThan(
      appMocks.refreshBookmarks.mock.invocationCallOrder[0] ?? 0,
    );
    expect(appMocks.refreshBookmarks.mock.invocationCallOrder[0]).toBeLessThan(
      appMocks.applyScene.mock.invocationCallOrder[1] ?? 0,
    );
    expect(appMocks.applyScene.mock.invocationCallOrder[1]).toBeLessThan(
      appMocks.deleteScene.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('refreshes bookmarks before applying the first Scene so refresh failure leaves runtime unchanged', async () => {
    const image: OverlayImageLayer = {
      anchor: 'top-left',
      height: 100,
      id: 'created-image',
      kind: 'image',
      name: 'created.png',
      offsetX: 20,
      offsetY: 20,
      rotationDeg: 0,
      width: 120,
    };
    const createdScene: ScenePresetV1 = {
      ...createActiveScene(image),
      bookmarkCollection: {
        folderId: 'created-scene-folder',
        folderOwnership: 'scene',
        folderPath: ['Other bookmarks', 'Starlit Scenes', 'Focus'],
        groupPreferences: [],
        siblingOrder: {},
      },
      id: 'created-scene',
      name: 'Focus',
    };
    appMocks.getSceneBookmarkSubTree.mockImplementation(async (id) => [
      {
        children: [],
        id,
        title: id === '2' ? 'Other bookmarks' : '',
      },
    ]);
    appMocks.getSceneBookmarkChildren.mockResolvedValue([]);
    appMocks.createSceneBookmark
      .mockResolvedValueOnce({
        id: 'scene-container',
        parentId: '2',
        title: 'Starlit Scenes',
      })
      .mockResolvedValueOnce({
        id: 'created-scene-folder',
        parentId: 'scene-container',
        title: 'Focus',
      });
    appMocks.createScene.mockResolvedValue({
      activeSceneId: null,
      scenes: [createdScene],
      storageSchemaVersion: 3,
    });
    appMocks.refreshBookmarks.mockRejectedValueOnce(
      new Error('bookmark refresh failed'),
    );
    appMocks.deleteScene.mockResolvedValue({
      activeSceneId: null,
      scenes: [],
      storageSchemaVersion: 3,
    });
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Scene' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Scene name' }), {
      target: { value: 'Focus' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Save current setup as Scene' }),
    );
    await screen.findByRole('dialog', { name: 'Copy Chrome bookmarks?' });
    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm and create Scene' }),
    );

    await waitFor(() => {
      expect(appMocks.deleteScene).toHaveBeenCalledOnce();
    });
    expect(appMocks.applyScene).not.toHaveBeenCalled();
    expect(appMocks.deleteScene).toHaveBeenCalledWith(createdScene.id, {
      deleteAssets: true,
    });
    expect(appMocks.refreshBookmarks.mock.invocationCallOrder[0]).toBeLessThan(
      appMocks.deleteScene.mock.invocationCallOrder[0] ?? 0,
    );
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
    fireEvent.click(screen.getByRole('tab', { name: 'Appearance' }));

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
    expect(screen.queryByRole('menu', { name: 'Options' })).toBeNull();
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
    fireEvent.click(screen.getByRole('tab', { name: 'Layout' }));

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
    fireEvent.click(screen.getByRole('tab', { name: 'General' }));
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
    fireEvent.click(screen.getByRole('tab', { name: 'General' }));
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

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Options' })).toBeNull();
      expect(appMocks.updateGroupPreferences).not.toHaveBeenCalled();
    });
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
    openImageWidgetPicker();
    fireEvent.change(screen.getByLabelText('Add images'), {
      target: {
        files: [new File(['image'], 'badge.png', { type: 'image/png' })],
      },
    });

    expect(await screen.findByText('badge.png')).toBeDefined();
    expect(appMocks.updateOverlayScene).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Edit positions' }));
    await screen.findByRole('dialog', {
      name: 'Edit Canvas items',
    });
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

  it('saves an Image and Clock added through the shared widget flow', async () => {
    const imageWidget: OverlayImageLayer = {
      anchor: 'bottom-left',
      height: 90,
      id: 'shared-flow-image',
      kind: 'image',
      name: 'shared-flow.png',
      offsetX: 20,
      offsetY: 24,
      rotationDeg: 0,
      width: 120,
    };
    const activeScene = createActiveScene(imageWidget);
    activeScene.canvas.layers = [{ id: 'bookmarks', kind: 'bookmarks' }];
    appState.activeScene = activeScene;
    appState.scenes = [activeScene];
    appMocks.prepareOverlayFiles.mockResolvedValue([imageWidget]);
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Widgets' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clock' }));
    expect(
      await screen.findByRole('dialog', { name: 'Edit Canvas items' }),
    ).toBeDefined();
    expect(screen.getByLabelText('Clock style')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Back to settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add widget' }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Image' }));
    fireEvent.change(screen.getByLabelText('Add images'), {
      target: {
        files: [new File(['image'], 'shared-flow.png', { type: 'image/png' })],
      },
    });
    await screen.findByText('shared-flow.png');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(appMocks.updateScene).toHaveBeenCalledOnce());
    const savedSnapshot = appMocks.updateScene.mock.calls[0]?.[1];
    expect(savedSnapshot?.canvas?.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: imageWidget.id,
          kind: 'decoration',
        }),
        expect.objectContaining({ kind: 'widget', widgetType: 'clock' }),
      ]),
    );
    expect(savedSnapshot?.overlayScene.layers).toContainEqual(imageWidget);
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
    openImageWidgetPicker();
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
    openImageWidgetPicker();
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
    fireEvent.click(screen.getByRole('tab', { name: 'Widgets' }));
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

  it('rolls earlier writes and a possibly committed overlay conflict back', async () => {
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
    appMocks.updateOverlayScene.mockRejectedValueOnce(
      new Error(conflictMessage),
    );
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Options' }));
    fireEvent.click(
      screen.getByRole('switch', { name: 'Open in new tab by default' }),
    );
    openImageWidgetPicker();
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
      expect(appMocks.updateOverlayScene).toHaveBeenCalledTimes(2);
    });
    expect(appMocks.updateSettings).toHaveBeenNthCalledWith(1, {
      ...appState.settings,
      isOpenInNewTab: true,
    });
    expect(appMocks.updateSettings).toHaveBeenNthCalledWith(
      2,
      appState.settings,
    );
    expect(appMocks.updateOverlayScene).toHaveBeenNthCalledWith(1, {
      layers: [{ kind: 'bookmarks' }, overlayImage],
    });
    expect(appMocks.updateOverlayScene).toHaveBeenNthCalledWith(
      2,
      appState.overlayScene,
    );
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
    fireEvent.click(screen.getByRole('tab', { name: 'Widgets' }));
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
