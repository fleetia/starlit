# Privacy Policy for Starlit

Last updated: July 20, 2026

## Overview

Starlit is a Chrome extension that replaces the New Tab page with a customizable workspace built from the user's existing Chrome bookmarks. This policy explains what data Starlit accesses, how it is used, where it is stored, and when limited network requests occur.

Starlit does not operate a developer-controlled data collection server. It does not sell user data, use user data for advertising or credit decisions, or allow the developer or other people to read a user's bookmarks or locally selected files.

## Data Starlit Handles

### Chrome bookmarks

With the `bookmarks` permission, Starlit reads the user's bookmark folder structure, titles, and URLs to render bookmark groups and tiles on the New Tab page. A local cache may be stored in `chrome.storage.local` so the interface can load reliably.

Starlit changes Chrome bookmarks only when the user explicitly confirms deleting a bookmark. Hiding or reordering groups and changing icons in Starlit do not modify the underlying Chrome bookmark tree.

When the user explicitly imports an open Chrome tab group, Starlit creates a new bookmark folder and bookmarks for the tabs in that group. Imported folders are a one-time copy and are not synchronized with the source tab group. A failed group import attempts to remove only the folder created by that import.

### Chrome tab groups and open tabs

The optional `tabGroups` permission lets Starlit list open Chrome tab groups and assign a bookmark-folder title to a new live tab group. It is granted only after a user action, remains available for repeat use, and can be disconnected from Starlit's settings. Chrome's extension API does not provide Starlit with closed Saved Tab Groups or control over whether a live group is saved or synchronized.

The optional `tabs` permission lets an explicit import read the titles and URLs of tabs in the selected open groups. Starlit requests it only for the import session and removes it when the import finishes or is cancelled. The snapshot is kept only in the current page's memory and is not written to Starlit storage or sent to a developer-controlled server.

Opening a bookmark folder as a live tab group uses bookmark URLs Starlit already has through the `bookmarks` permission. It does not use `tabs` access to inspect unrelated browsing activity. The resulting live group remains in Chrome until the user closes or saves it through Chrome's own UI.

### Settings and preferences

With the `storage` permission, Starlit stores settings such as layout, group visibility and order, colors, typography, spacing, language, custom CSS, background metadata, overlay image positions and layer order, custom favicons, and expanded or collapsed group state.

Small preferences may be stored in `chrome.storage.sync`, which can sync them through the user's signed-in Chrome account when Chrome Sync is enabled. Local caches and custom favicons are stored in `chrome.storage.local`. Google processes Chrome Sync data under Google's own privacy terms; the Starlit developer does not receive it.

### Background and overlay media

When the user selects a background image, background video, or overlay image file from their device, Starlit processes and stores that file locally in the extension's IndexedDB storage. Overlay images are converted to WebP. These files are not uploaded to a developer-controlled server.

When the user provides a background URL or a URL inside custom CSS, Chrome requests that resource directly from the URL provider. That provider may receive ordinary request information such as the user's IP address and browser request metadata under the provider's own privacy policy.

### External visual resources

To display bookmark icons, Starlit may send only the bookmarked site's domain name—not the full bookmark path—to Google's favicon service over HTTPS. Starlit may also load IBM Plex font stylesheets from Google Fonts according to the selected language and font setting. Google processes those requests under Google's privacy policy.

## How Data Is Used

Starlit uses the data described above only to provide and improve its user-facing bookmark workspace, including rendering bookmarks, preserving customization, displaying favicons, and loading user-selected backgrounds and overlay images. Starlit does not use the data for analytics, behavioral tracking, personalized advertising, lending, or credit-worthiness decisions.

## Sharing and Transfer

Starlit does not sell user data. It does not transfer user data to the developer, data brokers, advertising platforms, or unrelated third parties.

Limited requests to Google services and user-selected resource providers occur only as described above and only to provide visible features requested by the user. Starlit's use of information received from Chrome APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.

## Data Retention and Deletion

Settings, caches, custom favicons, first-install tutorial completion, and local background or overlay media remain in Chrome extension storage until the user resets, replaces, or removes them, clears the extension's site data, or uninstalls Starlit. Settings stored through Chrome Sync may remain in the user's Google account according to the user's Chrome Sync settings and Google's retention practices.

Users can reset Starlit's settings from the extension interface. Uninstalling Starlit removes data stored locally for the extension. Chrome bookmarks remain in Chrome unless the user explicitly confirms a bookmark deletion in Starlit.

## Security

Starlit minimizes requested permissions and does not request active-tab or host access. Chrome presents the optional `tabs` permission as browsing-history access because it exposes open-tab titles and URLs; Starlit uses that access only during a user-initiated tab-group import and then removes it. Built-in external services use HTTPS. User-specified resources are requested directly using the URL provided, so users should choose HTTPS sources. User-selected local background and overlay files remain in browser-managed local storage.

## Changes to This Policy

This policy may be updated when Starlit's features or data practices change. The latest version will be published in the Starlit repository with an updated revision date.

## Contact

Questions or requests about this policy can be submitted through the [Starlit issue tracker](https://github.com/fleetia/starlit/issues).
