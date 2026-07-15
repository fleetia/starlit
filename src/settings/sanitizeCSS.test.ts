import { describe, expect, it } from 'vitest';

import { sanitizeCSS } from './sanitizeCSS';

describe('sanitizeCSS', () => {
  it('keeps stable Starlit selectors and safe HTTPS assets', () => {
    const css = sanitizeCSS(
      '[data-starlit-part="bookmark-tile"] { background: url("https://example.com/paper.png"); }',
    );

    expect(css).toContain('[data-starlit-part="bookmark-tile"]');
    expect(css).toContain('https://example.com/paper.png');
  });

  it.each([
    '@import url(https://example.com/evil.css);',
    'a { background: url(javascript:alert(1)); }',
    'a { width: expression(alert(1)); }',
    '</style><script>alert(1)</script>',
    'a { behavior: url(evil.htc); }',
  ])('removes unsafe CSS: %s', (unsafeCSS) => {
    const css = sanitizeCSS(unsafeCSS);

    expect(css).not.toMatch(/@import|javascript|expression|<|>|behavior/iu);
  });
});
