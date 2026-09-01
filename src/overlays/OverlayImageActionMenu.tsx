import { ContextMenu, ContextMenuItem } from '@fleetia/lagrange';
import { useRef, type ChangeEvent, type ReactElement } from 'react';

import { useTranslation } from '../i18n';
import { getOverlayImageMediaKind } from './model';
import {
  isOverlayImageActionHidden,
  isOverlayImageActionLocked,
  type OverlayImageActionsController,
} from './useOverlayImageActions';

export type OverlayImageActionMenuProps = {
  controller: OverlayImageActionsController;
};

export function OverlayImageActionMenu({
  controller,
}: OverlayImageActionMenuProps): ReactElement {
  const { t } = useTranslation();
  const image = controller.image;
  const disabled = controller.isDisabled || controller.isProcessing;
  const isMotion = image ? getOverlayImageMediaKind(image) === 'motion' : false;
  const replacementInputRef = useRef<HTMLInputElement>(null);
  const replacementTargetIdRef = useRef<string | null>(null);

  function requestReplacement(): void {
    if (!image || disabled) return;
    replacementTargetIdRef.current = image.id;
    replacementInputRef.current?.click();
  }

  function handleReplacementFile(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0];
    const imageId = replacementTargetIdRef.current;
    event.currentTarget.value = '';
    replacementTargetIdRef.current = null;
    if (file && imageId) {
      void controller.replaceImage(imageId, file);
    }
  }

  return (
    <>
      <ContextMenu
        anchorPoint={controller.menuTarget?.point ?? { x: 0, y: 0 }}
        isOpen={controller.menuTarget !== null && image !== null}
        label={t('layers.action.menu')}
        onOpenChange={(isOpen) => {
          if (!isOpen) controller.closeMenu();
        }}
      >
        <ContextMenuItem disabled={disabled} onSelect={controller.editImage}>
          {t('layers.action.edit')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={disabled}
          onSelect={() =>
            void controller.setHidden(!isOverlayImageActionHidden(controller))
          }
        >
          {isOverlayImageActionHidden(controller)
            ? t('layers.action.show')
            : t('layers.action.hide')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={disabled}
          onSelect={() =>
            void controller.setLocked(!isOverlayImageActionLocked(controller))
          }
        >
          {isOverlayImageActionLocked(controller)
            ? t('layers.action.unlock')
            : t('layers.action.lock')}
        </ContextMenuItem>
        {isMotion ? (
          <>
            <ContextMenuItem
              disabled={disabled}
              onSelect={controller.playMotion}
            >
              {t('layers.action.play')}
            </ContextMenuItem>
            <ContextMenuItem
              disabled={disabled}
              onSelect={controller.pauseMotion}
            >
              {t('layers.action.pause')}
            </ContextMenuItem>
          </>
        ) : null}
        <ContextMenuItem
          disabled={disabled}
          onSelect={() => void controller.duplicateImage()}
        >
          {t('layers.action.duplicate')}
        </ContextMenuItem>
        <ContextMenuItem disabled={disabled} onSelect={requestReplacement}>
          {t('layers.action.replace')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={disabled || !controller.canMoveForward}
          onSelect={() => void controller.moveForward()}
        >
          {t('layers.moveForward')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={disabled || !controller.canMoveBackward}
          onSelect={() => void controller.moveBackward()}
        >
          {t('layers.moveBackward')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={disabled || !controller.canMoveForward}
          onSelect={() => void controller.bringToFront()}
        >
          {t('layers.action.bringToFront')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={disabled || !controller.canMoveBackward}
          onSelect={() => void controller.sendToBack()}
        >
          {t('layers.action.sendToBack')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={disabled}
          onSelect={() => void controller.deleteImage()}
          tone="critical"
        >
          {t('layers.remove')}
        </ContextMenuItem>
      </ContextMenu>
      <input
        ref={replacementInputRef}
        accept="image/*,video/*,.gif"
        aria-label={t('layers.action.replace')}
        className="starlit-visually-hidden"
        onChange={handleReplacementFile}
        tabIndex={-1}
        type="file"
      />
    </>
  );
}
