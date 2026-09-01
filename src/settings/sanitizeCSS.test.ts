import { describe, expect, it } from 'vitest';

import { sanitizeCSS } from './sanitizeCSS';

describe('sanitizeCSS', () => {
  it('keeps stable Starlit selectors, declarations, and embedded raster assets', () => {
    const css = sanitizeCSS(
      '[data-starlit-part="bookmark-tile"] { color: #fff; background: url("data:image/png;base64,AAAA"); }',
    );

    expect(css).toContain('[data-starlit-part="bookmark-tile"]');
    expect(css).toContain('color: #fff');
    expect(css).toContain('data:image/png;base64,AAAA');
  });

  it.each([
    '@import url(https://example.com/evil.css);',
    '@\\69mport "https://example.com/escaped.css";',
    '@im/**/port "https://example.com/commented.css";',
    'a { content: "\n} @import "https://example.com/after-bad-string.css";',
    'a { background: url(javascript:alert(1)); }',
    'a { background: u\\72l("https://example.com/tracker.png"); }',
    'a { background: u/**/rl(//example.com/tracker.png); }',
    'a { background: image-set("https://example.com/a.png" 1x); }',
    'a { background: -webkit-image-set("/relative.png" 1x); }',
    'a { mask: src("https://example.com/mask.svg"); }',
    'a { width: expression(alert(1)); }',
    '</style><script>alert(1)</script>',
    'a { behavior: url(evil.htc); }',
  ])('removes unsafe CSS: %s', (unsafeCSS) => {
    const css = sanitizeCSS(unsafeCSS);

    expect(css).not.toMatch(
      /@import|example\.com|relative\.png|javascript|expression|<|>|behavior/iu,
    );
  });

  it('does not treat resource-like text inside a string as a request', () => {
    const css = sanitizeCSS(
      '.bookmark::after { content: "url(https://example.com/not-a-request)"; }',
    );

    expect(css).toContain('content: "url(https://example.com/not-a-request)"');
  });
});
