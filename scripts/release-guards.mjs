export function assertReleaseBuildReady(environment) {
  if (environment.STARLIT_RELEASE_BUILD !== 'true') return;

  if (!environment.STARLIT_GOOGLE_OAUTH_CLIENT_ID_PRODUCTION?.trim()) {
    throw new Error(
      'STARLIT_GOOGLE_OAUTH_CLIENT_ID_PRODUCTION is required for a release build',
    );
  }

  if (environment.STARLIT_GOOGLE_OAUTH_VERIFIED !== 'true') {
    throw new Error(
      'Google OAuth verification must be confirmed before a release build',
    );
  }

  if (environment.STARLIT_STORE_PRIVACY_UPDATED !== 'true') {
    throw new Error(
      'Chrome Web Store privacy practices must be confirmed before a release build',
    );
  }
}
