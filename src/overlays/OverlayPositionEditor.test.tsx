import { useState, type ReactElement } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../i18n';
import { getOverlayImageStyle } from './geometry';
import { OverlayPositionEditor } from './OverlayPositionEditor';
import type { OverlayImageLayer, OverlayScene } from './types';

const FIRST_IMAGE: OverlayImageLayer = {
  anchor: 'top-left',
  height: 80,
  id: 'first',
  kind: 'image',
  name: 'first.png',
  offsetX: 20,
  offsetY: 30,
  rotationDeg: 0,
  width: 120,
};

const SECOND_IMAGE: OverlayImageLayer = {
  ...FIRST_IMAGE,
  id: 'second',
  name: 'second.png',
  offsetX: 40,
  offsetY: 50,
};

const SCENE: OverlayScene = {
  layers: [FIRST_IMAGE, { kind: 'bookmarks' }, SECOND_IMAGE],
};

type EditorHarnessProps = {
  initialScene?: OverlayScene;
  onChange?: (scene: OverlayScene) => void;
  onClose: () => void;
};

function EditorHarness({
  initialScene = SCENE,
  onChange,
  onClose,
}: EditorHarnessProps): ReactElement {
  const [scene, setScene] = useState(initialScene);

  return (
    <I18nProvider locale="en">
      <OverlayPositionEditor
        onChange={(nextScene) => {
          setScene(nextScene);
          onChange?.(nextScene);
        }}
        onClose={onClose}
        scene={scene}
      />
    </I18nProvider>
  );
}

function PreviewEditorHarness({
  onChange,
  onClose,
}: {
  onChange: (scene: OverlayScene) => void;
  onClose: () => void;
}): ReactElement {
  const [scene, setScene] = useState(SCENE);
  const [isOpen, setIsOpen] = useState(true);

  return (
    <I18nProvider locale="en">
      <img
        alt=""
        data-overlay-image-id={FIRST_IMAGE.id}
        src="blob:first"
        style={getOverlayImageStyle(FIRST_IMAGE)}
      />
      {isOpen ? (
        <OverlayPositionEditor
          onChange={(nextScene) => {
            setScene(nextScene);
            onChange(nextScene);
          }}
          onClose={() => {
            setIsOpen(false);
            onClose();
          }}
          scene={scene}
        />
      ) : null}
    </I18nProvider>
  );
}

function getImage(scene: OverlayScene, id: string): OverlayImageLayer {
  const image = scene.layers.find(
    (layer): layer is OverlayImageLayer =>
      layer.kind === 'image' && layer.id === id,
  );
  if (!image) {
    throw new Error(`Missing test image: ${id}`);
  }

  return image;
}

