<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/icon-dark.svg" />
  <img src=".github/assets/icon.svg" alt="Starlit" width="64" height="64" />
</picture>

# Starlit

Starlit is a standalone Manifest V3 Chrome new-tab extension that keeps bookmark exploration as the primary task. Version 2 adds local Scenes, Image, Clock, and Google Calendar widgets, a command palette, and a portable profile format without introducing a Starlit-operated backend.

Read this document to understand the product boundaries, storage model, development workflow, and release gates. User-data handling is documented in [PRIVACY.md](PRIVACY.md).

## Requirements

- Node.js 26 or newer
- pnpm 11.9.0
- Read access to the private `@fleetia/lagrange` package on GitHub Packages

The repository `.npmrc` only contains the registry mapping. Authenticate with a user-level npm token or provide `NODE_AUTH_TOKEN` in CI. Never commit a token to this repository.

```ini
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PACKAGES_TOKEN
```

## Development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The development server provides deterministic mock bookmarks outside Chrome. Production storage, bookmarks, identity, optional permissions, and Google Calendar requests use Chrome extension APIs.

## Starlit v2 workspace model

### Bookmark-first new tab

The new tab continues to center Chrome bookmarks. Scene and Settings controls stay in a quiet lower-right toolbar, while right-clicking empty canvas space opens the same Settings destinations as direct shortcuts. Image, Clock, and Google Calendar widgets participate in the canvas without replacing bookmark navigation as the primary interaction.

Settings preserves the original top-level order and appends the v2 sections:

- `General`: locale, font, bookmark opening behavior, guide, and reset.
- `Appearance`: theme, background, container, bookmark, and folder styles.
- `Widgets`: add and arrange Image, Google Calendar, or Clock widgets; configure position, layer order, motion, and Calendar connection.
- `Layout`: pagination, expansion, columns, spacing, margins, and icon direction.
- `CSS`: sanitized Custom CSS and its preview.
- `Bookmark groups`: the Scene bookmark folder, group visibility and order, and tab-group import.
- `Scene`: save, duplicate, apply, relink, restore, or remove a Scene.
- `Portable profile`: selective Scene, bookmark URL, and uploaded-media export and conflict-aware import.

Support remains a global banner above the tabs, as in the original Settings layout.

### Scenes

A Scene stores one coordinated snapshot of appearance and layout, the canvas widget order, Image widget media references, Clock and Google Calendar configuration, and a Chrome bookmark-folder reference. Locale, bookmark opening behavior, tutorial completion, permissions, and Google account connection remain global preferences and do not change when a Scene is applied.

Within Scene management, creation is the only flow that copies Chrome bookmarks. After showing URL and folder counts and receiving explicit confirmation, Starlit copies the selected folder under `Starlit Scenes/<Scene name>`. If `Other bookmarks` is unavailable, the caller must provide another writable parent. A failed copy compensates by removing only the nodes created by that attempt.

Scene switching changes settings and the root-folder reference; it does not recreate, move, merge, or overwrite the Chrome bookmark tree. Deleting a Scene keeps its Chrome folder by default. Local media referenced only by that Scene is removed after the Scene deletion commits, while media still referenced by another Scene is retained.

Existing profiles are not converted into an active Scene automatically. They keep their current v1.5.1-compatible setup with `activeSceneId: null`, and Starlit does not write Chrome bookmarks until the user confirms the first “Save current setup as Scene” flow.

If a referenced bookmark folder or local asset is missing, the Scene is not applied. The readiness result offers `Relink` and, when a recovery snapshot can satisfy every missing resource, `Restore`.

### Image widgets and motion

The persisted compatibility type remains `OverlayScene`, but product copy calls uploaded canvas layers “Image widgets” and calls anchors “screen-relative positions.” The canvas contains exactly one bookmark layer; Image, Clock, and Google Calendar widgets can be ordered on either side of it.

Choose `Add widget`, then `Image`, to select static images, GIFs, or browser-playable videos. Static images are converted to WebP and must fit within a 1920-pixel longest edge. GIFs are converted to WebM and are limited to 300 frames, 30 seconds, and the same dimension boundary. Playable videos keep their original Blob and must also fit that boundary. Every input and processed output is limited to 20 MiB; unsupported, invalid, oversized, decode-failed, or encode-failed media is rejected before save.

