# Starlit

Starlit is a standalone Manifest V3 Chrome new-tab extension. It preserves the
existing bookmark and preference model while rendering the interface with the
Lagrange design system.

## Requirements

- Node.js 22.14 or newer
- pnpm 11.9.0
- Read access to the private `@fleetia/lagrange` package on GitHub Packages

The repository `.npmrc` only contains the registry mapping. Authenticate with a
user-level npm token or provide `NODE_AUTH_TOKEN` in CI. Never commit a token to
this repository.

```ini
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PACKAGES_TOKEN
```

## Development

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The development server provides deterministic mock bookmarks outside Chrome.
Production storage and bookmark access use the Chrome extension APIs.

## Fonts and visual-test baseline

IBM Plex Sans is the default application font. The font setting also provides a
System option for users who prefer their operating system's UI font. The
language-specific web-font stylesheets are:

- Latin: [IBM Plex Sans](https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:ital,wght@0,100..700;1,100..700&display=swap)
- Korean: [IBM Plex Sans KR](https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@100;200;300;400;500;600;700&display=swap)
- Japanese: [IBM Plex Sans JP](https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+JP:wght@100;200;300;400;500;600;700&display=swap)

Visual tests do not depend on an operating-system font installation. The test
harness pins the Latin Roman and Italic WOFF2 files from
`@ibm/plex-sans-variable@0.2.0` and serves them locally instead of contacting
Google. Create reference screenshots with the same pinned operating system and
browser used by CI. If CI moves to Linux, regenerate the complete reference set
in that pinned Linux environment. Official device-install archives are
available for
[IBM Plex Sans variable 0.2.0](https://github.com/IBM/plex/releases/download/%40ibm/plex-sans-variable%400.2.0/plex-sans-variable.zip),
[IBM Plex Sans KR 1.1.0](https://github.com/IBM/plex/releases/download/%40ibm/plex-sans-kr%401.1.0/ibm-plex-sans-kr.zip),
and
[IBM Plex Sans JP 3.0.0](https://github.com/IBM/plex/releases/download/%40ibm/plex-sans-jp%403.0.0/ibm-plex-sans-jp.zip).
Install the required files according to the
[Ubuntu font guide](https://help.ubuntu.com/community/Fonts), and record the
release and archive checksum used by the baseline. A typical per-user
installation is:

```bash
mkdir -p "$HOME/.local/share/fonts/ibm-plex"
find /path/to/extracted/archive -type f -name '*.ttf' \
  -exec cp {} "$HOME/.local/share/fonts/ibm-plex/" \;
fc-cache -f
fc-match "IBM Plex Sans"
```

Wait for `document.fonts.ready` before taking each screenshot. Installing the
same font file on macOS does not create a Linux pixel baseline because browser
and operating-system text rasterization can still differ. The System option is
therefore not used to generate reference screenshots. The distributed
extension includes IBM's complete OFL 1.1 text at
[`assets/licenses/IBM-Plex-OFL-1.1.txt`](assets/licenses/IBM-Plex-OFL-1.1.txt).

## Verification

```bash
pnpm check
```

The check runs ESLint, Prettier, TypeScript, unit and component tests, a
production build, and Playwright tests against the built extension. Individual
commands are also available:

```bash
pnpm test
pnpm build
pnpm test:extension
```

`pnpm build` creates and validates `dist/`. Load that directory from
`chrome://extensions` with Developer mode enabled. The post-build validator
checks the Manifest V3 entry points, required `storage` and `bookmarks`
permissions, asset references, and version consistency before the build can be
used.

## Source ownership

- `src/platform`: Chrome storage and bookmarks plus IndexedDB media adapters
- `src/bookmarks`: bookmark normalization, ordering, navigation, pagination,
  and bookmark tiles
- `src/settings`: settings drafts, save/discard behavior, and settings sections
- `src/layout`: grid geometry, placement, and expanded-view behavior
- `src/theme`: persisted Starlit theme mapping to Lagrange CSS variables
- `src/i18n`: Korean, English, and Japanese dictionaries and provider
- `src/app`: application composition and the new-tab entry point

Application imports use relative module resolution. The app imports
`@fleetia/lagrange/styles.css` once at the application entry point and consumes the
published `@fleetia/lagrange@0.1.0` package.

## Stored data and migration

Migration runs before React mounts. A successful V1 to V2 migration writes
`storageSchemaVersion: 2` last, so interrupted migrations can safely run again.
Behavior, bookmark ordering and visibility, locale, media, favicon overrides,
custom CSS, and user-modified visual values are retained. Only missing or
untouched legacy visual defaults adopt the Lagrange defaults.

The first V2 release keeps legacy keys and the legacy `lotuspad` IndexedDB media
store for recovery. Exported backups contain `schemaVersion: 2`; imports accept
both unversioned V1 and V2 data and restore storage and media snapshots when an
apply step fails.

Custom CSS is sanitized and applied after Lagrange styles and Starlit
composition styles. Stable extension-owned selectors use
`[data-starlit-part="..."]`. Prefix public hooks with `#root` when overriding
class-based composition styles:

```css
#root [data-starlit-part='bookmark-tile'][data-kind='folder'] {
  border-style: solid;
}

#root [data-starlit-part^='bookmark-tile'] {
  /* Matches bookmark-tile and its icon, favicon, marker, and label parts. */
}
```

Public main-view parts include `root`, `main`, `background-media`,
`paged-groups`, `expanded-groups`, `group-rail`, `group-navigation`,
`settings-trigger`, `bookmark-group`, `bookmark-group-header`,
`bookmark-breadcrumb`, `bookmark-route`, `bookmark-grid`, `bookmark-tile`, the
`bookmark-tile-*` subparts, `pagination`, `pagination-control`, and
`pagination-status`. Use `data-kind`, `data-layout`, and `data-direction` to
narrow state. Legacy `--c-*` and layout variables remain as compatibility
aliases for existing profiles.