describe('OverlayPositionEditor', () => {
  it('selects and edits images with accessible controls', async () => {
    const onChange = vi.fn<(scene: OverlayScene) => void>();
    const onClose = vi.fn();
    render(<EditorHarness onChange={onChange} onClose={onClose} />);

    expect(
      screen.getByRole('dialog', { name: 'Edit overlay positions' }),
    ).toBeDefined();
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Back to settings' }),
      );
    });
    const imageSelect = screen.getByLabelText('Image');
    fireEvent.change(imageSelect, { target: { value: 'second' } });

    const secondTarget = screen.getByRole('button', {
      name: 'Image: second.png',
    });
    expect(secondTarget.getAttribute('aria-pressed')).toBe('true');

    fireEvent.keyDown(secondTarget, { key: 'ArrowRight', shiftKey: true });
    let changedScene = onChange.mock.calls.at(-1)?.[0];
    expect(changedScene && getImage(changedScene, 'second').offsetX).toBe(50);

    const rotationControl = screen.getByLabelText('Rotation');
    const zoomControl = screen.getByLabelText('Zoom');
    expect(
      rotationControl.compareDocumentPosition(zoomControl) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    fireEvent.change(rotationControl, {
      target: { value: '45' },
    });
    changedScene = onChange.mock.calls.at(-1)?.[0];
    expect(changedScene && getImage(changedScene, 'second').rotationDeg).toBe(
      45,
    );

    fireEvent.change(zoomControl, {
      target: { value: '150' },
    });
    changedScene = onChange.mock.calls.at(-1)?.[0];
    expect(changedScene && getImage(changedScene, 'second').scale).toBe(1.5);
    expect(screen.getByText('150%')).toBeDefined();

    expect(screen.getAllByRole('radio')).toHaveLength(9);
    fireEvent.click(screen.getByRole('radio', { name: 'Center' }));
    changedScene = onChange.mock.calls.at(-1)?.[0];
    expect(changedScene && getImage(changedScene, 'second').anchor).toBe(
      'center-center',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset position' }));
    changedScene = onChange.mock.calls.at(-1)?.[0];
    expect(changedScene && getImage(changedScene, 'second')).toMatchObject({
      offsetX: 24,
      offsetY: 24,
      rotationDeg: 0,
      scale: 1,
    });
  });

  it('cycles focus within the modal and skips disabled or hidden controls', async () => {
    render(<EditorHarness onClose={() => undefined} />);
    const dialog = screen.getByRole('dialog', {
      name: 'Edit overlay positions',
    });
    const firstControl = screen.getByRole('button', {
      name: 'Image: first.png',
    });
    const lastControl = screen.getByRole('button', {
      name: 'Reset position',
    });
    const disabledControl = document.createElement('button');
    disabledControl.disabled = true;
    disabledControl.textContent = 'Disabled control';
    const hiddenControl = document.createElement('button');
    hiddenControl.hidden = true;
    hiddenControl.textContent = 'Hidden control';
    dialog.append(disabledControl, hiddenControl);

    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Back to settings' }),
      );
    });

    lastControl.focus();
    fireEvent.keyDown(lastControl, { key: 'Tab' });
    expect(document.activeElement).toBe(firstControl);

    firstControl.focus();
    fireEvent.keyDown(firstControl, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastControl);
  });

  it('moves an image with a captured pointer drag', () => {
    const onChange = vi.fn<(scene: OverlayScene) => void>();
    render(<EditorHarness onChange={onChange} onClose={() => undefined} />);
    const target = screen.getByRole('button', { name: 'Image: first.png' });

    fireEvent.pointerDown(target, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 7,
    });
    fireEvent.pointerMove(target, {
      clientX: 112,
      clientY: 91,
      pointerId: 7,
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(target.style.left).toBe('32px');
    expect(target.style.top).toBe('21px');
    fireEvent.pointerUp(target, { pointerId: 7 });

    const changedScene = onChange.mock.calls.at(-1)?.[0];
    expect(changedScene && getImage(changedScene, 'first')).toMatchObject({
      offsetX: 32,
      offsetY: 21,
    });
  });

  it('restores an active drag preview before Escape closes the editor', () => {
    const onChange = vi.fn<(scene: OverlayScene) => void>();
    const onClose = vi.fn();
    const { container } = render(
      <PreviewEditorHarness onChange={onChange} onClose={onClose} />,
    );
    const target = screen.getByRole('button', { name: 'Image: first.png' });
    const preview = container.querySelector<HTMLImageElement>('img');

    if (!preview) {
      throw new Error('Expected the rendered overlay preview.');
    }

    fireEvent.pointerDown(target, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 7,
    });
    fireEvent.pointerMove(target, {
      clientX: 112,
      clientY: 91,
      pointerId: 7,
    });
    expect(preview.style.left).toBe('32px');
    expect(preview.style.top).toBe('21px');

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(preview.style.left).toBe('20px');
    expect(preview.style.top).toBe('30px');
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('restores rather than commits a canceled pointer drag', () => {
    const onChange = vi.fn<(scene: OverlayScene) => void>();
    const { container } = render(
      <PreviewEditorHarness onChange={onChange} onClose={() => undefined} />,
    );
    const target = screen.getByRole('button', { name: 'Image: first.png' });
    const preview = container.querySelector<HTMLImageElement>('img');

    if (!preview) {
      throw new Error('Expected the rendered overlay preview.');
    }

    fireEvent.pointerDown(target, {
      button: 0,
      clientX: 100,
      clientY: 100,
      pointerId: 7,
    });
    fireEvent.pointerMove(target, {
      clientX: 112,
      clientY: 91,
      pointerId: 7,
    });
    fireEvent.pointerCancel(target, { pointerId: 7 });

    expect(target.style.left).toBe('20px');
    expect(target.style.top).toBe('30px');
    expect(preview.style.left).toBe('20px');
    expect(preview.style.top).toBe('30px');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the selected image target above overlapping image targets', () => {
    render(
      <EditorHarness
        initialScene={{
          layers: [
            FIRST_IMAGE,
            { kind: 'bookmarks' },
            {
              ...SECOND_IMAGE,
              offsetX: FIRST_IMAGE.offsetX,
              offsetY: FIRST_IMAGE.offsetY,
            },
          ],
        }}
        onClose={() => undefined}
      />,
    );
    const firstTarget = screen.getByRole('button', {
      name: 'Image: first.png',
    });
    const secondTarget = screen.getByRole('button', {
      name: 'Image: second.png',
    });

    expect(Number(firstTarget.style.zIndex)).toBeGreaterThan(
      Number(secondTarget.style.zIndex),
    );

    fireEvent.change(screen.getByLabelText('Image'), {
      target: { value: 'second' },
    });

    expect(Number(secondTarget.style.zIndex)).toBeGreaterThan(
      Number(firstTarget.style.zIndex),
    );
  });

  it('moves the toolbar within the viewport to uncover an image', () => {
    const { container } = render(<EditorHarness onClose={() => undefined} />);
    const toolbar = container.querySelector<HTMLElement>('aside');
    const moveToolbar = screen.getByRole('button', { name: 'Move toolbar' });

    if (!toolbar) {
      throw new Error('Expected the position editor toolbar.');
    }

    toolbar.getBoundingClientRect = () => {
      const left = Number.parseFloat(toolbar.style.left);
      const top = Number.parseFloat(toolbar.style.top);

      return DOMRect.fromRect({
        height: 240,
        x: Number.isFinite(left) ? left : 100,
        y: Number.isFinite(top) ? top : 50,
        width: 320,
      });
    };

    fireEvent.pointerDown(moveToolbar, {
      button: 0,
      clientX: 110,
      clientY: 60,
      pointerId: 8,
    });
    fireEvent.pointerMove(moveToolbar, {
      clientX: 140,
      clientY: 100,
      pointerId: 8,
    });
    fireEvent.pointerUp(moveToolbar, { pointerId: 8 });

    expect(toolbar.style.left).toBe('130px');
    expect(toolbar.style.top).toBe('90px');
    expect(toolbar.style.right).toBe('auto');
    expect(toolbar.style.bottom).toBe('auto');

    const originalWidth = window.innerWidth;
    const originalHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 400,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 300,
    });
    fireEvent(window, new Event('resize'));
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalHeight,
    });

    expect(toolbar.style.left).toBe('80px');
    expect(toolbar.style.top).toBe('60px');

    fireEvent.keyDown(moveToolbar, { key: 'ArrowLeft', shiftKey: true });
    expect(toolbar.style.left).toBe('70px');
    expect(toolbar.style.top).toBe('60px');
  });

  it('closes on Escape and supports bookmark-only scenes', () => {
    const onClose = vi.fn();
    render(
      <EditorHarness
        initialScene={{ layers: [{ kind: 'bookmarks' }] }}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Add an image before editing positions.')).toBe(
      screen.getByText('Add an image before editing positions.'),
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