Background file uploads use the same processor, output formats, and validation limits. URL backgrounds remain URL settings and are requested directly from their provider instead of being copied into IndexedDB.

Motion Image widgets support `0.5×`, `1×`, `1.5×`, and `2×` playback. `active-tab-only` is the default stored playback mode, but a hidden document always pauses motion, including items configured as `always`. Reduced-motion users begin paused and can explicitly play or pause motion for the current session. Background video and Image widget motion share the same visibility and reduced-motion policy.

Normal left clicks pass through Image widgets to bookmarks. A document-level rotated-polygon hit test still opens the Image widget action menu on right-click. The position editor supports lock/hide, grouping, multi-selection, marquee selection, and six-pixel snapping to the viewport and other image boundaries, with `Alt` temporarily disabling snap.

### Clock and Google Calendar widgets

Starlit owns a closed built-in registry with `clock` and `google-calendar`; there is no public plugin API or marketplace. Choose `Add widget`, then `Clock` or `Google Calendar`, to add one instance of each type to a Scene. These widgets participate in the canvas layer order and receive pointer events only inside their own frames.

Clock requires no permission and supports locale, 12-hour, and 24-hour formats. Google Calendar is read-only and begins OAuth only after the user chooses Connect from the explanatory Settings UI. It never prompts on first run.

Calendar access uses `chrome.identity`, optional host access to `https://www.googleapis.com/*`, and only these scopes:

- `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
- `https://www.googleapis.com/auth/calendar.events.readonly`

The background service worker owns `calendar.connect`, `calendar.disconnect`, `calendar.listCalendars`, and `calendar.listEvents`; React code does not receive an access token. Starlit reads selected calendars in parallel with concurrency four, merges the next seven days by start time, and returns at most 50 events. It retains only summary, start/end, all-day status, calendar color, and `htmlLink`; descriptions and attendees are discarded during parsing.

One calendar failure does not discard successful results from the others. A `401` removes the cached token and performs one non-interactive retry; it never turns a background refresh into an interactive authorization prompt.

Selected calendar IDs and the most recently loaded calendar-list metadata are device-local in `chrome.storage.local`. The versioned `googleCalendar.calendarList.v1` record keeps only each calendar's ID, name, color, and primary status; it never contains tokens or events. Event results are cached in `chrome.storage.session` and reused for at most five minutes, while access tokens remain in Chrome Identity's cache. Disconnect and Reset all remove both local Calendar records. Calendar authorization, selected calendar IDs, calendar-list metadata, and cached events are excluded from Scene and portable-profile exports.

### Command palette

Press `Cmd+K` on macOS or `Ctrl+K` on other platforms while the new-tab page is focused. The page-level palette does not register a Chrome manifest command.

The palette searches current-Scene bookmarks first, then all Chrome bookmarks, groups/folders, Scenes, and Settings destinations. Ranking is deterministic: title prefix, domain prefix, path substring, then title substring as a fallback. Activating a result opens a bookmark, navigates to a group, previews and applies a Scene, or opens the exact Settings section. Bookmark editing and movement are outside the palette's scope.

### Portable Profile V4

`PortableProfileV4` is the transport contract for moving local configuration between Chrome profiles or extension IDs. Export controls are separate, while bookmark URLs and media require the Scene category:

- Scene, appearance, layout, and widget state: included by default.
- Chrome bookmark URLs: excluded by default.
- Uploaded media: excluded by default.

When bookmark URLs are excluded, the profile also omits device-bound folder identities used by group visibility and sibling order. A new or copied Scene therefore requires `Relink`, and those content preferences cannot be restored. `Replace Scene` keeps the destination Scene's existing bookmark collection. Include bookmark URLs when the folder structure and its group presentation must round-trip. Custom favicon overrides are not part of Portable Profile V4.

Locale and bookmark opening behavior are carried as global preferences. Tutorial state, permissions, Google authorization, selected calendar IDs, calendar-list metadata, and cached events are always excluded. Enabling bookmark URLs or media shows a sensitive-data warning because the JSON can contain private URLs or embedded file data.

