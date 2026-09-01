import type { ChangeEvent, MouseEvent, ReactElement, ReactNode } from 'react';
import { useRef, useState } from 'react';
import {
  Button,
  ContextMenu,
  ContextMenuItem,
  FormField,
  Inline,
  PlacementPicker,
  Select,
  Stack,
  Switch,
  Text,
  TextField,
} from '@fleetia/lagrange';

import { normalizeCalendarFeedUrl } from '../../calendar';
import { useTranslation, type TranslationKey } from '../../i18n';
import {
  CANVAS_SCENE_VERSION,
  type CalendarWidgetInstance,
  type CanvasSceneV2,
  type ClockWidgetInstance,
  type WidgetInstance,
} from '../../scenes';
import {
  DEFAULT_CLOCK_WIDGET_CONFIG,
  isValidClockFormat,
  isValidClockTimeZone,
  useCalendarWidget,
} from '../../widgets';
import { RangeControl, SettingsSection } from './controls';

type WidgetsPanelProps = {
  canvas: CanvasSceneV2 | null;
  children?: ReactNode;
  isImageProcessing: boolean;
  onChange: (canvas: CanvasSceneV2) => void;
  onImageFilesSelected: (files: File[]) => void;
  onSelectWidget: (widgetId: string | null) => void;
  selectedWidgetId: string | null;
};

type ConfiguredWidgetsPanelProps = {
  canvas: CanvasSceneV2;
  onChange: (canvas: CanvasSceneV2) => void;
  onSelectWidget: (widgetId: string | null) => void;
  selectedWidgetId: string | null;
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
  const index = canvas.layers.findIndex((layer) => layer.id === id);
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
  const layerIndex = canvas.layers.findIndex((layer) => layer.id === widget.id);

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
        min={120}
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

function updateClockConfig(
  canvas: CanvasSceneV2,
  widgetId: string,
  config: Partial<ClockWidgetInstance['config']>,
): CanvasSceneV2 {
  return updateWidget(canvas, widgetId, (widget) =>
    widget.widgetType === 'clock'
      ? { ...widget, config: { ...widget.config, ...config } }
      : widget,
  );
}

function ClockEditor({
  canvas,
  onChange,
  widget,
}: {
  canvas: CanvasSceneV2;
  onChange: (canvas: CanvasSceneV2) => void;
  widget: ClockWidgetInstance;
}): ReactElement {
  const { t } = useTranslation();
  const [formatInput, setFormatInput] = useState(widget.config.format);
  const [timeZoneInput, setTimeZoneInput] = useState(
    widget.config.timeZone ?? '',
  );
  const isFormatValid = isValidClockFormat(formatInput);
  const normalizedTimeZone = timeZoneInput.trim() || null;
  const isTimeZoneValid = isValidClockTimeZone(normalizedTimeZone);

  function commitFormat(): void {
    if (isFormatValid && formatInput !== widget.config.format) {
      onChange(updateClockConfig(canvas, widget.id, { format: formatInput }));
    }
  }

  function commitTimeZone(): void {
    if (isTimeZoneValid && normalizedTimeZone !== widget.config.timeZone) {
      onChange(
        updateClockConfig(canvas, widget.id, {
          timeZone: normalizedTimeZone,
        }),
      );
    }
  }

  return (
    <Stack gap="md">
      <FormField label={t('widgets.appearance')}>
        <Select
          onChange={(event) => {
            const appearance = event.currentTarget.value;
            if (appearance !== 'analog' && appearance !== 'digital') return;
            onChange(updateClockConfig(canvas, widget.id, { appearance }));
          }}
          value={widget.config.appearance}
        >
          <option value="digital">{t('widgets.digital')}</option>
          <option value="analog">{t('widgets.analog')}</option>
        </Select>
      </FormField>
      {widget.config.appearance === 'digital' ? (
        <FormField
          description={t('widgets.formatDescription')}
          label={t('widgets.format')}
        >
          <Stack gap="xs">
            <TextField
              aria-invalid={!isFormatValid || undefined}
              onBlur={commitFormat}
              onChange={(event) => setFormatInput(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitFormat();
              }}
              value={formatInput}
            />
            {!isFormatValid ? (
              <Text tone="critical" variant="caption">
                {t('widgets.invalidFormat')}
              </Text>
            ) : null}
          </Stack>
        </FormField>
      ) : (
        <Switch
          checked={widget.config.showSecondHand}
          onChange={(event) =>
            onChange(
              updateClockConfig(canvas, widget.id, {
                showSecondHand: event.currentTarget.checked,
              }),
            )
          }
        >
          {t('widgets.showSecondHand')}
        </Switch>
      )}
      <FormField
        description={t('widgets.timeZoneDescription')}
        label={t('widgets.timeZone')}
      >
        <Stack gap="xs">
          <TextField
            aria-invalid={!isTimeZoneValid || undefined}
            onBlur={commitTimeZone}
            onChange={(event) => setTimeZoneInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitTimeZone();
            }}
            placeholder="Asia/Seoul"
            value={timeZoneInput}
          />
          {!isTimeZoneValid ? (
            <Text tone="critical" variant="caption">
              {t('widgets.invalidTimeZone')}
            </Text>
          ) : null}
        </Stack>
      </FormField>
      <WidgetPlacementControls
        canvas={canvas}
        onChange={onChange}
        widget={widget}
      />
    </Stack>
  );
}

function updateCalendarConfig(
  canvas: CanvasSceneV2,
  widgetId: string,
  config: Partial<CalendarWidgetInstance['config']>,
): CanvasSceneV2 {
  return updateWidget(canvas, widgetId, (widget) =>
    widget.widgetType === 'calendar'
      ? { ...widget, config: { ...widget.config, ...config } }
      : widget,
  );
}

