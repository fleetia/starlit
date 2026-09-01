# Privacy Policy for Starlit

Last updated: September 2, 2026

## Overview

Starlit is a Chrome extension that replaces the New Tab page with a customizable workspace built from the user's existing Chrome bookmarks. This policy explains what data Starlit accesses, how it is used, where it is stored, and when network requests occur.

Starlit does not operate a developer-controlled backend or data-collection server. It does not sell user data, use user data for advertising or credit decisions, run analytics, or provide the developer with access to a user's bookmarks, calendar, or locally selected files.

“Local” in this policy means there is no Starlit backend. It does not mean the extension never connects to another service. After the actions described below, the extension can request a user-provided Calendar feed directly from its provider, request favicon and font resources from Google, and load URLs chosen by the user.

## Release status

The v2 release that includes URL-subscribed Calendar widgets remains blocked until the Chrome Web Store privacy-practices disclosure and optional-host permission justification are updated to match this policy. The presence of Calendar code, this policy, or a release acknowledgement flag is not a claim that the external review is complete. Starlit v2 must not be published until that blocker is confirmed.

## Data Starlit Handles

### Chrome bookmarks and Scenes

With the `bookmarks` permission, Starlit reads bookmark folder structure, titles, and URLs to render groups, tiles, Scene previews, and command-palette results. A local cache may be stored in `chrome.storage.local` so the interface can load reliably.

A Scene stores a reference to its Chrome bookmark folder. Creating a Scene is the only Scene operation that copies bookmarks: Starlit first shows the folder and URL counts, then creates `Starlit Scenes/<Scene name>` only after explicit confirmation. A failed copy attempts to remove only the nodes created by that attempt. Switching Scenes changes the referenced root folder and does not recreate, move, merge, or overwrite bookmarks.

Deleting a Scene keeps its Chrome bookmark folder by default. Starlit removes that folder only after a separate explicit cleanup choice and only when another Scene does not still reference it. Existing profiles do not create a Scene folder until the user confirms “Save current setup as Scene.”

Outside Scene creation and portable-profile import, Starlit changes Chrome bookmarks only when the user explicitly confirms a bookmark deletion or a tab-group import. Hiding, reordering, or restyling a group does not modify the Chrome bookmark tree.

### Chrome tab groups and open tabs

The optional `tabGroups` permission lets Starlit list open Chrome tab groups and assign a bookmark-folder title to a new live tab group. It is granted only after a user action, remains available for repeat use, and can be disconnected from Settings. Chrome's extension API does not provide Starlit with closed Saved Tab Groups or control whether a live group is saved or synchronized.

The optional `tabs` permission lets an explicit import read the titles and URLs of tabs in selected open groups. Starlit requests it only for the import session and removes it when the import finishes or is cancelled. The open-group snapshot stays only in the current page's memory and is not written to Starlit storage or sent to a developer-controlled server.

Opening a bookmark folder as a live tab group uses bookmark URLs Starlit already has through the `bookmarks` permission. It does not use `tabs` access to inspect unrelated browsing activity. The resulting live group remains in Chrome until the user closes or saves it through Chrome's own UI.

### Settings, Scenes, and storage

With the `storage` permission, Starlit stores settings such as layout, group visibility and order, colors, typography, spacing, language, bookmark opening behavior, Custom CSS, background metadata, Image widget positions and layer order, Clock and Calendar widget configuration, custom favicons, and expanded or collapsed group state. A Calendar widget's subscription URL, including any private token in its path or query, is part of the device-local Scene record.

Scene records, appearance and layout settings, bookmark-folder references, Custom CSS, and shared media assets created by v2 are device-local and are not saved as new profile payloads in `chrome.storage.sync`. Normal v2 Sync writes contain only the selected locale, the default bookmark-opening behavior, and storage-version metadata. For an installation upgraded from v1, pre-existing synchronized Scene-setting keys and a copy of the former combined settings record can remain in Chrome Sync solely so another Chrome device can complete its local migration and so rollback remains possible. V2 does not add bookmark URLs or media Blobs to that legacy set. Google processes Chrome Sync data under Google's terms; the Starlit developer does not receive it.