Global locale and bookmark-opening behavior remain in the export even when the Scene category is disabled; the export UI states this explicitly.

Import always shows aggregate counts and a per-Scene diff before applying. Every Scene ID conflict requires `Add as copy`, `Replace Scene`, or `Skip`. Included bookmark URLs are created in a new dedicated folder before Scene references change; an existing folder is never overwritten in place. Prepared folders and assets are compensated if the transaction fails.

`Skip` applies only to that Scene. Skipped Scenes remain unchanged, while the profile's global locale and bookmark-opening preference are still imported.

“Local” means Starlit has no developer-controlled backend. It does not mean the extension never uses the network: Google Calendar is requested directly from Google after explicit OAuth, favicon domains may be sent to Google's favicon service, fonts may load from Google Fonts, and user-provided URLs are requested from their providers.

Version 2 does not include Iserlohn or another Starlit cloud-sync service, Calendar write access, a public plugin marketplace, or analytics. Portable Profile V4 is the local transport and conflict contract; any later remote-sync work must reuse or deliberately version that contract.

## Chrome tab groups

Starlit can copy an open Chrome tab group into a new Chrome bookmark folder. Chrome does not expose closed Saved Tab Groups through the extension API, so a saved group must be opened in Chrome before it can be imported. The import is a one-time copy rather than a live synchronization.

Clicking the current bookmark-folder title opens that folder's direct bookmarks in a new native tab group with the same title. The group is live; save it from Chrome's own tab-group UI if it should persist. Starlit never merges it into an existing group with the same title.

The optional `tabGroups` permission is retained after the first grant so these actions remain available and can be disconnected from Settings. The optional `tabs` permission is requested only while an explicit import reads the open tabs' titles and URLs, then removed when the import finishes or is cancelled. Open-group snapshots stay in the current page's memory and are neither stored by Starlit nor sent to a developer-controlled server.

The packaged `guide.html` page documents bookmarks, Scenes, tab groups, layout, appearance, Image, Clock, and Google Calendar widgets, the command palette, Portable Profile V4, permissions, and troubleshooting in English, Korean, and Japanese.

## Fonts and visual-test baseline

IBM Plex Sans is the default application font. The font setting also provides a System option for users who prefer their operating system's UI font. The language-specific web-font stylesheets are:

- Latin: [IBM Plex Sans](https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,100..700;1,100..700&display=swap)
- Korean: [IBM Plex Sans KR](https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@100;200;300;400;500;600;700&display=swap)
- Japanese: [IBM Plex Sans JP](https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@100;200;300;400;500;600;700&display=swap)

