import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
  type RefObject,
} from 'react';

import { useTranslation } from '../i18n';
import { fileToDataUrl } from '../platform/files/fileToDataUrl';

export type BookmarkActionTarget = {
  bookmarkId: string;
  isFolder: boolean;
  point: { x: number; y: number };
};

type UseBookmarkActionsOptions = {
  deleteBookmark: (bookmarkId: string) => Promise<void>;
  fallbackFocusRef: RefObject<HTMLButtonElement | null>;
  resetFavicon: (bookmarkId: string) => Promise<void>;
  updateFavicon: (
    folderId: number,
    bookmarkId: string,
    favicon: string,
  ) => Promise<void>;
};

export type BookmarkActionsController = {
  closeContextMenu: () => void;
  closeDeleteDialog: () => void;
  confirmDeleteBookmark: () => Promise<void>;
  contextTarget: BookmarkActionTarget | null;
  deleteCancelRef: RefObject<HTMLButtonElement | null>;
  deleteDescriptionId: string;
  deleteError: string | null;
  faviconInputRef: RefObject<HTMLInputElement | null>;
  handleFaviconUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  isDeleteDialogOpen: boolean;
  isDeletingBookmark: boolean;
  openContextMenu: (
    event: MouseEvent<HTMLElement>,
    bookmarkId: string,
    isFolder: boolean,
  ) => void;
  requestDelete: () => void;
  requestFaviconChange: () => void;
  resetTargetFavicon: () => void;
};

export function useBookmarkActions({
  deleteBookmark,
  fallbackFocusRef,
  resetFavicon,
  updateFavicon,
}: UseBookmarkActionsOptions): BookmarkActionsController {
  const { t } = useTranslation();
  const [contextTarget, setContextTarget] =
    useState<BookmarkActionTarget | null>(null);
  const [bookmarkIdToDelete, setBookmarkIdToDelete] = useState<string | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeletingBookmark, setIsDeletingBookmark] = useState(false);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const faviconTargetRef = useRef<BookmarkActionTarget | null>(null);
  const contextTriggerRef = useRef<HTMLElement>(null);
  const deleteCancelRef = useRef<HTMLButtonElement>(null);
  const deleteFocusFallbackRef = useRef<HTMLElement>(null);
  const deleteFocusRestoreRef = useRef<HTMLElement>(null);
  const isDeleteFocusRestorePendingRef = useRef(false);
  const deleteDescriptionId = `starlit-delete-bookmark-${useId()}`;

  useEffect(() => {
    if (bookmarkIdToDelete !== null) {
      requestAnimationFrame(() => {
        deleteCancelRef.current?.focus();
      });
      return;
    }

    if (!isDeleteFocusRestorePendingRef.current) {
      return;
    }

    const focusTarget = deleteFocusRestoreRef.current;
    isDeleteFocusRestorePendingRef.current = false;
    deleteFocusRestoreRef.current = null;
    requestAnimationFrame(() => {
      const target = focusTarget?.isConnected
        ? focusTarget
        : fallbackFocusRef.current;
      target?.focus();
    });
  }, [bookmarkIdToDelete, fallbackFocusRef]);

  function openContextMenu(
    event: MouseEvent<HTMLElement>,
    bookmarkId: string,
    isFolder: boolean,
  ): void {
    event.preventDefault();
    const trigger = event.currentTarget;
    contextTriggerRef.current = trigger;

    if (isFolder) {
      deleteFocusFallbackRef.current = null;
    } else {
      const grid = trigger.closest('[data-starlit-part="bookmark-grid"]');
      const tiles = Array.from(
        grid?.querySelectorAll<HTMLButtonElement>(
          'button[data-starlit-part="bookmark-tile"]',
        ) ?? [],
      );
      const triggerIndex = tiles.findIndex((tile) => tile === trigger);
      deleteFocusFallbackRef.current =
        triggerIndex >= 0
          ? (tiles[triggerIndex + 1] ?? tiles[triggerIndex - 1] ?? null)
          : null;
    }

    setContextTarget({
      bookmarkId,
      isFolder,
      point: { x: event.clientX, y: event.clientY },
    });
  }

  function closeContextMenu(): void {
    setContextTarget(null);
  }

  function requestFaviconChange(): void {
    faviconTargetRef.current = contextTarget;
    faviconInputRef.current?.click();
  }

  function resetTargetFavicon(): void {
    if (contextTarget) {
      void resetFavicon(contextTarget.bookmarkId);
    }
  }

  function requestDelete(): void {
    if (!contextTarget) {
      return;
    }

    setDeleteError(null);
    setBookmarkIdToDelete(contextTarget.bookmarkId);
  }

  async function handleFaviconUpload(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.currentTarget.files?.[0];
    const target = faviconTargetRef.current;
    event.currentTarget.value = '';

    if (!file || !target) {
      return;
    }

    const favicon = await fileToDataUrl(file);
    await updateFavicon(0, target.bookmarkId, favicon);
    faviconTargetRef.current = null;
  }

  function closeDeleteDialog(): void {
    if (isDeletingBookmark) {
      return;
    }

    deleteFocusRestoreRef.current = contextTriggerRef.current;
    isDeleteFocusRestorePendingRef.current = true;
    setBookmarkIdToDelete(null);
    setDeleteError(null);
    contextTriggerRef.current = null;
    deleteFocusFallbackRef.current = null;
  }

  async function confirmDeleteBookmark(): Promise<void> {
    if (!bookmarkIdToDelete || isDeletingBookmark) {
      return;
    }

    setDeleteError(null);
    setIsDeletingBookmark(true);

    try {
      await deleteBookmark(bookmarkIdToDelete);
      deleteFocusRestoreRef.current = deleteFocusFallbackRef.current;
      isDeleteFocusRestorePendingRef.current = true;
      setBookmarkIdToDelete(null);
      contextTriggerRef.current = null;
      deleteFocusFallbackRef.current = null;
    } catch {
      setDeleteError(t('contextMenu.deleteFailed'));
    } finally {
      setIsDeletingBookmark(false);
    }
  }

  return {
    closeContextMenu,
    closeDeleteDialog,
    confirmDeleteBookmark,
    contextTarget,
    deleteCancelRef,
    deleteDescriptionId,
    deleteError,
    faviconInputRef,
    handleFaviconUpload,
    isDeleteDialogOpen: bookmarkIdToDelete !== null,
    isDeletingBookmark,
    openContextMenu,
    requestDelete,
    requestFaviconChange,
    resetTargetFavicon,
  };
}
