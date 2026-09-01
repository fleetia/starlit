import type { ChangeEvent, MouseEvent, ReactElement, ReactNode } from 'react';
import { useRef, useState } from 'react';
import {
  Button,
  Checkbox,
  ContextMenu,
  ContextMenuItem,
  FormField,
  Inline,
  PlacementPicker,
  Select,
  Stack,
  Switch,
  Text,
} from '@fleetia/lagrange';

import { useTranslation, type TranslationKey } from '../../i18n';
import {
  CANVAS_SCENE_VERSION,
  type CanvasSceneV2,
  type ClockWidgetInstance,
  type GoogleCalendarWidgetInstance,
  type WidgetInstance,
} from '../../scenes';
import { canAddBuiltInWidget, useCalendarWidget } from '../../widgets';
import { RangeControl, SettingsSection } from './controls';

type WidgetsPanelProps = {
  canvas: CanvasSceneV2 | null;
  children?: ReactNode;
  isImageProcessing: boolean;
  onChange: (canvas: CanvasSceneV2) => void;
  onImageFilesSelected: (files: File[]) => void;
};

type ConfiguredWidgetsPanelProps = {
  canvas: CanvasSceneV2;
  onChange: (canvas: CanvasSceneV2) => void;
};

const WIDGET_ANCHOR_LABEL_KEYS: Record<
  WidgetInstance['anchor'],
  TranslationKey
> = {
  'bottom-center': 'layers.anchor.bottomCenter',
  'bottom-left': 'layers.anchor.bottomLeft',
  'bottom-right': 'layers.anchor.bottomRight',
  'center-center': 'layers.anchor.centerCenter',
  'center-left': 'layers.anchor.centerLeft',
  'center-right': 'layers.anchor.centerRight',
  'top-center': 'layers.anchor.topCenter',
  'top-left': 'layers.anchor.topLeft',
  'top-right': 'layers.anchor.topRight',
};

function getWidgets(canvas: CanvasSceneV2): WidgetInstance[] {
  return canvas.layers.filter(
    (layer): layer is WidgetInstance => layer.kind === 'widget',
  );
}

function updateWidget(
  canvas: CanvasSceneV2,
  id: string,
  update: (widget: WidgetInstance) => WidgetInstance,
): CanvasSceneV2 {
  return {
    ...canvas,
    layers: canvas.layers.map((layer) =>
      layer.kind === 'widget' && layer.id === id ? update(layer) : layer,
    ),
  };
}

function reorderWidget(
  canvas: CanvasSceneV2,
  id: string,
  offset: -1 | 1,
): CanvasSceneV2 {
  const index = canvas.layers.findIndex(
    (layer) => layer.kind === 'widget' && layer.id === id,
  );
  const targetIndex = index + offset;
  if (index < 0 || targetIndex < 0 || targetIndex >= canvas.layers.length) {
    return canvas;
  }

  const layers = [...canvas.layers];
  const [widget] = layers.splice(index, 1);
  if (!widget) return canvas;
  layers.splice(targetIndex, 0, widget);
  return { ...canvas, layers };
}

function WidgetPlacementControls({
  canvas,
  onChange,
  widget,
}: {
  canvas: CanvasSceneV2;
  onChange: (canvas: CanvasSceneV2) => void;
  widget: WidgetInstance;
}): ReactElement {
  const { t } = useTranslation();
  const layerIndex = canvas.layers.findIndex(
    (layer) => layer.kind === 'widget' && layer.id === widget.id,
  );

  function updateFrame(frame: Partial<WidgetInstance['frame']>): void {
    onChange(
      updateWidget(canvas, widget.id, (current) => ({
        ...current,
        frame: { ...current.frame, ...frame },
      })),
    );
  }

  return (
    <Stack gap="sm">
      <FormField label={t('layers.screenPosition')}>
        <PlacementPicker
          getItemLabel={(anchor) => t(WIDGET_ANCHOR_LABEL_KEYS[anchor])}
          label={t('layers.screenPosition')}
          onValueChange={(anchor) =>
            onChange(
              updateWidget(canvas, widget.id, (current) => ({
                ...current,
                anchor,
              })),
            )
          }
          value={widget.anchor}
        />
      </FormField>
      <RangeControl
        label={t('widgets.offsetX')}
        max={640}
        min={-640}
        onValueChange={(offsetX) => updateFrame({ offsetX })}
        value={widget.frame.offsetX}
      />
      <RangeControl
        label={t('widgets.offsetY')}
        max={640}
        min={-640}
        onValueChange={(offsetY) => updateFrame({ offsetY })}
        value={widget.frame.offsetY}
      />
      <RangeControl
        label={t('widgets.width')}
        max={720}
        min={160}
        onValueChange={(width) => updateFrame({ width })}
        value={widget.frame.width}
      />
      <RangeControl
        label={t('widgets.height')}
        max={720}
        min={80}
        onValueChange={(height) => updateFrame({ height })}
        value={widget.frame.height}
      />
      <Inline gap="sm" wrap>
        <Switch
          checked={widget.isHidden}
          onChange={(event) =>
            onChange(
              updateWidget(canvas, widget.id, (current) => ({
                ...current,
                isHidden: event.currentTarget.checked,
              })),
            )
          }
        >
          {t('layers.action.hide')}
        </Switch>
        <Switch
          checked={widget.isLocked}
          onChange={(event) =>
            onChange(
              updateWidget(canvas, widget.id, (current) => ({
                ...current,
                isLocked: event.currentTarget.checked,
              })),
            )
          }
        >
          {t('layers.action.lock')}
        </Switch>
      </Inline>
      <Inline gap="sm" wrap>
        <Button
          disabled={layerIndex >= canvas.layers.length - 1}
          onClick={() => onChange(reorderWidget(canvas, widget.id, 1))}
          size="compact"
          variant="quiet"
        >
          {t('layers.moveForward')}
        </Button>
        <Button
          disabled={layerIndex <= 0}
          onClick={() => onChange(reorderWidget(canvas, widget.id, -1))}
          size="compact"
          variant="quiet"
        >
          {t('layers.moveBackward')}
        </Button>
      </Inline>
    </Stack>
  );
}