Visual tests do not depend on an operating-system font installation. The test harness pins the Latin Roman and Italic WOFF2 files from `@ibm/plex-sans-variable@0.2.0` and serves them locally instead of contacting Google. Create reference screenshots with the same pinned operating system and browser used by CI. If CI moves to Linux, regenerate the complete reference set in that pinned Linux environment. Official device-install archives are available for [IBM Plex Sans variable 0.2.0](https://github.com/IBM/plex/releases/download/%40ibm/plex-sans-variable%400.2.0/plex-sans-variable.zip), [IBM Plex Sans KR 1.1.0](https://github.com/IBM/plex/releases/download/%40ibm/plex-sans-kr%401.1.0/ibm-plex-sans-kr.zip), and [IBM Plex Sans JP 3.0.0](https://github.com/IBM/plex/releases/download/%40ibm/plex-sans-jp%403.0.0/ibm-plex-sans-jp.zip).

Install the required files according to the [Ubuntu font guide](https://help.ubuntu.com/community/Fonts), and record the release and archive checksum used by the baseline. A typical per-user installation is:

```bash
mkdir -p "$HOME/.local/share/fonts/ibm-plex"
find /path/to/extracted/archive -type f -name '*.ttf' \
  -exec cp {} "$HOME/.local/share/fonts/ibm-plex/" \;
fc-cache -f
fc-match "IBM Plex Sans"
```

Wait for `document.fonts.ready` before taking each screenshot. Installing the same font file on macOS does not create a Linux pixel baseline because browser and operating-system text rasterization can still differ. The System option is therefore not used to generate reference screenshots. The distributed extension includes IBM's complete OFL 1.1 text at [`assets/licenses/IBM-Plex-OFL-1.1.txt`](assets/licenses/IBM-Plex-OFL-1.1.txt).

## Release gates

Google OAuth verification and the matching Chrome Web Store privacy-practices update are release blockers for v2. They are not complete merely because the code, manifest scopes, or this privacy document exist. Do not publish `v2.0.0` until both external reviews are confirmed.

Development and production OAuth clients must use their respective extension IDs. Configure a development build with:

```bash
STARLIT_GOOGLE_OAUTH_CLIENT_ID_DEVELOPMENT=... pnpm build
```

Without the development value, local builds use a non-production placeholder so build and E2E verification remain deterministic; Google Calendar connection is not expected to succeed with that placeholder.

A release build requires all of the following:

```bash
STARLIT_RELEASE_BUILD=true
STARLIT_GOOGLE_OAUTH_CLIENT_ID_PRODUCTION=...
STARLIT_GOOGLE_OAUTH_VERIFIED=true
STARLIT_STORE_PRIVACY_UPDATED=true
```

`scripts/prepare-extension.mjs` fails a release build when the production client, explicit OAuth verification confirmation, or Store privacy-practices confirmation is missing. The confirmation environment variables record already completed external work; they are not mechanisms for bypassing either review.

### Chrome Web Store release checklist

The GitHub release workflow creates a reproducible archive and checksum. It does not publish the extension to the Chrome Web Store. Complete this checklist before manually publishing the single `v2.0.0` Store release:

1. Confirm Google OAuth verification approval and retain the approval evidence.
2. Update Chrome Web Store privacy practices, permission justifications, and listing copy to match `PRIVACY.md` and the packaged guide.
   Use the five 1280×800 v2 listing images in `assets/store/screenshot-*.png`; regenerate them from the corresponding Playwright goldens if the UI changes.
   After approval, update the guide and privacy copy that currently identifies OAuth and Store review as pending; do not publish a build containing stale review-status text.
3. Confirm that the production OAuth client is registered for the exact Chrome Web Store extension ID, then configure the three release secrets shown above.
4. Run `pnpm check` with the release environment, push the final `main` commit, and confirm that local `HEAD` equals `origin/main` before creating the `v2.0.0` tag. The workflow rejects a tag that does not point to the current `origin/main` commit.
5. Upload the generated archive to a tester or staged Store release. In Stable Chrome, use a clean profile with the extension installed under the production Store ID and verify:
   - first run does not start OAuth or request Google API host access;
   - OAuth allow, deny, disconnect, and reconnect paths;
   - offline startup and Calendar cached, empty, partial-failure, and error states;
   - reduced-motion on and off for Image widget motion and background video;
   - Scene switching and Portable Profile import do not change Calendar authorization.
6. Publish publicly only after the Store-ID smoke test passes and the listing screenshots and privacy disclosure match the tested build.

## Verification

```bash
pnpm check
```

The check runs Oxlint, Oxfmt, TypeScript, unit and component tests, a production build, and Playwright tests against the built extension. Individual commands are also available:

```bash
pnpm test
pnpm build
pnpm test:extension
```

`pnpm build` creates and validates `dist/`. Load that directory from `chrome://extensions` with Developer mode enabled. The post-build validator checks Manifest V3 entry points, required permissions, Calendar scopes and host access, packaged assets, and version consistency.

## Source ownership

- `src/platform`: Chrome storage and bookmark adapters plus IndexedDB records and transaction coordination.
- `src/scenes`: versioned Scene/canvas contracts, migration, conflict planning, readiness, bookmark copying, and runtime APIs.
- `src/widgets`: the built-in widget registry, canvas renderer, Clock, and Calendar widget controller.
- `src/calendar`: read-only Google Calendar gateway, message contracts, parsers, selection storage, and five-minute session cache.
- `src/commandPalette`: palette result types, deterministic ranking, and the Lagrange dialog/combobox UI.
- `src/guide`: the packaged localized user guide entry point and content.
- `src/tutorial`: first-install tutorial state and modal.
- `src/bookmarks`: bookmark normalization, ordering, navigation, pagination, and bookmark tiles.
- `src/settings`: settings drafts, Portable Profile V4, save/discard behavior, and Settings sections.
- `src/layout`: grid geometry, placement, and expanded-view behavior.
- `src/overlays`: Image widget media compatibility model, actions, geometry, motion policy, rendering, and position editing.
- `src/theme`: persisted Starlit theme mapping to Lagrange CSS variables.
- `src/i18n`: Korean, English, and Japanese dictionaries and provider.
- `src/app`: application composition and the new-tab entry point.

Application imports use relative module resolution. The app imports `@fleetia/lagrange/styles.css` once at the application entry point and consumes the published `@fleetia/lagrange@0.1.1` package.

## Stored data and migration

Storage schema version 3 separates device-local Scene state from global preferences. Scene records and shared assets live in additive IndexedDB stores, while the active appearance, layout, bookmark root, Custom CSS, and compatibility projection live in `chrome.storage.local`. Normal v2 writes to `chrome.storage.sync` contain only locale, default bookmark-opening behavior, and schema metadata; v2 never adds complete Scene records, URLs, CSS, or media payloads to Sync. Upgraded v1 profiles retain their already-synchronized legacy Scene keys plus `legacySceneSettingsV1` so every Chrome device can migrate independently and rollback remains possible.

Migration does not write Sync preference defaults while a fresh device's Sync area is still empty; it writes only the schema marker. It records a guarded local baseline and listens for retained v1 keys through `storage.onChanged`, so an offline install or incrementally hydrated second device can still import them. Automatic Chrome-bookmark cache refreshes and the bundled Image widget do not cancel that wait; existing local keys remain protected. Once the user changes the local v2 profile, or runs Reset all, late legacy hydration is dismissed instead of overwriting current work.

Local data, media, and the hydration baseline are made durable before synchronized migration data and `storageSchemaVersion: 3`; `deviceStorageSchemaVersion: 3` is the final write. An interrupted migration can therefore run again. The multi-device tests cover two independent local stores, incremental late hydration, offline-first empty Sync, protected local values, and post-edit dismissal. Existing bookmark ordering and visibility, locale, media, favicon overrides, Custom CSS, and user-modified visual values are retained. Existing profiles remain outside Scene mode until the user explicitly creates the first Scene.

Portable exports use `schemaVersion: 4`. Import decodes unversioned, V2, and V3 backups, converts each legacy setup into one imported Scene, and then uses the same V4 conflict preview. Future or malformed schema versions are rejected.

Scene apply preloads resources, snapshots the small synchronized preference set, device-local state, and active media, writes replacement state through a transaction coordinator, and records `activeSceneId` last. Shared-asset writes and Chrome bookmark copies use compensation for resources created by the failed attempt.

Custom CSS is sanitized and applied after Lagrange styles and Starlit composition styles. Stable extension-owned selectors use `[data-starlit-part="..."]`. Prefix public hooks with `#root` when overriding class-based composition styles:

```css
#root [data-starlit-part='bookmark-tile'][data-kind='folder'] {
  border-style: solid;
}

#root [data-starlit-part^='bookmark-tile'] {
  /* Matches bookmark-tile and its icon, favicon, marker, and label parts. */
}
```

Public main-view parts include `root`, `main`, `background-media`, `overlay-images-below`, `overlay-images-above`, `overlay-image`, `overlay-motion`, `widget-clock`, `widget-google-calendar`, `command-palette`, `paged-groups`, `expanded-groups`, `group-rail`, `group-navigation`, `settings-trigger`, `bookmark-group`, `bookmark-group-header`, `bookmark-breadcrumb`, `bookmark-route`, `bookmark-grid`, `bookmark-tile`, the `bookmark-tile-*` subparts, `pagination`, `pagination-control`, and `pagination-status`. Use `data-kind`, `data-layout`, and `data-direction` to narrow state. Legacy `--c-*` and layout variables remain as compatibility aliases for existing profiles.
