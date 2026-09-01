import type { CSSProperties, MouseEvent, ReactElement } from 'react';

import type { Locale } from '../i18n';
import type { CanvasFrame, CanvasSceneV2, WidgetInstance } from '../scenes';
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

function getCenteredInset(offset: number, size: number): string {
  const inset = offset - size / 2;
  return `calc(50% ${inset < 0 ? '-' : '+'} ${Math.abs(inset)}px)`;
}

function getFrameStyle(widget: WidgetInstance): CSSProperties {
  const [vertical, horizontal] = widget.anchor.split('-');
  const frame: CanvasFrame = widget.frame;
  const horizontalStyle =
    horizontal === 'center'
      ? { left: getCenteredInset(frame.offsetX, frame.width) }
      : horizontal === 'right'
        ? { right: frame.offsetX }
        : { left: frame.offsetX };
  const verticalStyle =
    vertical === 'center'
      ? { top: getCenteredInset(frame.offsetY, frame.height) }
      : vertical === 'bottom'
        ? { bottom: frame.offsetY }
        : { top: frame.offsetY };

  return {
    ...horizontalStyle,
    ...verticalStyle,
    height: frame.height,
    width: frame.width,
  };
}

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
          data-starlit-part={`widget-${widget.widgetType}`}
          onContextMenu={(event) => onWidgetContextMenu?.(event, widget.id)}
          style={getFrameStyle(widget)}
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
