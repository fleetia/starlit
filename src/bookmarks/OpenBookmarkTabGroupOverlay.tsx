import { useId, useRef, type ReactElement } from 'react';
import { Button, Dialog, Inline, Text } from '@fleetia/lagrange';

import { useTranslation } from '../i18n';
import type { OpenBookmarkTabGroupController } from './useOpenBookmarkTabGroup';

type OpenBookmarkTabGroupOverlayProps = {
  controller: OpenBookmarkTabGroupController;
};

export function OpenBookmarkTabGroupOverlay({
  controller,
}: OpenBookmarkTabGroupOverlayProps): ReactElement {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const descriptionId = useId();
  const { folderToConfirm, isOpening, status } = controller;
  const bookmarkCount = folderToConfirm?.list?.length ?? 0;

  return (
    <>
      <Dialog
        aria-describedby={descriptionId}
        closeLabel={t('modal.close')}
        footer={
          <Inline gap="sm" justify="end">
            <Button
              ref={cancelRef}
              onClick={controller.cancelConfirmation}
              variant="quiet"
            >
              {t('confirmDialog.cancel')}
            </Button>
            <Button onClick={controller.confirmOpen}>
              {t('tabGroups.openConfirm')}
            </Button>
          </Inline>
        }
        initialFocusRef={cancelRef}
        isOpen={folderToConfirm !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            controller.cancelConfirmation();
          }
        }}
        role="alertdialog"
        size="small"
        title={t('tabGroups.openConfirmTitle')}
      >
        <Text id={descriptionId}>
          {folderToConfirm?.title}: {bookmarkCount}
          {t(
            bookmarkCount === 1
              ? 'tabGroups.singleTabCountSuffix'
              : 'tabGroups.tabCountSuffix',
          )}{' '}
          {t('tabGroups.openConfirmDescription')}
        </Text>
      </Dialog>

      {status ? (
        <Text
          aria-live="polite"
          className="starlit-tab-group-status"
          data-starlit-part="tab-group-status"
          role={status.tone === 'critical' ? 'alert' : 'status'}
          tone={status.tone}
        >
          {isOpening ? t('tabGroups.opening') : status.message}
        </Text>
      ) : null}
    </>
  );
}
