import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { PaletteResult } from './types';
import { CommandPalette, type CommandPaletteCopy } from './CommandPalette';

const COPY: CommandPaletteCopy = {
  categoryBookmark: 'Bookmark',
  categoryGroup: 'Group',
  categoryScene: 'Scene',
  categorySettings: 'Settings',
  close: 'Close',
  empty: 'No results',
  hint: 'Use arrows and Enter',
  inputLabel: 'Search Starlit',
  placeholder: 'Search',
  title: 'Command palette',
};

const RESULTS: PaletteResult[] = [
  {
    bookmarkId: 'bookmark-docs',
    category: 'bookmark',
    isCurrentScene: true,
    path: ['Work'],
    title: 'Docs',
    url: 'https://docs.example.com/reference',
  },
  {
    category: 'settings',
    destination: 'widgets',
    isCurrentScene: false,
    title: 'Widgets',
  },
];

function renderPalette(
  onActivate = vi.fn(),
  onActivationError = vi.fn(),
): {
  onActivate: typeof onActivate;
  onActivationError: typeof onActivationError;
  trigger: HTMLButtonElement;
} {
  render(
    <>
      <button type="button">Before palette</button>
      <CommandPalette
        copy={COPY}
        onActivate={onActivate}
        onActivationError={onActivationError}
        results={RESULTS}
      />
    </>,
  );
  const trigger = screen.getByRole<HTMLButtonElement>('button', {
    name: 'Before palette',
  });
  trigger.focus();
  return { onActivate, onActivationError, trigger };
}

describe('CommandPalette', () => {
  it('opens with Cmd/Ctrl+K, filters, and activates the selected result', async () => {
    const onActivate = vi.fn<(result: PaletteResult) => void>();
    renderPalette(onActivate);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    const dialog = await screen.findByRole('dialog', {
      name: 'Command palette',
    });
    const input = screen.getByRole('combobox', { name: 'Search Starlit' });
    expect(dialog).toBeDefined();
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: 'docs' } });
    await screen.findByRole('option', { name: /Docs/u });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onActivate).toHaveBeenCalledWith(RESULTS[0]);
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('restores focus on Escape and renders the empty state', async () => {
    const { trigger } = renderPalette();

    fireEvent.keyDown(document, { ctrlKey: true, key: 'k' });
    const input = await screen.findByRole('combobox', {
      name: 'Search Starlit',
    });
    fireEvent.change(input, { target: { value: 'missing' } });
    expect(await screen.findByText('No results')).toBeDefined();

    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(document.activeElement).toBe(trigger);
    });
  });

  it('reports rejected activations without leaving an unhandled promise', async () => {
    const activationError = new Error('activation failed');
    const onActivate = vi.fn().mockRejectedValueOnce(activationError);
    const onActivationError = vi.fn();
    renderPalette(onActivate, onActivationError);

    fireEvent.keyDown(document, { ctrlKey: true, key: 'k' });
    const input = await screen.findByRole('combobox', {
      name: 'Search Starlit',
    });
    fireEvent.change(input, { target: { value: 'docs' } });
    await screen.findByRole('option', { name: /Docs/u });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onActivationError).toHaveBeenCalledWith(activationError);
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
