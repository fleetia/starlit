import { DEFAULT_GRID_SETTINGS } from '../layout/defaults';
import { DEFAULT_STARLIT_THEME } from '../theme/defaults';
import {
  CANVAS_SCENE_VERSION,
  SCENE_PRESET_VERSION,
  type ScenePresetV1,
} from './types';

export function createSceneFixture(
  overrides: Partial<ScenePresetV1> = {},
): ScenePresetV1 {
  return {
    appearance: {
      background: { source: 'none' },
      bookmark: {
        isExpandView: false,
        isFolderEnabled: true,
        isVisibleOnce: false,
      },
      customCSS: '',
      fontFamily: 'ibm-plex-sans',
      gridSettings: structuredClone(DEFAULT_GRID_SETTINGS),
      iconSize: 28,
      size: 16,
      theme: { ...DEFAULT_STARLIT_THEME },
    },
    bookmarkCollection: {
      folderId: 'scene-folder',
      folderOwnership: 'scene',
      folderPath: ['Starlit Scenes', 'Focus'],
      groupPreferences: [],
      siblingOrder: {},
    },
    canvas: {
      layers: [{ id: 'bookmarks', kind: 'bookmarks' }],
      version: CANVAS_SCENE_VERSION,
    },
    createdAt: 100,
    id: 'scene-1',
    name: 'Focus',
    updatedAt: 100,
    version: SCENE_PRESET_VERSION,
    ...overrides,
  };
}
