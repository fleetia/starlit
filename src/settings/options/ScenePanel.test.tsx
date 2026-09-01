import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../i18n';
import type { SceneReadiness } from '../../scenes';
import { createSceneFixture } from '../../scenes/testFixtures';
import { ScenePanel } from './ScenePanel';

const MISSING_READINESS: SceneReadiness = {
  availableActions: ['relink', 'restore'],
  canRestore: true,
  isReady: false,
  issues: [
    { kind: 'bookmark-folder', resourceId: 'missing-folder' },
    {
      kind: 'asset',
      resourceId: 'missing-background',
      usages: ['background'],
    },
  ],
};

const READY: SceneReadiness = {
  availableActions: [],
  canRestore: false,
  isReady: true,
  issues: [],
};

describe('ScenePanel', () => {
  it('explains folder preservation and orphaned-media cleanup before deleting a Scene', async () => {
    const scene = createSceneFixture();

    render(
      <I18nProvider locale="en">
        <ScenePanel
          activeSceneId={null}
          error={null}
          folderOptions={[]}
          isProcessing={false}
          onApply={vi.fn()}
          onCreate={vi.fn()}
          onDelete={vi.fn()}
          onGetReadiness={vi.fn().mockResolvedValue(READY)}
          onPrepareCreate={vi.fn()}
          onRelink={vi.fn()}
          onRestore={vi.fn()}
          scenes={[scene]}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Scene' }));

    const dialog = await screen.findByRole('dialog', { name: 'Delete Scene' });
    expect(
      screen.getByText(
        'Local media used only by this Scene will be removed. Media still used by another Scene is kept.',
      ),
    ).toBeDefined();
    expect(screen.getByText('Keep Chrome folder')).toBeDefined();
    expect(
      screen.getByRole('checkbox', {
        name: 'Also delete its Chrome folder',
      }),
    ).toBeDefined();
    expect(dialog).toBeDefined();
  });

  it('does not offer bookmark-folder deletion for an external Scene', async () => {
    const base = createSceneFixture();
    const scene = createSceneFixture({
      bookmarkCollection: {
        ...base.bookmarkCollection,
        folderOwnership: 'external',
      },
    });

    render(
      <I18nProvider locale="en">
        <ScenePanel
          activeSceneId={null}
          error={null}
          folderOptions={[]}
          isProcessing={false}
          onApply={vi.fn()}
          onCreate={vi.fn()}
          onDelete={vi.fn()}
          onGetReadiness={vi.fn().mockResolvedValue(READY)}
          onPrepareCreate={vi.fn()}
          onRelink={vi.fn()}
          onRestore={vi.fn()}
          scenes={[scene]}
        />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete Scene' }));
    await screen.findByRole('dialog', { name: 'Delete Scene' });

    expect(
      screen.queryByRole('checkbox', {
        name: 'Also delete its Chrome folder',
      }),
    ).toBeNull();
    expect(screen.getByText('Keep Chrome folder')).toBeDefined();
  });

  it('requires replacements for every missing folder and media resource before relinking', async () => {
    const base = createSceneFixture();
    const scene = createSceneFixture({
      appearance: {
        ...base.appearance,
        background: {
          assetId: 'missing-background',
          mediaType: 'image',
          source: 'asset',
        },
      },
      bookmarkCollection: {
        ...base.bookmarkCollection,
        folderId: 'missing-folder',
      },
    });
    const onGetReadiness = vi
      .fn<(sceneId: string) => Promise<SceneReadiness>>()
      .mockResolvedValueOnce(MISSING_READINESS)
      .mockResolvedValue(READY);
    const onRelink = vi.fn(async (): Promise<void> => undefined);

    render(
      <I18nProvider locale="en">
        <ScenePanel
          activeSceneId={null}
          error={null}
          folderOptions={[
            {
              id: 'replacement-folder',
              label: 'Other bookmarks / Replacement',
              path: ['Other bookmarks', 'Replacement'],
            },
          ]}
          isProcessing={false}
          onApply={vi.fn()}
          onCreate={vi.fn()}
          onDelete={vi.fn()}
          onGetReadiness={onGetReadiness}
          onPrepareCreate={vi.fn()}
          onRelink={onRelink}
          onRestore={vi.fn()}
          scenes={[scene]}
        />
      </I18nProvider>,
    );

    await screen.findByText(/cannot be applied/u);
    const relinkButton = screen.getByRole<HTMLButtonElement>('button', {
      name: 'Relink',
    });
    expect(relinkButton.disabled).toBe(true);

    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Replacement bookmark folder',
      }),
      { target: { value: 'replacement-folder' } },
    );
    expect(relinkButton.disabled).toBe(true);

    const replacement = new File(['image'], 'replacement.png', {
      type: 'image/png',
    });
    fireEvent.change(
      screen.getByLabelText('Replacement media: missing-background'),
      { target: { files: [replacement] } },
    );
    expect(relinkButton.disabled).toBe(false);
    fireEvent.click(relinkButton);

    await waitFor(() =>
      expect(onRelink).toHaveBeenCalledWith('scene-1', {
        assetFiles: { 'missing-background': replacement },
        folder: {
          id: 'replacement-folder',
          label: 'Other bookmarks / Replacement',
          path: ['Other bookmarks', 'Replacement'],
        },
      }),
    );
    expect(onGetReadiness).toHaveBeenCalledTimes(2);
  });

  it('shows a localized error when restoring a Scene fails', async () => {
    const scene = createSceneFixture();
    const restoreError = new Error('recovery snapshot unavailable');
    const onRestore = vi.fn().mockRejectedValueOnce(restoreError);

    render(
      <I18nProvider locale="en">
        <ScenePanel
          activeSceneId={null}
          error={null}
          folderOptions={[]}
          isProcessing={false}
          onApply={vi.fn()}
          onCreate={vi.fn()}
          onDelete={vi.fn()}
          onGetReadiness={vi.fn().mockResolvedValue(MISSING_READINESS)}
          onPrepareCreate={vi.fn()}
          onRelink={vi.fn()}
          onRestore={onRestore}
          scenes={[scene]}
        />
      </I18nProvider>,
    );

    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Restore recovery snapshot',
      }),
    );

    await waitFor(() => expect(onRestore).toHaveBeenCalledWith('scene-1'));
    expect(
      await screen.findByText('The Scene action could not be completed.'),
    ).toBeDefined();
  });
});
