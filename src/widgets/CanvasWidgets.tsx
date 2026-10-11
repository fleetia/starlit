import type { MouseEvent, ReactElement } from 'react';

import type { Locale } from '../i18n';
import type { CanvasSceneV2, WidgetInstance } from '../scenes';
import { getWidgetFrameStyle } from './frame';
import { CalendarWidgetView, ClockWidgetView } from './WidgetViews';
import type { CalendarWidgetCopy } from './WidgetViews';
import * as styles from './CanvasWidgets.css';

type CanvasWidgetsProps = {
  calendarCopy: CalendarWidgetCopy;
  canvas: CanvasSceneV2 | null;
  locale: Locale;
  onWidgetContextMenu?: (
    event: MouseEvent<HTMLElement>,
    widgetId: string,
  ) => void;
};

function renderWidgets(
  canvas: CanvasSceneV2,
  locale: Locale,
  calendarCopy: CalendarWidgetCopy,
  onWidgetContextMenu?: CanvasWidgetsProps['onWidgetContextMenu'],
): ReactElement[] {
  return canvas.layers.flatMap((layer, index): ReactElement[] => {
    if (layer.kind !== 'widget' || layer.isHidden) return [];
    const widget: WidgetInstance = layer;
    return [
      <div
        key={widget.id}
        className={styles.compositor}
        data-canvas-layer-id={widget.id}
        style={{ zIndex: index + 1 }}
      >
        <div
          className={styles.frame}
          data-canvas-widget-id={widget.id}
          data-starlit-part={`widget-${widget.widgetType}`}
          onContextMenu={(event) => onWidgetContextMenu?.(event, widget.id)}
          style={getWidgetFrameStyle(widget)}
        >
          {widget.widgetType === 'clock' ? (
            <ClockWidgetView instance={widget} locale={locale} />
          ) : (
            <CalendarWidgetView
              copy={calendarCopy}
              instance={widget}
              locale={locale}
            />
          )}
        </div>
      </div>,
    ];
  });
}

export function CanvasWidgets({
  calendarCopy,
  canvas,
  locale,
  onWidgetContextMenu,
}: CanvasWidgetsProps): ReactElement | null {
  if (!canvas) return null;
  return (
    <>{renderWidgets(canvas, locale, calendarCopy, onWidgetContextMenu)}</>
  );
}
