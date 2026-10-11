export function assertReleaseBuildReady(environment) {
  if (environment.STARLIT_RELEASE_BUILD !== 'true') return;

  if (environment.STARLIT_STORE_PRIVACY_UPDATED !== 'true') {
    throw new Error(
      'Chrome Web Store privacy practices must be confirmed before a release build',
    );
  }
}
