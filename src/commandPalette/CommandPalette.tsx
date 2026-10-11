import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import { Combobox, Dialog } from '@fleetia/lagrange';
import { lagrangeThemeClass } from '@fleetia/lagrange/theme';

import { getPaletteResultKey, rankPaletteResults } from './ranking';
import type { PaletteResult } from './types';
import * as styles from './CommandPalette.css';

export type CommandPaletteCopy = {
  categoryBookmark: string;
  categoryGroup: string;
  categoryScene: string;
  categorySettings: string;
  close: string;
  empty: string;
  hint: string;
  inputLabel: string;
  placeholder: string;
  title: string;
};

type CommandPaletteProps = {
  copy: CommandPaletteCopy;
  isEnabled?: boolean;
  onActivate: (result: PaletteResult) => void | Promise<void>;
  onActivationError: (error: unknown) => void;
  results: readonly PaletteResult[];
};

function getCategoryLabel(
  result: PaletteResult,
  copy: CommandPaletteCopy,
): string {
  switch (result.category) {
    case 'bookmark':
      return copy.categoryBookmark;
    case 'group':
      return copy.categoryGroup;
    case 'scene':
      return copy.categoryScene;
    case 'settings':
      return copy.categorySettings;
  }
}

function getResultDescription(
  result: PaletteResult,
  copy: CommandPaletteCopy,
): string {
  const category = getCategoryLabel(result, copy);
  if (result.category === 'bookmark' || result.category === 'group') {
    const path = result.path.join(' / ');
    return path ? `${category} · ${path}` : category;
  }
  return category;
}

export function CommandPalette({
  copy,
  isEnabled = true,
  onActivate,
  onActivationError,
  results,
}: CommandPaletteProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const rankedResults = useMemo(
    () => rankPaletteResults(results, query),
    [query, results],
  );
  const resultByKey = useMemo(
    () =>
      new Map(
        rankedResults.map((result) => [getPaletteResultKey(result), result]),
      ),
    [rankedResults],
  );
  const options = useMemo(
    () =>
      rankedResults.map((result) => ({
        description: getResultDescription(result, copy),
        label: result.title,
        value: getPaletteResultKey(result),
      })),
    [copy, rankedResults],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (isOpen && event.key === 'Escape') {
        event.preventDefault();
        setQuery('');
        setIsOpen(false);
        return;
      }

      if (
        !isEnabled ||
        event.defaultPrevented ||
        event.key.toLowerCase() !== 'k' ||
        (!event.metaKey && !event.ctrlKey) ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      if (!isOpen) {
        restoreFocusRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      }
      setQuery('');
      setIsOpen(true);
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isEnabled, isOpen]);

  useEffect(() => {
    if (wasOpenRef.current && !isOpen) {
      restoreFocusRef.current?.focus();
      restoreFocusRef.current = null;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  function handleOpenChange(nextIsOpen: boolean): void {
    setIsOpen(nextIsOpen);
    if (!nextIsOpen) {
      setQuery('');
    }
  }

  function handleValueChange(value: string): void {
    const result = resultByKey.get(value);
    if (!result) return;

    setIsOpen(false);
    setQuery('');
    void Promise.resolve()
      .then(() => onActivate(result))
      .catch(onActivationError);
  }

  return (
    <Dialog
      className={lagrangeThemeClass}
      closeLabel={copy.close}
      initialFocusRef={inputRef}
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      size="medium"
      title={copy.title}
    >
      <div className={styles.content} data-starlit-part="command-palette">
        <Combobox
          ref={inputRef}
          aria-label={copy.inputLabel}
          emptyMessage={copy.empty}
          onInputValueChange={setQuery}
          onValueChange={handleValueChange}
          options={options}
          placeholder={copy.placeholder}
        />
        <p className={styles.hint}>{copy.hint}</p>
      </div>
    </Dialog>
  );
}
