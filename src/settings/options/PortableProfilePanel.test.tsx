import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../i18n';
import { createSceneFixture } from '../../scenes/testFixtures';
import type { PortableProfileV4 } from '../portableProfile';
import type { PortableImportPreview } from '../portableProfileService';
import {
  PortableProfilePanel,
  type PortableProfilePanelActions,
} from './PortableProfilePanel';

const SCENE = createSceneFixture();
const PROFILE: PortableProfileV4 = {
  bookmarks: {
    [SCENE.id]: {
      children: [
        {
          children: [
            {
              id: 'node:0.0',
              title: 'Starlit',
              url: 'https://star-light.space',
            },
          ],
          id: 'node:0',
          title: 'Starlit',
        },
      ],
      rootId: 'root',
    },
  },
  categories: { bookmarkUrls: true, media: false, scenes: true },
  exportedAt: '2026-08-31T12:00:00.000Z',
  globalPreferences: { isOpenInNewTab: true, locale: 'en' },
  schemaVersion: 4,
  scenes: [SCENE],
};
const PREVIEW: PortableImportPreview = {
  diffs: [
    {
      assetCount: 0,
      bookmarkFolderCount: 1,
      bookmarkUrlCount: 1,
      changedSections: ['appearance', 'bookmarks', 'identity'],
      existingScene: createSceneFixture({ name: 'Existing Focus' }),
      incomingScene: SCENE,
    },
  ],
  profile: PROFILE,
};

function createActions(): PortableProfilePanelActions {
  return {
    applyImport: vi.fn<PortableProfilePanelActions['applyImport']>(),
    createExport: vi
      .fn<PortableProfilePanelActions['createExport']>()
      .mockResolvedValue(PROFILE),
    previewImport: vi
      .fn<PortableProfilePanelActions['previewImport']>()
      .mockResolvedValue(PREVIEW),
  };
}

function renderPanel(
  actions: PortableProfilePanelActions,
  options: {
    destinationParentId?: string;
    download?: (profile: PortableProfileV4) => void;
    onImported?: () => void;
  } = {},
): ReturnType<typeof render> {
  return render(
    <I18nProvider locale="en">
      <PortableProfilePanel actions={actions} {...options} />
    </I18nProvider>,
  );
}

describe('PortableProfilePanel', () => {
  it('exports with Scene enabled and sensitive categories disabled by default', async () => {
    const actions = createActions();
    const download = vi.fn<(profile: PortableProfileV4) => void>();
    renderPanel(actions, { download });

    expect(
      screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'Scenes, appearance, and layout',
      }).checked,
    ).toBe(true);
    expect(
      screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'Chrome bookmark URLs',
      }).checked,
    ).toBe(false);
    expect(
      screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'Uploaded media',
      }).checked,
    ).toBe(false);
    expect(
      screen.getByText(
        'Without bookmark URLs, new or copied Scenes require Relink and omit device-bound group visibility and order. Custom favicons are excluded.',
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        'Language and bookmark-opening preferences are always included.',
      ),
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() =>
      expect(actions.createExport).toHaveBeenCalledWith({
        bookmarkUrls: false,
        media: false,
        scenes: true,
      }),
    );
    expect(download).toHaveBeenCalledWith(PROFILE);
  });

  it('warns before exporting bookmark URLs or uploaded media', () => {
    const actions = createActions();
    renderPanel(actions, { download: vi.fn() });

    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Chrome bookmark URLs' }),
    );

    expect(
      screen.getByText(
        'URLs or media can contain private information. Review the file before sharing it.',
      ).textContent,
    ).toContain('private information');

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Scenes, appearance, and layout',
      }),
    );

    expect(
      screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'Chrome bookmark URLs',
      }).checked,
    ).toBe(false);
    expect(
      screen.getByRole<HTMLInputElement>('checkbox', {
        name: 'Uploaded media',
      }).disabled,
    ).toBe(true);
    expect(screen.queryByText(/private information/u)).toBeNull();
  });

  it('previews the file and requires a choice for every Scene conflict', async () => {
    const actions = createActions();
    const onImported = vi.fn<() => void>();
    const { container } = renderPanel(actions, {
      destinationParentId: 'other-bookmarks',
      download: vi.fn(),
      onImported,
    });
    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('Expected the portable profile file input.');

    fireEvent.change(input, {
      target: {
        files: [
          new File([JSON.stringify(PROFILE)], 'starlit-profile.json', {
            type: 'application/json',
          }),
        ],
      },
    });

    const dialog = await screen.findByRole('dialog', {
      name: 'Import preview',
    });
    expect(actions.previewImport).toHaveBeenCalledWith(PROFILE);
    expect(within(dialog).getByText('Focus').textContent).toBe('Focus');
    expect(
      within(dialog).getByText('Folders and URLs to copy').textContent,
    ).toBe('Folders and URLs to copy');
    expect(within(dialog).getByText('Language').textContent).toBe('Language');
    expect(within(dialog).getByText('Changed sections')).toBeDefined();
    expect(
      within(dialog).getByText(
        'Skipped Scenes stay unchanged. The global language and bookmark-opening preference shown above are still imported.',
      ),
    ).toBeDefined();
    expect(within(dialog).getByText('EN').textContent).toBe('EN');
    expect(
      within(dialog).getByText('Open in new tab by default').textContent,
    ).toBe('Open in new tab by default');
    expect(
      within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Import' })
        .disabled,
    ).toBe(true);
    expect(actions.applyImport).not.toHaveBeenCalled();

    fireEvent.click(
      within(dialog).getByRole('radio', { name: 'Replace Scene' }),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Import' }));

    await waitFor(() =>
      expect(actions.applyImport).toHaveBeenCalledWith(PROFILE, {
        conflictChoices: { [SCENE.id]: 'replace' },
        destinationParentId: 'other-bookmarks',
      }),
    );
    expect(onImported).toHaveBeenCalledOnce();
  });
});
