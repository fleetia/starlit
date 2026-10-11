import type { CSSProperties } from 'react';

import type { CanvasFrame, WidgetInstance } from '../scenes';

function getCenteredInset(offset: number, size: number): string {
  const inset = offset - size / 2;
  return `calc(50% ${inset < 0 ? '-' : '+'} ${Math.abs(inset)}px)`;
}

export function getWidgetFrameStyle(widget: WidgetInstance): CSSProperties {
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

export function moveWidget(
  widget: WidgetInstance,
  deltaX: number,
  deltaY: number,
): WidgetInstance {
  const [vertical, horizontal] = widget.anchor.split('-');

  return {
    ...widget,
    frame: {
      ...widget.frame,
      offsetX:
        widget.frame.offsetX + (horizontal === 'right' ? -deltaX : deltaX),
      offsetY:
        widget.frame.offsetY + (vertical === 'bottom' ? -deltaY : deltaY),
    },
  };
}