function CalendarEditor({
  canvas,
  onChange,
  widget,
}: {
  canvas: CanvasSceneV2;
  onChange: (canvas: CanvasSceneV2) => void;
  widget: CalendarWidgetInstance;
}): ReactElement {
  const { t } = useTranslation();
  const [feedUrlInput, setFeedUrlInput] = useState(widget.config.feedUrl ?? '');
  const location = normalizeCalendarFeedUrl(feedUrlInput);
  const calendar = useCalendarWidget(widget.config.feedUrl);

  function commitFeedUrl(): string | null {
    if (feedUrlInput.trim() === '') {
      if (widget.config.feedUrl !== null) {
        onChange(updateCalendarConfig(canvas, widget.id, { feedUrl: null }));
      }
      return null;
    }
    if (!location) return null;
    if (location.url !== widget.config.feedUrl) {
      onChange(
        updateCalendarConfig(canvas, widget.id, { feedUrl: location.url }),
      );
    }
    return location.url;
  }

  async function subscribe(): Promise<void> {
    const feedUrl = commitFeedUrl();
    if (feedUrl) await calendar.subscribe(feedUrl);
  }

  return (
    <Stack gap="md">
      <FormField
        description={t('widgets.feedUrlDescription')}
        label={t('widgets.feedUrl')}
      >
        <Stack gap="xs">
          <TextField
            aria-invalid={
              feedUrlInput.trim() !== '' && !location ? true : undefined
            }
            inputMode="url"
            onBlur={commitFeedUrl}
            onChange={(event) => setFeedUrlInput(event.currentTarget.value)}
            placeholder="webcal://example.com/calendar.ics"
            type="url"
            value={feedUrlInput}
          />
          {feedUrlInput.trim() !== '' && !location ? (
            <Text tone="critical" variant="caption">
              {t('widgets.invalidFeedUrl')}
            </Text>
          ) : null}
        </Stack>
      </FormField>
      <Text tone="muted" variant="caption">
        {t('widgets.calendarConsent')}
      </Text>
      <Inline gap="sm" wrap>
        <Button
          disabled={!location || calendar.status === 'loading'}
          isPending={calendar.status === 'loading'}
          onClick={() => void subscribe()}
          size="compact"
        >
          {t('widgets.subscribe')}
        </Button>
        {widget.config.feedUrl ? (
          <Button
            disabled={calendar.status === 'loading'}
            onClick={() => void calendar.refresh()}
            size="compact"
            variant="secondary"
          >
            {t('widgets.refresh')}
          </Button>
        ) : null}
      </Inline>
      {calendar.error ? (
        <Text aria-live="polite" tone="critical" variant="caption">
          {t('widgets.error')}
        </Text>
      ) : null}
      <RangeControl
        label={t('widgets.maxEvents')}
        max={50}
        min={1}
        onValueChange={(maxEvents) =>
          onChange(updateCalendarConfig(canvas, widget.id, { maxEvents }))
        }
        value={widget.config.maxEvents}
      />
      <Switch
        checked={widget.config.showAllDay}
        onChange={(event) =>
          onChange(
            updateCalendarConfig(canvas, widget.id, {
              showAllDay: event.currentTarget.checked,
            }),
          )
        }
      >
        {t('widgets.showAllDay')}
      </Switch>
      <WidgetPlacementControls
        canvas={canvas}
        onChange={onChange}
        widget={widget}
      />
    </Stack>
  );
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

function ConfiguredWidgetsPanel({
  canvas,
  onChange,
  onSelectWidget,
  selectedWidgetId,
}: ConfiguredWidgetsPanelProps): ReactElement | null {
  const { t } = useTranslation();
  const widgets = getWidgets(canvas);
  const selectedWidget =
    widgets.find((widget) => widget.id === selectedWidgetId) ??
    widgets.at(0) ??
    null;

  if (!selectedWidget) return null;
  const selectedWidgetIdValue = selectedWidget.id;

  function removeWidget(): void {
    onChange({
      ...canvas,
      layers: canvas.layers.filter(
        (layer) => layer.id !== selectedWidgetIdValue,
      ),
    });
    onSelectWidget(null);
  }

  return (
    <SettingsSection
      aside={
        <Button onClick={removeWidget} size="compact" variant="quiet">
          {t('widgets.remove')}
        </Button>
      }
      description={t(
        selectedWidget.widgetType === 'clock'
          ? 'widgets.clockDescription'
          : 'widgets.calendarDescription',
      )}
      title={t(
        selectedWidget.widgetType === 'clock'
          ? 'widgets.clock'
          : 'widgets.calendar',
      )}
    >
      {selectedWidget.widgetType === 'clock' ? (
        <ClockEditor
          key={selectedWidget.id}
          canvas={canvas}
          onChange={onChange}
          widget={selectedWidget}
        />
      ) : (
        <CalendarEditor
          key={selectedWidget.id}
          canvas={canvas}
          onChange={onChange}
          widget={selectedWidget}
        />
      )}
    </SettingsSection>
  );
}

export function WidgetsPanel({
  canvas,
  children,
  isImageProcessing,
  onChange,
  onImageFilesSelected,
  onSelectWidget,
  selectedWidgetId,
}: WidgetsPanelProps): ReactElement {
  const { t } = useTranslation();
  const [addMenuPoint, setAddMenuPoint] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const widgetCount = canvas ? getWidgets(canvas).length : 0;

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
    onSelectWidget(widget.id);
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
        ) : (
          <ConfiguredWidgetsPanel
            canvas={canvas}
            onChange={onChange}
            onSelectWidget={onSelectWidget}
            selectedWidgetId={selectedWidgetId}
          />
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