Scene records and shared asset metadata are stored in extension-owned IndexedDB. Local caches, custom favicons, and the active Scene index are stored in `chrome.storage.local`. Existing media stores and legacy local or synchronized keys remain in place for migration and rollback compatibility. A fresh device may watch for retained v1 Sync keys that arrive after its initial offline or partially hydrated startup. It imports them only while the guarded local v2 baseline is unchanged; a local v2 profile change or Reset all dismisses that late-import path.

### Background and Image widget media

When the user selects a background image, GIF, background video, or Image widget media from the device, Starlit processes and stores the resulting file in the extension's IndexedDB. Static background and Image widget files are converted to WebP, GIFs are converted to WebM, and browser-playable videos retain their original Blob. Starlit may retain the selected file's name and media type as local asset metadata. Input and processed output are limited to 20 MiB and a 1920-pixel longest edge; GIFs are additionally limited to 300 frames and 30 seconds. Invalid, unsupported, oversized, decode-failed, or encode-failed files are rejected before save. These files are not uploaded to a developer-controlled server.

Background and Image widget media remain in browser-managed storage for the current extension profile unless the user explicitly embeds them in a Portable Profile V4 file.

When the user provides a background URL, Chrome requests that resource directly from its provider. That provider may receive ordinary request information such as the user's IP address and browser request metadata under the provider's privacy policy. Starlit removes Custom CSS `@import` rules and network-loading functions before applying the CSS. Only embedded raster `data:` URLs are retained in Custom CSS, so Custom CSS does not initiate external resource requests.

### Clock and Calendar widgets

Clock uses the device time, selected display format, and optional IANA time zone and requires no additional permission. It supports independent digital and analog instances.

Calendar is read-only. The user supplies an HTTPS or `webcal` iCalendar subscription URL. Starlit normalizes `webcal` to HTTPS and does not request host access on first run. It requests optional access only after the user chooses `Allow and subscribe` in Settings after seeing an explanation.

The manifest's `https://*/*` optional-host declaration is the set of HTTPS origins that Starlit may ask Chrome to grant at runtime. Starlit requests only the exact origin of the URL entered by the user. Granting one feed host does not grant every HTTPS host. The granted origin remains managed by Chrome until the user revokes it in Chrome's extension settings or uninstalls the extension; removing a widget or using Reset all does not revoke that browser permission.

The background service worker requests the feed directly from its provider with cookies and other credentials omitted, no referrer, a ten-second timeout, and a 2 MiB response limit. The provider still receives ordinary network information such as the user's IP address and the requested URL under the provider's privacy policy. A subscription URL can itself contain a secret token, so users should treat it as sensitive.

Starlit parses RFC 5545 iCalendar data locally, expands recurrences within a bounded work budget, requests events from now through the next seven days, and keeps at most 50 events. It retains only summary, start and end, all-day status, calendar color, and an HTTPS event link. Descriptions, attendees, and the raw feed body are discarded after parsing. Parsed events are cached in `chrome.storage.session` under an opaque URL-derived key and reused for at most five minutes.

Calendar feed URLs remain in their device-local Scene until the user clears the URL, removes the widget, replaces or deletes the Scene, resets Starlit, clears extension data, or uninstalls Starlit. Reset all clears Calendar session caches. Portable Profile V4 keeps Calendar widget layout and display settings but replaces each feed URL with `null`; cached event data and Chrome host permissions are never exported.

The selected Calendar provider processes feed requests under its own privacy terms. Starlit does not proxy those requests through a developer-controlled server.

### Command palette

The `Cmd+K` or `Ctrl+K` command palette searches bookmark titles, URLs, folder paths, Scene names, and Settings destinations already available to the extension. Queries remain in current page memory and are not stored or sent to a developer-controlled server.

### Portable Profile V4

