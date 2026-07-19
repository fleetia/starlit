import type { ReactElement } from 'react';
import {
  Button,
  ContextMenu,
  ContextMenuItem,
  Dialog,
  Inline,
  Text,
} from '@fleetia/lagrange';

import { useTranslation } from '../i18n';
import type { BookmarkActionsController } from './useBookmarkActions';

type BookmarkActionOverlaysProps = {
  actions: BookmarkActionsController;
};

export function BookmarkActionOverlays({
  actions,
}: BookmarkActionOverlaysProps): ReactElement {
  const { t } = useTranslation();
  const {
    closeContextMenu,
    closeDeleteDialog,
    confirmDeleteBookmark,
    contextTarget,
    deleteCancelRef,
    deleteDescriptionId,
    deleteError,
    faviconInputRef,
    handleFaviconUpload,
    isDeleteDialogOpen,
    isDeletingBookmark,
    requestDelete,
    requestFaviconChange,
    resetTargetFavicon,
  } = actions;

  return (
    <>
      <ContextMenu
        anchorPoint={contextTarget?.point ?? { x: 0, y: 0 }}
        isOpen={contextTarget !== null}
        label={t('contextMenu.label')}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeContextMenu();
          }
        }}
      >
        <ContextMenuItem onSelect={requestFaviconChange}>
          {t('contextMenu.changeIcon')}
        </ContextMenuItem>
        <ContextMenuItem onSelect={resetTargetFavicon}>
          {t('contextMenu.resetIcon')}
        </ContextMenuItem>
        {!contextTarget?.isFolder ? (
          <ContextMenuItem onSelect={requestDelete} tone="critical">
            {t('contextMenu.delete')}
          </ContextMenuItem>
        ) : null}
      </ContextMenu>

      <Dialog
        aria-describedby={deleteDescriptionId}
        closeLabel={t('modal.close')}
        footer={
          <Inline gap="sm" justify="end">
            <Button
              ref={deleteCancelRef}
              disabled={isDeletingBookmark}
              onClick={closeDeleteDialog}
              variant="quiet"
            >
              {t('confirmDialog.cancel')}
            </Button>
            <Button
              isPending={isDeletingBookmark}
              onClick={() => void confirmDeleteBookmark()}
              variant="critical"
            >
              {t('contextMenu.deleteConfirmAction')}
            </Button>
          </Inline>
        }
        initialFocusRef={deleteCancelRef}
        isOpen={isDeleteDialogOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeDeleteDialog();
          }
        }}
        role="alertdialog"
        size="small"
        title={t('contextMenu.deleteConfirmTitle')}
      >
        <Text id={deleteDescriptionId}>
          {t('contextMenu.deleteConfirmDescription')}
        </Text>
        {deleteError ? (
          <Text aria-live="polite" as="p" tone="critical">
            {deleteError}
          </Text>
        ) : null}
      </Dialog>

      <input
        ref={faviconInputRef}
        accept="image/*"
        className="starlit-visually-hidden"
        onChange={(event) => void handleFaviconUpload(event)}
        tabIndex={-1}
        type="file"
      />
    </>
  );
}