function createClockWidget(): ClockWidgetInstance {
  return {
    anchor: 'top-right',
    config: { hourCycle: 'locale', showSeconds: false },
    frame: { height: 88, offsetX: 24, offsetY: 24, width: 240 },
    id: crypto.randomUUID(),
    isHidden: false,
    isLocked: false,
    kind: 'widget',
    widgetType: 'clock',
  };
}

function createGoogleCalendarWidget(): GoogleCalendarWidgetInstance {
  return {
    anchor: 'top-right',
    config: { maxEvents: 8, showAllDay: true },
    frame: { height: 320, offsetX: 24, offsetY: 168, width: 360 },
    id: crypto.randomUUID(),
    isHidden: false,
    isLocked: false,
    kind: 'widget',
    widgetType: 'google-calendar',
  };
}

function appendWidget(
  canvas: CanvasSceneV2,
  widget: WidgetInstance,
): CanvasSceneV2 {
  const widgets = getWidgets(canvas);
  if (
    !canAddBuiltInWidget(
      widgets.map((item) => ({ kind: item.widgetType })),
      widget.widgetType,
    )
  ) {
    return canvas;
  }

  return {
    layers: [...canvas.layers, widget],
    version: CANVAS_SCENE_VERSION,
  };
}

function ConfiguredWidgetsPanel({
  canvas,
  onChange,
}: ConfiguredWidgetsPanelProps): ReactElement {
  const { t } = useTranslation();
  const calendar = useCalendarWidget();

  const activeCanvas = canvas;
  const widgets = getWidgets(activeCanvas);
  const clock = widgets.find(
    (widget): widget is ClockWidgetInstance => widget.widgetType === 'clock',
  );
  const googleCalendar = widgets.find(
    (widget): widget is GoogleCalendarWidgetInstance =>
      widget.widgetType === 'google-calendar',
  );

  function removeWidget(id: string): void {
    onChange({
      ...activeCanvas,
      layers: activeCanvas.layers.filter((layer) => layer.id !== id),
    });
  }

  return (
    <Stack gap="lg">
      {clock ? (
        <SettingsSection
          aside={
            <Button
              onClick={() => removeWidget(clock.id)}
              size="compact"
              variant="quiet"
            >
              {t('widgets.remove')}
            </Button>
          }
          description={t('widgets.clockDescription')}
          title={t('widgets.clock')}
        >
          <Stack gap="sm">
            <FormField label={t('widgets.hourCycle')}>
              <Select
                onChange={(event) => {
                  const hourCycle = event.currentTarget.value;
                  if (
                    hourCycle !== 'locale' &&
                    hourCycle !== 'h12' &&
                    hourCycle !== 'h24'
                  )
                    return;
                  onChange(
                    updateWidget(activeCanvas, clock.id, (widget) =>
                      widget.widgetType === 'clock'
                        ? {
                            ...widget,
                            config: { ...widget.config, hourCycle },
                          }
                        : widget,
                    ),
                  );
                }}
                value={clock.config.hourCycle}
              >
                <option value="locale">{t('widgets.hourCycleLocale')}</option>
                <option value="h12">{t('widgets.hourCycle12')}</option>
                <option value="h24">{t('widgets.hourCycle24')}</option>
              </Select>
            </FormField>
            <Switch
              checked={clock.config.showSeconds}
              onChange={(event) =>
                onChange(
                  updateWidget(activeCanvas, clock.id, (widget) =>
                    widget.widgetType === 'clock'
                      ? {
                          ...widget,
                          config: {
                            ...widget.config,
                            showSeconds: event.currentTarget.checked,
                          },
                        }
                      : widget,
                  ),
                )
              }
            >
              {t('widgets.showSeconds')}
            </Switch>
            <WidgetPlacementControls
              canvas={activeCanvas}
              onChange={onChange}
              widget={clock}
            />
          </Stack>
        </SettingsSection>
      ) : null}

      {googleCalendar ? (
        <SettingsSection
          aside={
            <Button
              onClick={() => removeWidget(googleCalendar.id)}
              size="compact"
              variant="quiet"
            >
              {t('widgets.remove')}
            </Button>
          }
          description={t('widgets.calendarDescription')}
          title={t('widgets.calendar')}
        >
          <Stack gap="md">
            <RangeControl
              label={t('widgets.maxEvents')}
              max={50}
              min={1}
              onValueChange={(maxEvents) =>
                onChange(
                  updateWidget(activeCanvas, googleCalendar.id, (widget) =>
                    widget.widgetType === 'google-calendar'
                      ? {
                          ...widget,
                          config: { ...widget.config, maxEvents },
                        }
                      : widget,
                  ),
                )
              }
              value={googleCalendar.config.maxEvents}
            />
            <Switch
              checked={googleCalendar.config.showAllDay}
              onChange={(event) =>
                onChange(
                  updateWidget(activeCanvas, googleCalendar.id, (widget) =>
                    widget.widgetType === 'google-calendar'
                      ? {
                          ...widget,
                          config: {
                            ...widget.config,
                            showAllDay: event.currentTarget.checked,
                          },
                        }
                      : widget,
                  ),
                )
              }
            >
              {t('widgets.showAllDay')}
            </Switch>

            <WidgetPlacementControls
              canvas={activeCanvas}
              onChange={onChange}
              widget={googleCalendar}
            />

            {calendar.status === 'disconnected' ? (
              <Stack gap="sm">
                <Text tone="muted">{t('widgets.calendarConsent')}</Text>
                <Button onClick={() => void calendar.connect()}>
                  {t('widgets.connect')}
                </Button>
                {calendar.error ? (
                  <Text aria-live="polite" tone="critical">
                    {t('widgets.error')}
                  </Text>
                ) : null}
              </Stack>
            ) : (
              <Stack gap="sm">
                {calendar.calendars.length === 0 ? (
                  <Button
                    onClick={() => void calendar.loadCalendars()}
                    variant="secondary"
                  >
                    {t('widgets.loadCalendars')}
                  </Button>
                ) : (
                  calendar.calendars.map((item) => (
                    <Checkbox
                      key={item.id}
                      checked={calendar.selectedCalendarIds.includes(item.id)}
                      onChange={(event) => {
                        const ids = event.currentTarget.checked
                          ? [...calendar.selectedCalendarIds, item.id]
                          : calendar.selectedCalendarIds.filter(
                              (id) => id !== item.id,
                            );
                        void calendar.setSelectedCalendarIds(ids);
                      }}
                    >
                      {item.name}
                    </Checkbox>
                  ))
                )}
                <Inline gap="sm">
                  <Button
                    onClick={() => void calendar.refresh()}
                    size="compact"
                    variant="secondary"
                  >
                    {t('widgets.refresh')}
                  </Button>
                  <Button
                    onClick={() => void calendar.disconnect()}
                    size="compact"
                    variant="quiet"
                  >
                    {t('widgets.disconnect')}
                  </Button>
                </Inline>
                {calendar.error ? (
                  <Text tone="critical">{t('widgets.error')}</Text>
                ) : null}
              </Stack>
            )}
          </Stack>
        </SettingsSection>
      ) : null}
    </Stack>
  );
}

