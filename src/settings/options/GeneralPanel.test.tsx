import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../../i18n';
import { DEFAULT_SETTINGS } from '../defaults';
import { GeneralPanel } from './GeneralPanel';

function renderPanel(
  onResetAll = vi.fn(async (): Promise<void> => undefined),
): () => Promise<void> {
  render(
    <I18nProvider locale="en">
      <GeneralPanel
        guideHref="/guide.html"
        locale="en"
        onResetAll={onResetAll}
        onResetTheme={vi.fn(async (): Promise<void> => undefined)}
        setLocale={vi.fn()}
        setSettings={vi.fn()}
        settings={DEFAULT_SETTINGS}
      />
    </I18nProvider>,
  );
  return onResetAll;
}

describe('GeneralPanel reset confirmation', () => {
  it('does not reset until the destructive action is confirmed', async () => {
    const onResetAll = renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }));

    const dialog = screen.getByRole('alertdialog', {
      name: 'Reset all Starlit data?',
    });
    expect(onResetAll).not.toHaveBeenCalled();
    expect(
      within(dialog).getByText(/Chrome bookmarks, Scene folders/u),
    ).toBeDefined();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Permanently reset',
      }),
    );

    await waitFor(() => expect(onResetAll).toHaveBeenCalledOnce());
  });

  it('keeps the confirmation open when reset fails', async () => {
    renderPanel(vi.fn(async () => Promise.reject(new Error('reset failed'))));

    fireEvent.click(screen.getByRole('button', { name: 'Reset all' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Permanently reset',
      }),
    );

    await waitFor(() => expect(screen.getByRole('alertdialog')).toBeDefined());
  });
});
