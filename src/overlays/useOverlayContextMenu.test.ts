import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useOverlayContextMenu } from './useOverlayContextMenu';
import type { OverlayScene } from './types';

const SCENE: OverlayScene = {
  layers: [
    {
      anchor: 'top-left',
      height: 100,
      id: 'back',
      kind: 'image',
      name: 'back.png',
      offsetX: 20,
      offsetY: 30,
      rotationDeg: 0,
      width: 120,
    },
    { kind: 'bookmarks' },
    {
      anchor: 'top-left',
      height: 100,
      id: 'front',
      kind: 'image',
      name: 'front.png',
      offsetX: 20,
      offsetY: 30,
      rotationDeg: 0,
      width: 120,
    },
  ],
};

describe('useOverlayContextMenu', () => {
  it('emits the reverse-z target and prevents only its context menu', () => {
    const onTarget = vi.fn();
    renderHook(() => useOverlayContextMenu({ onTarget, scene: SCENE }));
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 40,
      clientY: 50,
    });

    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(onTarget).toHaveBeenCalledWith({
      clientX: 40,
      clientY: 50,
      imageId: 'front',
    });
  });

  it('does not intercept left clicks or context menus outside media', () => {
    const onTarget = vi.fn();
    renderHook(() => useOverlayContextMenu({ onTarget, scene: SCENE }));
    const leftClick = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: 40,
      clientY: 50,
    });
    const outsideContextMenu = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 500,
      clientY: 500,
    });

    document.dispatchEvent(leftClick);
    document.dispatchEvent(outsideContextMenu);

    expect(leftClick.defaultPrevented).toBe(false);
    expect(outsideContextMenu.defaultPrevented).toBe(false);
    expect(onTarget).not.toHaveBeenCalled();
  });

  it('does not intercept context menus while the document listener is disabled', () => {
    const onTarget = vi.fn();
    renderHook(() =>
      useOverlayContextMenu({ isEnabled: false, onTarget, scene: SCENE }),
    );
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 40,
      clientY: 50,
    });

    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(onTarget).not.toHaveBeenCalled();
  });

  it('does not hit-test images through an open dialog', () => {
    const onTarget = vi.fn();
    renderHook(() => useOverlayContextMenu({ onTarget, scene: SCENE }));
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const control = document.createElement('input');
    dialog.append(control);
    document.body.append(dialog);
    const event = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 40,
      clientY: 50,
    });

    control.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(onTarget).not.toHaveBeenCalled();
    dialog.remove();
  });
});