Portable Profile V4 includes Scene names and timestamps, appearance, layout, Custom CSS, Image widget media references, and non-secret Clock and Calendar widget configuration by default. Every Calendar feed URL is replaced with `null`. Device-specific Chrome bookmark-folder identifiers and recovery references are always removed. If bookmark URLs are explicitly included, they are stored separately and imported into a newly created folder. Locale and bookmark opening behavior are included as global preferences. Chrome permissions and cached Calendar events are excluded. Chrome bookmark URLs and uploaded media are separate categories and are excluded by default.

If the user includes bookmark URLs or media, Starlit shows a warning because the downloaded JSON can contain private URLs or embedded file data. The file is created locally and should be stored and shared only where the user intends.

Before import, Starlit displays aggregate counts, per-Scene changes, and bookmark/media counts. Every Scene ID conflict requires `Add as copy`, `Replace Scene`, or `Skip`. When bookmark URLs are included, import creates a new dedicated folder rather than overwriting an existing Chrome folder in place.

Portable Profile V4 never includes Chrome permissions, tutorial completion, Calendar feed URLs, or cached Calendar events.

### External visual resources

To display bookmark icons, Starlit may send only the bookmarked site's domain name—not the full bookmark path—to Google's favicon service over HTTPS. Starlit may also load IBM Plex font stylesheets from Google Fonts according to the selected language and font setting. Google processes those requests under Google's privacy policy.

## How Data Is Used

Starlit uses the data described above only to provide its user-facing bookmark workspace: rendering and searching bookmarks, applying Scenes, preserving customization, displaying favicons, loading user-selected media, and showing explicitly authorized Calendar events. Starlit does not use the data for analytics, behavioral tracking, personalized advertising, lending, or credit-worthiness decisions.

## Sharing and Transfer

Starlit does not sell user data. It does not transfer user data to the developer, data brokers, advertising platforms, or unrelated third parties.

Limited requests to Google services and user-selected resource providers occur only as described above and to provide visible features requested by the user. Starlit's use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.

Portable-profile files are transferred only when the user downloads, moves, or shares them. Starlit does not upload those files.

## Data Retention and Deletion

Settings, Scene records, caches, custom favicons, first-install tutorial completion, Calendar feed URLs, and local media remain in Chrome extension storage until the user resets, replaces, removes, or explicitly cleans them up; clears the extension's site data; or uninstalls Starlit. Calendar event results are treated as expired after five minutes. Optional Calendar host permissions remain under Chrome's permission management until revoked or the extension is uninstalled.

Locale and bookmark-opening preferences written through Chrome Sync may remain in the user's Google account according to Chrome Sync settings and Google's retention practices. Uninstalling Starlit removes extension-local data, while Chrome Sync and Calendar providers may have their own retention behavior.

Reset and Scene deletion preserve Chrome bookmark folders unless the user separately confirms folder deletion. Confirmed bookmark deletion, Scene-folder cleanup, tab-group import, and portable bookmark import modify Chrome bookmarks and cannot be undone by cancelling an unrelated Settings draft.

## Security and permissions

Starlit limits Calendar access to an HTTPS GET for the user-entered feed, omits browser credentials, and keeps exact-origin host permission behind an explained user action. The broad optional-host declaration permits runtime requests for arbitrary HTTPS feed providers but does not grant those origins automatically. Feed URLs are stored only in device-local Scene records and are redacted from portable exports.

Chrome presents the optional `tabs` permission as browsing-history access because it exposes open-tab titles and URLs. Starlit uses that access only during a user-initiated tab-group import and then removes it. Built-in external services use HTTPS. User-specified resources are requested directly using the provided URL, so users should choose HTTPS sources.

## Changes to This Policy

This policy may be updated when Starlit's features, permissions, schemas, or data practices change. The repository version must be reviewed whenever Calendar host access, Portable Profile categories, Scene storage, external providers, or Chrome Web Store disclosures change.

## Contact

Questions or requests about this policy can be submitted through the [Starlit issue tracker](https://github.com/fleetia/starlit/issues).
