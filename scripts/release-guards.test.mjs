import { describe, expect, it } from 'vitest';

import { assertReleaseBuildReady } from './release-guards.mjs';

describe('assertReleaseBuildReady', () => {
  it('requires the Store privacy acknowledgement for release builds', () => {
    expect(() =>
      assertReleaseBuildReady({ STARLIT_RELEASE_BUILD: 'true' }),
    ).toThrow(
      'Chrome Web Store privacy practices must be confirmed before a release build',
    );
  });

  it('accepts a complete release configuration', () => {
    expect(() =>
      assertReleaseBuildReady({
        STARLIT_RELEASE_BUILD: 'true',
        STARLIT_STORE_PRIVACY_UPDATED: 'true',
      }),
    ).not.toThrow();
  });

  it('does not gate regular development builds', () => {
    expect(() => assertReleaseBuildReady({})).not.toThrow();
  });
});
