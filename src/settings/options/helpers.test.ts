import { describe, expect, it } from 'vitest';

import { getBorderColor, withBorderColor } from './helpers';

describe('bookmark card border colors', () => {
  it('preserves custom border width and style when changing its color', () => {
    expect(withBorderColor('2px dotted #4e595a', '#aabbcc80', '#202b36')).toBe(
      '2px dotted #aabbcc80',
    );
    expect(withBorderColor('0.2em solid #4e595a', '#112233', '#202b36')).toBe(
      '0.2em solid #112233',
    );
  });

  it('reads alpha colors regardless of the border shorthand order', () => {
    expect(getBorderColor('rgba(1, 2, 3, 0.5) double 3px', '#202b36')).toBe(
      'rgba(1, 2, 3, 0.5)',
    );
    expect(
      withBorderColor('rgba(1, 2, 3, 0.5) double 3px', '#112233', '#202b36'),
    ).toBe('3px double #112233');
  });

  it('resolves inherited border variables and removes its temporary element', () => {
    const root = document.createElement('div');
    root.dataset.starlitPart = 'root';
    root.style.setProperty('--card-border', '3px dashed #4e595a');
    document.body.append(root);

    try {
      expect(getBorderColor('var(--card-border)', '#202b36')).toBe('#4e595a');
      expect(
        withBorderColor('var(--card-border)', '#11223380', '#202b36'),
      ).toBe('3px dashed #11223380');
      expect(root.childElementCount).toBe(0);
    } finally {
      root.remove();
    }
  });
});
