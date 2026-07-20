import { useRef, useState } from 'react';

import {
  openBookmarkTabGroup,
  type OpenBookmarkTabGroupResult,
} from '../platform/tabGroups/openBookmarkTabGroup';
import type { Bookmark } from './types';

export type OpenBookmarkTabGroupMessages = {
  activationFailed: string;
  empty: string;
  failed: string;
  noValidBookmarks: string;
  opened: (openedCount: number, skippedCount: number) => string;
  opening: string;
  permissionDenied: string;
  rollbackIncomplete: (remainingTabCount: number) => string;
};

type TabGroupStatus = {
  message: string;
  tone: 'critical' | 'muted';
};

export type OpenBookmarkTabGroupController = {
  cancelConfirmation: () => void;
  confirmOpen: () => void;
  folderToConfirm: Bookmark | null;
  isOpening: boolean;
  requestOpen: (folder: Bookmark) => void;
  status: TabGroupStatus | null;
};

function getResultStatus(
  result: OpenBookmarkTabGroupResult,
  messages: OpenBookmarkTabGroupMessages,
): TabGroupStatus {
  if (result.status === 'opened') {
    return {
      message: result.activationFailed
        ? `${messages.opened(result.openedCount, result.skippedCount)} ${messages.activationFailed}`
        : messages.opened(result.openedCount, result.skippedCount),
      tone: result.activationFailed ? 'critical' : 'muted',
    };
  }

  if (result.status === 'permission-denied') {
    return { message: messages.permissionDenied, tone: 'critical' };
  }

  if (result.status === 'no-valid-bookmarks') {
    return { message: messages.noValidBookmarks, tone: 'critical' };
  }

  return {
    message:
      result.remainingTabCount > 0
        ? `${messages.failed} ${messages.rollbackIncomplete(result.remainingTabCount)}`
        : messages.failed,
    tone: 'critical',
  };
}

function getActiveTrigger(): HTMLElement | null {
  return document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null;
}

export function useOpenBookmarkTabGroup(
  messages: OpenBookmarkTabGroupMessages,
): OpenBookmarkTabGroupController {
  const [folderToConfirm, setFolderToConfirm] = useState<Bookmark | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [status, setStatus] = useState<TabGroupStatus | null>(null);
  const isOpeningRef = useRef(false);
  const triggerRef = useRef<HTMLElement | null>(null);

  function restoreTriggerFocus(): void {
    const trigger = triggerRef.current;
    triggerRef.current = null;
    queueMicrotask(() => trigger?.focus());
  }

  async function executeOpen(folder: Bookmark): Promise<void> {
    if (isOpeningRef.current) {
      return;
    }

    isOpeningRef.current = true;
    setIsOpening(true);
    setStatus({ message: messages.opening, tone: 'muted' });

    try {
      const result = await openBookmarkTabGroup(
        folder.title,
        folder.list ?? [],
      );
      setStatus(getResultStatus(result, messages));
    } catch {
      setStatus({ message: messages.failed, tone: 'critical' });
    } finally {
      isOpeningRef.current = false;
      setIsOpening(false);
    }
  }

  function requestOpen(folder: Bookmark): void {
    if (isOpeningRef.current) {
      return;
    }

    triggerRef.current = getActiveTrigger();

    if ((folder.list?.length ?? 0) === 0) {
      setStatus({ message: messages.empty, tone: 'muted' });
      triggerRef.current = null;
      return;
    }

    setFolderToConfirm(folder);
  }

  function cancelConfirmation(): void {
    setFolderToConfirm(null);
    restoreTriggerFocus();
  }

  function confirmOpen(): void {
    const folder = folderToConfirm;

    if (!folder) {
      return;
    }

    setFolderToConfirm(null);
    restoreTriggerFocus();
    void executeOpen(folder);
  }

  return {
    cancelConfirmation,
    confirmOpen,
    folderToConfirm,
    isOpening,
    requestOpen,
    status,
  };
}
