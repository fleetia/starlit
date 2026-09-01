import { describe, expect, it } from 'vitest';

import { assertReleaseBuildReady } from './release-guards.mjs';

const PRODUCTION_CLIENT_ID = 'production.apps.googleusercontent.com';

const RELEASE_CASES = [
  {
    environment: {
      STARLIT_GOOGLE_OAUTH_VERIFIED: 'true',
      STARLIT_RELEASE_BUILD: 'true',
      STARLIT_STORE_PRIVACY_UPDATED: 'true',
    },
    error:
      'STARLIT_GOOGLE_OAUTH_CLIENT_ID_PRODUCTION is required for a release build',
    name: 'missing production client',
  },
  {
    environment: {
      STARLIT_GOOGLE_OAUTH_CLIENT_ID_PRODUCTION: PRODUCTION_CLIENT_ID,
      STARLIT_RELEASE_BUILD: 'true',
      STARLIT_STORE_PRIVACY_UPDATED: 'true',
    },
    error: 'Google OAuth verification must be confirmed before a release build',
    name: 'missing OAuth verification',
  },
  {
    environment: {
      STARLIT_GOOGLE_OAUTH_CLIENT_ID_PRODUCTION: PRODUCTION_CLIENT_ID,
      STARLIT_GOOGLE_OAUTH_VERIFIED: 'true',
      STARLIT_RELEASE_BUILD: 'true',
    },
    error:
      'Chrome Web Store privacy practices must be confirmed before a release build',
    name: 'missing Store privacy acknowledgement',
  },
  {
    environment: {
      STARLIT_GOOGLE_OAUTH_CLIENT_ID_PRODUCTION: PRODUCTION_CLIENT_ID,
      STARLIT_GOOGLE_OAUTH_VERIFIED: 'true',
      STARLIT_RELEASE_BUILD: 'true',
      STARLIT_STORE_PRIVACY_UPDATED: 'true',
    },
    error: null,
    name: 'complete release configuration',
  },
];

describe('assertReleaseBuildReady', () => {
  it.each(RELEASE_CASES)('$name', ({ environment, error }) => {
    if (error) {
      expect(() => assertReleaseBuildReady(environment)).toThrow(error);
      return;
    }

    expect(() => assertReleaseBuildReady(environment)).not.toThrow();
  });
});
