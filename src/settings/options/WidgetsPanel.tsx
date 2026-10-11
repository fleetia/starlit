import type { ChangeEvent, MouseEvent, ReactElement, ReactNode } from 'react';
import { useRef, useState } from 'react';
import {
  Button,
  ContextMenu,
  ContextMenuItem,
  Stack,
  Text,
} from '@fleetia/lagrange';

import { useTranslation } from '../../i18n';
import {
  CANVAS_SCENE_VERSION,
  type CalendarWidgetInstance,
  type CanvasSceneV2,
  type ClockWidgetInstance,
  type WidgetInstance,
} from '../../scenes';
import { DEFAULT_CLOCK_WIDGET_CONFIG } from '../../widgets';
import { SettingsSection } from './controls';

type WidgetsPanelProps = {
  canvas: CanvasSceneV2 | null;
  children?: ReactNode;
  isImageProcessing: boolean;
  onChange: (canvas: CanvasSceneV2) => void;
  onImageFilesSelected: (files: File[]) => void;
  onWidgetAdded: (widgetId: string) => void;
};

function getWidgetCount(canvas: CanvasSceneV2): number {
  return canvas.layers.filter((layer) => layer.kind === 'widget').length;
}

function createClockWidget(index: number): ClockWidgetInstance {
  return {
    anchor: 'top-right',
    config: { ...DEFAULT_CLOCK_WIDGET_CONFIG },
    frame: {
      height: 112,
      offsetX: 24 + index * 24,
      offsetY: 24 + index * 24,
      width: 240,
    },
    id: crypto.randomUUID(),
    isHidden: false,
    isLocked: false,
    kind: 'widget',
    widgetType: 'clock',
  };
}

function createCalendarWidget(index: number): CalendarWidgetInstance {
  return {
    anchor: 'top-right',
    config: { feedUrl: null, maxEvents: 8, showAllDay: true },
    frame: {
      height: 320,
      offsetX: 24 + index * 24,
      offsetY: 168 + index * 24,
      width: 360,
    },
    id: crypto.randomUUID(),
    isHidden: false,
    isLocked: false,
    kind: 'widget',
    widgetType: 'calendar',
  };
}

function appendWidget(
  canvas: CanvasSceneV2,
  widget: WidgetInstance,
): CanvasSceneV2 {
  return {
    layers: [...canvas.layers, widget],
    version: CANVAS_SCENE_VERSION,
  };
}

export function WidgetsPanel({
  canvas,
  children,
  isImageProcessing,
  onChange,
  onImageFilesSelected,
  onWidgetAdded,
}: WidgetsPanelProps): ReactElement {
  const { t } = useTranslation();
  const [addMenuPoint, setAddMenuPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const widgetCount = canvas ? getWidgetCount(canvas) : 0;

  function handleImageFilesSelected(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';
    if (files.length > 0) onImageFilesSelected(files);
  }

  function handleAddImage(): void {
    imageInputRef.current?.click();
    setAddMenuPoint(null);
  }

  function handleAddBuiltInWidget(widget: WidgetInstance): void {
    if (!canvas) return;
    onChange(appendWidget(canvas, widget));
    onWidgetAdded(widget.id);
    setAddMenuPoint(null);
  }

  function handleOpenAddMenu(event: MouseEvent<HTMLButtonElement>): void {
    const bounds = event.currentTarget.getBoundingClientRect();
    setAddMenuPoint({ x: bounds.left, y: bounds.bottom });
  }

  return (
    <>
      <Stack gap="lg">
        <SettingsSection
          description={t('widgets.description')}
          title={t('sidebar.tab.widgets')}
        >
          <Button
            aria-expanded={addMenuPoint !== null}
            aria-haspopup="menu"
            disabled={isImageProcessing}
            isPending={isImageProcessing}
            onClick={handleOpenAddMenu}
          >
            {t('widgets.add')}
          </Button>
          <input
            ref={imageInputRef}
            accept="image/*,video/*,.gif"
            aria-label={t('layers.add')}
            disabled={isImageProcessing}
            hidden
            multiple
            onChange={handleImageFilesSelected}
            type="file"
          />
        </SettingsSection>
        {children}
        {!canvas ? (
          <Text tone="muted">{t('widgets.sceneRequired')}</Text>
        ) : null}
      </Stack>
      <ContextMenu
        anchorPoint={addMenuPoint ?? { x: 0, y: 0 }}
        isOpen={addMenuPoint !== null}
        label={t('widgets.chooseTitle')}
        onOpenChange={(isOpen) => {
          if (!isOpen) setAddMenuPoint(null);
        }}
      >
        <ContextMenuItem onSelect={handleAddImage}>
          {t('widgets.image')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canvas}
          onSelect={() =>
            handleAddBuiltInWidget(createCalendarWidget(widgetCount))
          }
        >
          {t('widgets.calendar')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canvas}
          onSelect={() =>
            handleAddBuiltInWidget(createClockWidget(widgetCount))
          }
        >
          {t('widgets.clock')}
        </ContextMenuItem>
      </ContextMenu>
    </>
  );
}