export function WidgetsPanel({
  canvas,
  children,
  isImageProcessing,
  onChange,
  onImageFilesSelected,
}: WidgetsPanelProps): ReactElement {
  const { t } = useTranslation();
  const [addMenuPoint, setAddMenuPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const widgets = canvas ? getWidgets(canvas) : [];
  const canAddClock =
    canvas !== null &&
    canAddBuiltInWidget(
      widgets.map((widget) => ({ kind: widget.widgetType })),
      'clock',
    );
  const canAddCalendar =
    canvas !== null &&
    canAddBuiltInWidget(
      widgets.map((widget) => ({ kind: widget.widgetType })),
      'google-calendar',
    );

  function handleImageFilesSelected(
    event: ChangeEvent<HTMLInputElement>,
  ): void {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';

    if (files.length > 0) {
      onImageFilesSelected(files);
    }
  }

  function handleAddImage(): void {
    imageInputRef.current?.click();
    setAddMenuPoint(null);
  }

  function handleAddBuiltInWidget(widget: WidgetInstance): void {
    if (!canvas) return;
    const nextCanvas = appendWidget(canvas, widget);
    if (nextCanvas !== canvas) {
      onChange(nextCanvas);
      setAddMenuPoint(null);
    }
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
        ) : (
          <ConfiguredWidgetsPanel canvas={canvas} onChange={onChange} />
        )}
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
          disabled={!canAddCalendar}
          onSelect={() => handleAddBuiltInWidget(createGoogleCalendarWidget())}
        >
          {t('widgets.calendar')}
          {canvas && !canAddCalendar ? ` · ${t('widgets.alreadyAdded')}` : ''}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!canAddClock}
          onSelect={() => handleAddBuiltInWidget(createClockWidget())}
        >
          {t('widgets.clock')}
          {canvas && !canAddClock ? ` · ${t('widgets.alreadyAdded')}` : ''}
        </ContextMenuItem>
      </ContextMenu>
    </>
  );
}
