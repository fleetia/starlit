import type { Locale } from '../i18n';
import type { GuideSection } from './guideRoute';

export type GuideStepCopy = {
  body: string;
  title: string;
};

export type GuideCalloutCopy = {
  body: string;
  title: string;
  tone: 'info' | 'warning';
};

export type GuideMediaCopy = {
  alt: string;
  caption: string;
  src: string;
};

export type GuideDetailCopy = {
  body: string;
  title: string;
};

export type GuideSectionCopy = {
  callout?: GuideCalloutCopy;
  description: string;
  details: GuideDetailCopy[];
  facts: string[];
  media: GuideMediaCopy[];
  steps: GuideStepCopy[];
  title: string;
};

export type GuideCopy = {
  badge: string;
  chromeData: { items: string[]; title: string };
  dataOwnershipDescription: string;
  dataOwnershipTitle: string;
  detailsTitle: string;
  factsTitle: string;
  intro: string;
  language: string;
  navigation: string;
  quickStart: { description: string; steps: GuideStepCopy[]; title: string };
  releaseStatus: { body: string; title: string };
  sectionKicker: string;
  sections: Record<GuideSection, GuideSectionCopy>;
  screenshotNote?: string;
  starlitData: { items: string[]; title: string };
  stepsTitle: string;
  support: {
    description: string;
    homepage: string;
    issues: string;
    title: string;
  };
  title: string;
};

const COPY: Record<Locale, GuideCopy> = {
  en: {
    badge: 'Product wiki',
    chromeData: {
      items: [
        'Bookmark folders, bookmark titles, URLs, and the changes you make to them',
        'Open Chrome tab groups and their tabs while you explicitly import them',
        'Live tab groups after Starlit opens them, including whether you save or close them in Chrome',
        'Calendar feeds remain with their providers; Starlit reads an entered feed only after explicit host permission',
      ],
      title: 'Chrome and feed providers remain the sources of truth',
    },
    dataOwnershipDescription:
      'Starlit combines Chrome-owned bookmarks, explicitly authorized Calendar feeds, and its own display preferences. Knowing the boundary helps you predict what syncs, what a reset removes, and where to edit an item.',
    dataOwnershipTitle:
      'What belongs to an external provider and what belongs to Starlit?',
    detailsTitle: 'Questions and answers',
    factsTitle: 'Good to know',
    intro:
      'A practical reference for bookmark-first Scenes, Image, Clock, and Calendar widgets, Cmd/Ctrl+K search, and Portable Profile V4.',
    language: 'Guide language',
    navigation: 'Guide contents',
    quickStart: {
      description:
        'Start with the bookmarks you already have. You can refine the layout and appearance without reorganizing the underlying Chrome bookmark tree.',
      steps: [
        {
          body: 'Open a new tab. Starlit reads your Chrome bookmark folders and displays the selected root as groups.',
          title: 'See your bookmarks',
        },
        {
          body: 'Open Settings from the lower-right corner, try a layout or appearance change in the preview, then choose Save.',
          title: 'Shape the workspace',
        },
        {
          body: 'Organize bookmark content in Chrome. Open another new tab when you want Starlit to read the latest bookmark tree.',
          title: 'Keep Chrome in charge',
        },
      ],
      title: 'Start in three minutes',
    },
    sectionKicker: 'Guide chapter',
    screenshotNote:
      'The reference screenshots use the English product UI. Control positions and section layouts are the same in every language.',
    releaseStatus: {
      body: 'The v2 Calendar release remains blocked until the Chrome Web Store privacy disclosure and optional-host justification match this behavior. This guide does not claim that review is complete.',
      title: 'Calendar release review is still pending',
    },
    sections: {
      scenes: {
        callout: {
          body: 'Creating a Scene copies bookmarks only after a count preview and explicit confirmation. Applying or switching a saved Scene changes its folder reference and never rewrites the Chrome bookmark tree.',
          title: 'Creation copies; switching does not',
          tone: 'warning',
        },
        description:
          'Save appearance, layout, canvas widgets, and one bookmark-folder reference as a setup you can return to.',
        details: [
          {
            body: 'A Scene includes theme, font, background, bookmark presentation, Custom CSS, Image widget media and order, Clock and Calendar configuration, and its Chrome bookmark folder. Language, bookmark opening behavior, tutorial state, and permissions stay global.',
            title: 'What does a Scene save?',
          },
          {
            body: 'Starlit blocks Apply when the referenced folder or local media is missing. Relink points the Scene at an existing replacement. Restore appears only when a recovery snapshot can satisfy every missing resource.',
            title: 'Why can a Scene require Relink or Restore?',
          },
        ],
        facts: [
          'An upgraded profile remains activeSceneId null and does not copy bookmarks until you save the current setup as a Scene.',
          'A new Scene normally receives a dedicated folder under Starlit Scenes in Other bookmarks.',
          'Save updates the active Scene; Save as new creates an independent Scene and bookmark folder.',
          'Deleting a Scene keeps its Chrome bookmark folder by default. Local media used only by that Scene is removed, while media still used by another Scene is retained.',
        ],
        media: [],
        steps: [
          {
            body: 'Open Settings > Scene and choose to save the current setup. Existing profiles continue unchanged until you start this flow.',
            title: 'Start from the current setup',
          },
          {
            body: 'Review the folder and URL counts, Scene name, and destination parent. Continue only when the dedicated Chrome folder is correct.',
            title: 'Review before copying',
          },
          {
            body: 'Open Settings > Scene and choose a saved Scene. Review the preview, then apply it to change the active setup and bookmark root.',
            title: 'Preview and switch',
          },
          {
            body: 'If Apply reports missing resources, use Relink or an available recovery snapshot instead of applying a partial Scene.',
            title: 'Recover missing resources',
          },
        ],
        title: 'Save and switch Scenes safely',
      },
      'widgets-calendar': {
        callout: {
          body: 'Starlit never requests Calendar host access on first run. It requests only the entered URL origin when you choose Allow and subscribe after reading the explanation in Settings.',
          title: 'Calendar host access is always explicit',
          tone: 'warning',
        },
        description:
          'Add as many independent Clock and read-only Calendar widgets as a Scene needs without turning the new tab into a general plugin dashboard.',
        details: [
          {
            body: 'Starlit fetches an entered HTTPS iCalendar URL with credentials omitted. It parses the next seven days, keeps up to 50 events, and retains summary, time, all-day status, calendar color, and an HTTPS event link. Descriptions, attendees, and the raw feed are discarded.',
            title: 'What Calendar data is read?',
          },
          {
            body: 'Each feed URL stays in its device-local Scene. Event results are cached under an opaque URL-derived key in session storage for at most five minutes. Portable Profile V4 preserves the widget but replaces its feed URL with null and never includes cached events or Chrome permissions.',
            title: 'Where is Calendar state stored?',
          },
        ],
        facts: [
          'Clock needs no permission and supports token-based digital formats, IANA time zones, and analog faces with an optional second hand.',
          'Each Scene can contain any number of Clock and Calendar widgets with independent settings.',
          'Calendar requests go directly from the extension to the entered feed provider; there is no Starlit backend in the middle.',
          'The gear beside a widget row and a widget right-click open the same instance editor.',
        ],
        media: [],
        steps: [
          {
            body: 'Open Settings > Widgets, choose Add widget, then choose Clock. Select Digital or Analog, configure the format or second hand, and optionally enter an IANA time zone.',
            title: 'Add and format a Clock',
          },
          {
            body: 'Choose Add widget, then Calendar. Enter an HTTPS or webcal iCalendar subscription URL and review the host-access explanation.',
            title: 'Enter a Calendar URL',
          },
          {
            body: 'Choose Allow and subscribe. Chrome grants only the entered origin, then Starlit loads that feed. Repeat Add widget for another feed.',
            title: 'Allow the feed origin',
          },
          {
            body: 'Clear the URL or remove the widget to delete it from the Scene. Reset all clears event caches. Revoke a previously granted host from Chrome extension settings when access should also be removed.',
            title: 'Remove data and permission deliberately',
          },
        ],
        title: 'Clock and URL-subscribed Calendar',
      },
      'command-palette': {
        callout: {
          body: 'The shortcut belongs to the focused Starlit new-tab page. It is not registered as a browser-wide Chrome command.',
          title: 'The palette is page-scoped',
          tone: 'info',
        },
        description:
          'Search bookmarks, folders, Scenes, and Settings destinations from one keyboard-first dialog.',
        details: [
          {
            body: 'Current-Scene results come first. Within that priority, ranking checks title prefixes, domain prefixes, path substrings, and then title substrings as a fallback, with deterministic tie breaking.',
            title: 'How are results ordered?',
          },
          {
            body: 'The palette can open a bookmark, move to a folder or group, preview and apply a Scene, or open an exact Settings section. Bookmark editing and moving are intentionally outside this flow.',
            title: 'What can the palette change?',
          },
        ],
        facts: [
          'Use Cmd+K on macOS or Ctrl+K on other platforms while the new-tab page is focused.',
          'Arrow keys move through results, Enter activates the selected result, and Escape closes the dialog.',
          'Closing restores focus to the element that was focused before the palette opened.',
        ],
        media: [],
        steps: [
          {
            body: 'Press Cmd+K or Ctrl+K from the new-tab page.',
            title: 'Open the palette',
          },
          {
            body: 'Type a bookmark title, site domain, folder path, Scene name, or Settings destination.',
            title: 'Search across destinations',
          },
          {
            body: 'Use the arrow keys to inspect the categorized results, then press Enter to activate the selected item.',
            title: 'Choose a result',
          },
          {
            body: 'For a Scene result, review the preview before applying it. Press Escape when you want to leave the current setup unchanged.',
            title: 'Confirm Scene changes',
          },
        ],
        title: 'Find and act with Cmd/Ctrl+K',
      },
      appearance: {
        callout: {
          body: "A background URL is saved with the Scene on this extension profile and is not sent through Chrome Sync. The resource is still requested from its provider. An uploaded file stays only in this device's IndexedDB unless you explicitly include it in a Portable Profile.",
          title: 'URL and file backgrounds travel differently',
          tone: 'warning',
        },
        description:
          'Adjust the background, surfaces, bookmark tiles, folders, colors, and Custom CSS while keeping Chrome bookmark content unchanged.',
        details: [
          {
            body: 'Use a URL when the provider should host the media, or File upload when it should stay in extension storage. To move either setup to another profile or extension ID, export a Portable Profile with Scene enabled; also enable uploaded media when the Scene uses a file.',
            title: 'Should I use a URL or upload a file?',
          },
          {
            body: 'Starlit removes unsafe rules and declarations before applying Custom CSS. Start with the public data-starlit-part selectors shown in the CSS panel and check the preview before saving.',
            title: 'Why did part of my Custom CSS disappear?',
          },
        ],
        facts: [
          'Image and video URLs are stored as background settings; Chrome loads the resource directly from the provider.',
          'Background file uploads use the Image widget media processor: static images become WebP, GIFs become WebM, and playable videos retain their original format. Every input and output is limited to 20 MiB and 1920 pixels; GIFs are limited to 300 frames and 30 seconds.',
          'Uploaded media is processed locally and stored in IndexedDB, not uploaded to a Starlit server.',
          "Custom CSS is sanitized and applied after Starlit's base styles.",
        ],
        media: [
          {
            alt: 'Starlit Appearance settings showing the background preview and URL or file source controls',
            caption:
              'Appearance includes a live preview and separate URL and file-upload background sources.',
            src: '/assets/guide/settings-appearance.jpg',
          },
          {
            alt: 'Starlit Custom CSS settings showing public part selectors and an editable CSS field',
            caption:
              'The CSS panel lists stable public parts that can be targeted from sanitized Custom CSS.',
            src: '/assets/guide/settings-custom-css.jpg',
          },
        ],
        steps: [
          {
            body: 'Open Settings, choose Appearance, and use the preview to inspect changes without changing the live new tab yet.',
            title: 'Open the visual controls',
          },
          {
            body: 'Choose URL or File upload for the background, then select a static image, GIF, or browser-playable video. You can also clear the current background.',
            title: 'Choose a background source',
          },
          {
            body: 'Tune the container, bookmark, and folder panels. Use the CSS tab only when the built-in controls do not cover the change you need.',
            title: 'Refine the interface',
          },
          {
            body: 'Review the preview and choose Save. Closing or cancelling discards these draft appearance changes.',
            title: 'Save the draft',
          },
        ],
        title: 'Background, theme, and Custom CSS',
      },
      'overlay-images': {
        callout: {
          body: 'Order, newly added files, motion settings, and position edits remain in the Settings draft until you choose Save. Cancelling discards the complete Image widget draft.',
          title: 'Save the complete canvas draft',
          tone: 'info',
        },
        description:
          'Place Image widgets in front of or behind bookmarks and control stored motion without blocking normal bookmark use.',
        details: [
          {
            body: 'The Bookmarks row represents the complete bookmark workspace and cannot be removed. Images above it in the front-to-back list render over bookmarks; images below it render behind them.',
            title: 'What does the Bookmarks row mean?',
          },
          {
            body: 'Each image keeps a pixel offset from one of nine screen-relative positions. Choose the nearest corner, edge, or center so the image stays attached to that position when the viewport changes size.',
            title: 'Which screen-relative position should I choose?',
          },
          {
            body: 'Yes. Static images become WebP, GIFs become WebM, and browser-playable videos keep their original format. Invalid, unsupported, oversized, decode-failed, or encode-failed media is rejected before Save.',
            title: 'Can I upload a GIF or video as an Image widget?',
          },
        ],
        facts: [
          'Fresh installs and profiles after Reset all start with the bundled Getting image above bookmarks at the bottom-right screen-relative position. You can move, reorder, or remove it.',
          'Every input and processed output is limited to 20 MiB. Static images are resized within 1920 pixels; GIFs and videos above that boundary are rejected. GIFs are also limited to 300 frames and 30 seconds.',
          'Stored motion Image widgets support 0.5×, 1×, 1.5×, and 2× playback. Every mode pauses in a hidden tab; reduced-motion begins paused and can be explicitly played for the current session.',
          'Position editing supports multiple selection, dragging, arrow-key movement, rotation and scale for a single selection, grouping, and six-pixel snap guides. Hold Alt to disable snap temporarily.',
          'Images in front of bookmarks do not receive pointer events during normal left-click use, so bookmark links remain clickable. Right-click still finds a rotated image; it opens the same hide, lock, motion play/pause, duplicate, replace, order, and delete actions as the row’s More menu.',
        ],
        media: [],
        steps: [
          {
            body: 'Open Settings > Widgets. The list is ordered from the front of the screen to the back.',
            title: 'Open Image widgets',
          },
          {
            body: 'Choose Add widget, then Image, and select static images, GIFs, or browser-playable videos. Each file becomes a separate Image widget in the draft.',
            title: 'Add Image widgets',
          },
          {
            body: 'Drag rows or use the movement controls around the fixed Bookmarks row. In the position editor you can lock, hide, group, move, or remove the selected Image widgets.',
            title: 'Arrange front and back',
          },
          {
            body: 'Choose Edit positions, select one or more images, and use the named screen-relative position, drag, nudge, and snap guides. Rotation, scale, and screen-relative position changes apply to one selected image at a time.',
            title: 'Place selected images',
          },
          {
            body: 'For an existing motion item, choose its playback rate and active-tab-only or always mode. Reduced-motion starts paused; use the explicit play control to override it for the current session. Then choose Save to apply order, files, positions, and motion settings together.',
            title: 'Review motion and save',
          },
        ],
        title: 'Image widgets and motion',
      },
      'backup-permissions': {
        callout: {
          body: 'Portable import, reset, bookmark-manager, and tab-group actions run immediately; Cancel does not undo them. Import can create dedicated Chrome bookmark folders, so review the preview and every Scene conflict before applying.',
          title: 'Review immediate actions carefully',
          tone: 'warning',
        },
        description:
          'Move selected Scene data with Portable Profile V4, resolve conflicts before import, and understand permission and reset boundaries.',
        details: [
          {
            body: 'Scene, appearance, layout, Image widget media references, and non-secret Clock and Calendar configuration are included by default. Every Calendar feed URL is replaced with null. Chrome bookmark URLs and uploaded media are off by default and show a sensitive-data warning when enabled. Locale and bookmark opening behavior remain global preferences. Permissions, tutorial state, feed URLs, and cached events are always excluded.',
            title: 'What does Portable Profile V4 include?',
          },
          {
            body: 'Before apply, Starlit shows overall counts and each Scene’s changed sections, bookmark folders, URLs, and media. An ID collision requires Add as copy, Replace Scene, or Skip. Bookmark data is always prepared in a new dedicated folder, including a replacement.',
            title: 'How are import conflicts handled?',
          },
          {
            body: 'Storage and bookmarks are required. tabGroups remains optional until disconnected; tabs is requested only for an explicit open-group import and then removed. Calendar declares optional HTTPS hosts but requests only the exact feed origin after Allow and subscribe.',
            title: 'Why does Starlit request these permissions?',
          },
        ],
        facts: [
          'A different Chrome profile or extension ID has a separate storage area, even on the same computer.',
          'When bookmark URLs or media are excluded, the Scene configuration still travels but the corresponding Chrome folder contents or media Blob does not. Without bookmark URLs, a new or copied Scene omits device-bound group visibility and order and requires Relink before Apply. Replace keeps the destination Scene’s bookmark collection. Custom favicon overrides are not included.',
          'Bookmark URLs and media require the Scene category and can make the downloaded JSON sensitive.',
          'Skipped Scenes stay unchanged, while the profile’s global language and bookmark-opening preference are still imported.',
          'Replace Scene switches references only after new folders and assets are prepared; existing bookmark folders are not overwritten in place.',
          'Reset theme restores only the color theme. Reset all removes Starlit settings, Scene records, caches, custom favicons, and local media according to the reset confirmation.',
          'Reset does not delete Chrome bookmarks or Scene folders. Reset all clears Calendar event caches, while granted Calendar host permissions remain managed in Chrome extension settings.',
        ],
        media: [
          {
            alt: 'Starlit Settings with Portable profile selected, showing Scene, bookmark URL, and uploaded media export choices',
            caption:
              'Portable Profile export and import have their own Settings tab. Reset remains in General, and all three actions take effect immediately.',
            src: '/assets/guide/settings-portable-profile.jpg',
          },
        ],
        steps: [
          {
            body: 'Open Settings > Portable profile. Keep Scene selected, then independently decide whether the JSON should include Chrome bookmark URLs or uploaded media.',
            title: 'Choose export categories',
          },
          {
            body: 'Read the sensitive-data warning when URLs or media are selected, export the V4 JSON, and keep it somewhere you control.',
            title: 'Export and protect the file',
          },
          {
            body: 'In the destination, choose Import and inspect the overall counts and each Scene diff. Resolve every ID collision with Add as copy, Replace Scene, or Skip before applying.',
            title: 'Preview and resolve conflicts',
          },
          {
            body: 'Review tab-group and Calendar connections separately. Export first, then use reset only after checking which local Starlit data the confirmation will remove.',
            title: 'Review access and reset deliberately',
          },
        ],
        title: 'Portable Profile V4, permissions, and reset',
      },
      'bookmarks-folders': {
        callout: {
          body: 'Deleting a bookmark in Starlit is not a display-only action. After you confirm, the same bookmark is deleted from Chrome and cannot be restored by cancelling Settings.',
          title: 'Deletion changes Chrome data',
          tone: 'warning',
        },
        description:
          'Use Chrome to maintain bookmark content and use Starlit to browse that tree as groups, folders, and tiles.',
        details: [
          {
            body: 'Add, rename, and move items in Chrome Bookmark Manager. Starlit is a view over that bookmark tree, so keeping content edits in Chrome prevents two competing organization systems.',
            title: 'Where should I organize bookmarks?',
          },
          {
            body: 'Yes. Visibility, order, and custom icon choices are Starlit preferences. Hiding or moving a displayed group does not move or delete the matching Chrome folder.',
            title: 'Can I hide a group without deleting its folder?',
          },
        ],
        facts: [
          'Chrome bookmarks are the canonical copy; Starlit reads their folder structure, titles, and URLs.',
          'Opening a folder tile navigates within the current Starlit group and the breadcrumb lets you move back up.',
          'Display preferences never change the Chrome tree. Confirmed deletion removes a bookmark, while an explicit tab-group import adds a folder.',
        ],
        media: [
          {
            alt: 'Starlit Bookmark groups settings showing the Chrome bookmark root and folder tree',
            caption:
              'Choose which part of the Chrome bookmark tree becomes the root of your Starlit workspace.',
            src: '/assets/guide/settings-bookmark-groups.jpg',
          },
        ],
        steps: [
          {
            body: 'Open Chrome Bookmark Manager when you need to create, rename, move, or reorganize bookmarks and folders.',
            title: 'Edit the source in Chrome',
          },
          {
            body: 'Open a new tab after the Chrome change. Starlit reads the latest tree and renders the selected bookmark root as groups.',
            title: 'Refresh the workspace',
          },
          {
            body: 'Select a folder tile to browse its children in the same group. Use the breadcrumb to return to a parent folder.',
            title: 'Browse nested folders',
          },
          {
            body: 'To remove a bookmark from its tile menu, choose Delete and read the confirmation carefully. Confirming removes it from Chrome too.',
            title: 'Delete only when intended',
          },
        ],
        title: 'Bookmarks, folders, and the source of truth',
      },
      'getting-started': {
        callout: {
          body: 'Starlit does not create a second bookmark library. Your Chrome bookmark tree remains the source, while Starlit stores how that tree is presented.',
          title: 'Bring your existing bookmarks',
          tone: 'info',
        },
        description:
          'Learn the new-tab workspace, folder navigation, and the difference between content from Chrome and presentation saved by Starlit.',
        details: [
          {
            body: 'Starlit replaces the Chrome New Tab page. It shows bookmark groups immediately and adds folder navigation, layout controls, themes, and tab-group actions around them.',
            title: 'What changes after installation?',
          },
          {
            body: 'Open another new tab after editing bookmarks in Chrome. A fresh page reads the current bookmark tree, while an already open page may still show its earlier snapshot.',
            title: 'Why do I not see a recent Chrome change?',
          },
        ],
        facts: [
          "The selected root's direct bookmarks stay together as the root group, and its immediate subfolders appear as additional groups.",
          'Folder tiles keep you inside the same group; the breadcrumb shows the current path.',
          'Visibility, order, layout, colors, and icons are Starlit preferences rather than Chrome bookmark edits.',
        ],
        media: [
          {
            alt: 'Starlit new tab showing a bookmark breadcrumb, a Development group, folders, and bookmark tiles',
            caption:
              'The new tab turns a Chrome bookmark folder into a browsable group of folders and bookmark tiles.',
            src: '/assets/guide/new-tab-overview.jpg',
          },
        ],
        steps: [
          {
            body: 'Open a Chrome new tab. Starlit uses the configured bookmark root, keeps its direct bookmarks as the root group, and shows its immediate folders as additional groups.',
            title: 'Open the workspace',
          },
          {
            body: 'Select a bookmark to visit it, or select a folder tile to browse deeper without leaving the current group.',
            title: 'Browse bookmarks and folders',
          },
          {
            body: 'Use the settings button in the lower-right corner, or right-click an empty area of the new tab, to open General, Appearance, Widgets, Layout, CSS, Bookmark groups, Scene, and Portable profile.',
            title: 'Find Settings',
          },
          {
            body: 'Try regular settings in the preview, then choose Save. Choose Cancel when you want to discard the draft.',
            title: 'Preview, then save',
          },
        ],
        title: 'Getting started',
      },
      'group-layout': {
        callout: {
          body: 'Group selection, order, and layout controls are presentation settings. They do not move, rename, or delete the corresponding folders in Chrome.',
          title: 'Layout is independent from bookmark content',
          tone: 'info',
        },
        description:
          'Choose the bookmark root and visible groups, then tune pagination, expansion, columns, spacing, and margins for the screen you use.',
        details: [
          {
            body: 'Paged view keeps groups in a compact sequence. Expanded view places groups on one scrolling canvas and lets you collapse individual groups. Choose based on how many groups you want visible at once.',
            title: 'Paged or expanded view?',
          },
          {
            body: 'Check that the folder sits below the selected root and is marked visible in Settings > Bookmark groups. Then open a fresh new tab if the Chrome bookmark tree changed recently.',
            title: 'Why is a folder missing?',
          },
        ],
        facts: [
          'The Bookmark groups section controls the root, visibility, and sibling order used by Starlit.',
          'The Layout preview uses the real bookmark renderer in a read-only scaled view.',
          'Column counts, gaps, margins, bookmark expansion, and icon direction are saved as Starlit preferences.',
        ],
        media: [
          {
            alt: 'Starlit Layout settings showing a scaled preview, expansion controls, columns, and spacing sliders',
            caption:
              'Use the Layout preview to balance group density, icon direction, columns, gaps, and margins.',
            src: '/assets/guide/settings-layout.jpg',
          },
        ],
        steps: [
          {
            body: 'Open Settings > Bookmark groups and select the Chrome bookmark folder that should act as the workspace root.',
            title: 'Choose the root',
          },
          {
            body: 'Mark the groups you want visible and use the available order controls to place siblings in the sequence you prefer.',
            title: 'Select and order groups',
          },
          {
            body: 'Open Settings > Layout and choose a compact paged view or an expanded scrolling view, along with bookmark expansion and icon direction.',
            title: 'Choose the viewing mode',
          },
          {
            body: 'Adjust columns, gaps, and margins while watching the preview, then choose Save to apply the complete draft.',
            title: 'Tune spacing and save',
          },
        ],
        title: 'Group visibility, order, and layout',
      },
      'tab-groups': {
        callout: {
          body: 'Import copies an open tab group into a new Chrome bookmark folder once. Opening a bookmark folder creates a new live tab group once. Neither direction creates ongoing synchronization.',
          title: 'Both directions are explicit one-time actions',
          tone: 'warning',
        },
        description:
          "Copy currently open Chrome tab groups into bookmark folders, or open a folder's direct bookmarks as a new live Chrome tab group.",
        details: [
          {
            body: "Chrome's extension API exposes currently open groups, not closed Saved Tab Groups. Open the saved group in Chrome first, then reopen the importer.",
            title: 'Why is a saved tab group missing from import?',
          },
          {
            body: 'Only bookmarks directly inside the current folder are opened. Child folders are not flattened, unsupported URLs are skipped, and Starlit creates a new group even if another group has the same title.',
            title: 'What opens when I select the folder title?',
          },
        ],
        facts: [
          'The importer can list only tab groups that are open in Chrome at that moment.',
          'Imported tabs become a new Chrome bookmark folder and do not stay linked to the source group.',
          'Clicking the current folder title opens its direct bookmarks in a new live group with the same title; save that group in Chrome if it should persist.',
          'tabs access is temporary for import, while tabGroups access remains connected until you disconnect it in Settings.',
        ],
        media: [
          {
            alt: 'Starlit confirmation dialog for opening the Development bookmark folder as a Chrome tab group',
            caption:
              'Selecting the current folder title shows the bookmark count before Starlit opens a new live tab group.',
            src: '/assets/guide/open-tab-group-confirm.jpg',
          },
        ],
        steps: [
          {
            body: 'If the source is a Saved Tab Group, open it in Chrome so it becomes a currently open group that the extension API can list.',
            title: 'Open the source group',
          },
          {
            body: 'Open Settings > Bookmark groups, choose Import Chrome tab groups, and approve the requested optional access.',
            title: 'Start an import',
          },
          {
            body: 'Select one or more open groups and the destination bookmark folder, then import. Each selection becomes a one-time bookmark copy.',
            title: 'Choose groups and destination',
          },
          {
            body: 'To go the other way, click the current folder title, confirm the action, and let Starlit open its direct bookmarks as a new live group. Save it from Chrome if needed.',
            title: 'Reopen a folder as live tabs',
          },
        ],
        title: 'Import and reopen Chrome tab groups',
      },
      troubleshooting: {
        callout: {
          body: 'Do not start with Reset all when data appears missing. Export a Portable Profile from any installation that still has the expected setup, include bookmark URLs or media only when they are needed for recovery, then check the Chrome profile, extension ID, permissions, and resource references.',
          title: 'Protect the recoverable copy first',
          tone: 'warning',
        },
        description:
          'Diagnose a blocked Scene, missing bookmark or media, Calendar connection, or stale view by checking ownership and storage boundaries before resetting anything.',
        details: [
          {
            body: 'Normal updates to the same Store installation keep the same extension ID and preserve storage. A Store build, an unpacked build loaded from a different directory, or another Chrome profile can use separate storage. Export from the old installation and import into the new one.',
            title: 'Why did settings disappear after installing another build?',
          },
          {
            body: 'Starlit blocks a Scene when its bookmark-folder reference or a required local asset is missing. Relink the folder or asset, or use Restore only when the recovery snapshot can satisfy every missing reference. Applying another Scene never repairs or overwrites the Chrome bookmark tree.',
            title: 'Why will a Scene not apply?',
          },
          {
            body: 'Calendar does not request access automatically. Enter a valid HTTPS or webcal URL, choose Allow and subscribe, and approve the exact feed origin. For a stale or denied permission, review that origin in Chrome extension settings and subscribe again.',
            title: 'Why does Calendar show a connection or permission error?',
          },
          {
            body: 'Scene settings and uploaded media belong to one extension profile and do not arrive on another device through Chrome Sync. Export a Portable Profile with the Scene category, plus uploaded media when needed, then import it in the destination profile. A URL background still requires its provider to remain reachable.',
            title: 'Why is my media missing on another device?',
          },
        ],
        facts: [
          'A fresh new tab rereads Chrome bookmarks and resolves many stale-view cases.',
          'Same-ID extension updates preserve Starlit storage; different IDs and Chrome profiles do not share it automatically.',
          'Reset all clears Starlit-owned preferences and local media, not preserved Chrome bookmark folders.',
          'Portable Profile excludes bookmark URLs and uploaded media unless you explicitly enable those categories.',
        ],
        media: [],
        steps: [
          {
            body: 'Name the missing item first: a Scene bookmark folder, a local asset, an open tab group, a Calendar feed or host permission, or a display preference.',
            title: 'Identify who owns the data',
          },
          {
            body: 'For bookmark changes, open a fresh new tab. For tab groups, open the group in Chrome and check the Settings > Bookmark groups connection state.',
            title: 'Refresh the right source',
          },
          {
            body: 'Confirm that you are using the expected Chrome profile and Starlit installation. Different extension IDs have separate sync, local, and IndexedDB storage.',
            title: 'Check the storage boundary',
          },
          {
            body: 'Export the recoverable Scenes. Enable bookmark URLs or uploaded media only if the destination needs those private categories. Calendar URLs are always redacted, so save them separately. Only then try Relink, Restore, resubscribe, a targeted reset, or Reset all.',
            title: 'Export before recovery or reset',
          },
        ],
        title: 'Troubleshooting',
      },
    },
    starlitData: {
      items: [
        'Scene records: appearance, layout, bookmark-folder references, canvas widget order, Image widget media references, and Clock and Calendar configuration including device-local feed URLs',
        'Global language, bookmark opening behavior, favicon overrides, and UI caches',
        'Uploaded media and shared Scene assets stored locally in the extension profile',
        'Calendar feed URLs stored in device-local Scenes, with parsed event results cached in the current session for five minutes',
      ],
      title: 'Starlit stores Scenes and device-scoped preferences',
    },
    stepsTitle: 'Workflow',
    support: {
      description:
        'If the guide does not resolve the problem, check the Starlit homepage for current information or report a reproducible case in the public issue tracker.',
      homepage: 'Open the Starlit homepage',
      issues: 'Report an issue',
      title: 'Need more help?',
    },
    title: 'Starlit user guide',
  },
  ja: {
    badge: 'プロダクト Wiki',
    chromeData: {
      items: [
        'ブックマークフォルダー、タイトル、URL、およびそれらに加えた変更',
        '明示的に取り込む間だけ参照する、現在開いている Chrome タブグループとタブ',
        'Starlit が開いた後のライブタブグループと、Chrome での保存・終了状態',
        'Calendar feed は提供元に残り、Starlit は明示的に host 権限を許可した URL だけを読みます',
      ],
      title: '原本は Chrome と feed 提供元にあります',
    },
    dataOwnershipDescription:
      'Starlit は Chrome が所有する bookmark、明示的に許可した Calendar feed、Starlit 独自の表示設定を組み合わせます。この境界を知ると、同期されるもの、reset で消えるもの、編集すべき場所を判断できます。',
    dataOwnershipTitle: '外部 provider の data と Starlit の data',
    detailsTitle: 'よくある質問',
    factsTitle: '知っておきたいこと',
    intro:
      'Bookmark 中心の Scene、画像・時計・Calendar ウィジェット、Cmd/Ctrl+K 検索、Portable Profile V4 の実用ガイドです。',
    language: 'ガイドの言語',
    navigation: 'ガイドの目次',
    quickStart: {
      description:
        '今あるブックマークから始められます。Chrome のブックマークツリーを組み替えずに、レイアウトや外観だけを調整できます。',
      steps: [
        {
          body: '新しいタブを開きます。Starlit が Chrome ブックマークフォルダーを読み込み、選択したルートをグループとして表示します。',
          title: 'ブックマークを表示する',
        },
        {
          body: '右下から設定を開き、プレビューでレイアウトや外観を試してから［保存］を選びます。',
          title: 'ワークスペースを整える',
        },
        {
          body: 'ブックマークの内容は Chrome で整理します。最新のツリーを読み直すには、新しいタブをもう一度開きます。',
          title: 'Chrome を原本にする',
        },
      ],
      title: '3 分で始める',
    },
    sectionKicker: 'ガイド',
    screenshotNote:
      '参考スクリーンショットは英語版の画面です。操作位置と各セクションの配置は、どの言語でも共通です。',
    releaseStatus: {
      body: 'v2 の Calendar を公開するには、この動作に一致する Chrome Web Store のプライバシー申告と optional-host 権限の説明が必要です。このガイドは審査が完了したとは示していません。',
      title: 'Calendar の公開審査はまだ完了していません',
    },
    sections: {
      scenes: {
        callout: {
          body: 'Scene を作成するときだけ、件数のプレビューと明示的な確認後にブックマークをコピーします。保存済み Scene の適用や切り替えではフォルダー参照だけが変わり、Chrome ブックマークツリーを書き換えません。',
          title: '作成時はコピーし、切り替え時はコピーしません',
          tone: 'warning',
        },
        description:
          '外観、レイアウト、canvas のウィジェット、ブックマークフォルダーの参照を、あとで戻せる一つの設定として保存します。',
        details: [
          {
            body: 'Scene には theme、font、背景、ブックマーク表示、Custom CSS、画像ウィジェットの media と順序、時計・Calendar ウィジェットの設定、Chrome ブックマークフォルダーが含まれます。言語、リンクを開く方法、tutorial、権限は全体設定のままです。',
            title: 'Scene には何が保存されますか？',
          },
          {
            body: '参照先のフォルダーや local media が見つからない場合、Starlit は適用を止めます。Relink で既存の代替先を指定できます。Restore は、recovery snapshot ですべての不足分を復元できる場合だけ表示されます。',
            title: 'Relink または Restore が必要になる理由は？',
          },
        ],
        facts: [
          '更新された既存 profile は activeSceneId が null のままで、現在の設定を Scene として保存するまでブックマークをコピーしません。',
          '新しい Scene には通常、Other bookmarks 内の Starlit Scenes 以下に専用フォルダーが作成されます。',
          '［保存］は active Scene を更新し、［新しい Scene として保存］は独立した Scene とフォルダーを作ります。',
          'Scene を削除しても、Chrome ブックマークフォルダーは初期状態では保持されます。その Scene だけで使う local media は削除し、別の Scene でも使う media は保持します。',
        ],
        media: [],
        steps: [
          {
            body: '設定の［Scene］を開き、現在の設定を保存します。既存 profile は、この操作を始めるまで変更されません。',
            title: '現在の設定から始める',
          },
          {
            body: 'フォルダー数、URL 数、Scene 名、保存先の親フォルダーを確認します。専用 Chrome フォルダーが正しい場合だけ続けます。',
            title: 'コピー前に確認する',
          },
          {
            body: '設定の［Scene］で保存済み Scene を選びます。preview を確認してから適用し、active setup と bookmark root を切り替えます。',
            title: 'Preview して切り替える',
          },
          {
            body: '不足している resource が表示されたら、不完全な Scene を適用せず、Relink または利用可能な recovery snapshot を使います。',
            title: '不足している resource を復元する',
          },
        ],
        title: 'Scene を安全に保存・切り替えする',
      },
      'widgets-calendar': {
        callout: {
          body: 'Starlit は初回起動時に Calendar host access を要求しません。設定の説明を読み、［アクセスを許可して購読］を選んだ場合だけ、入力した URL の origin を要求します。',
          title: 'Calendar host access は必ず明示的に行います',
          tone: 'warning',
        },
        description:
          '新しいタブを一般的な plugin dashboard に変えず、Scene に Clock と read-only Calendar を必要な数だけ追加します。',
        details: [
          {
            body: 'Starlit は入力した HTTPS iCalendar URL を credential なしで取得します。今後 7 日分から最大 50 件を読み、件名、開始・終了、終日かどうか、Calendar 色、HTTPS event link だけを残します。説明、参加者、raw feed は破棄します。',
            title: 'どの Calendar data を読みますか？',
          },
          {
            body: 'Feed URL は device-local Scene に保存します。Event 結果は URL から作った opaque key で session storage に最長 5 分間 cache します。Portable Profile V4 は widget を保持しますが feed URL を null にし、cached event と Chrome permission は含めません。',
            title: 'Calendar の状態はどこに保存されますか？',
          },
        ],
        facts: [
          'Clock に権限は不要で、token-based digital format、IANA time zone、秒針を選べる analog 表示に対応します。',
          '一つの Scene に Clock と Calendar を必要な数だけ追加し、それぞれ個別に設定できます。',
          'Calendar request は拡張機能から入力した feed provider へ直接送られ、Starlit backend を経由しません。',
          'Widget row の歯車と widget の右クリックは、同じ instance editor を開きます。',
        ],
        media: [],
        steps: [
          {
            body: '設定の［ウィジェット］で［ウィジェットを追加］、［時計］の順に選びます。Digital または Analog、表示 format または秒針、必要に応じて IANA time zone を設定します。',
            title: 'Clock を追加して表示を設定する',
          },
          {
            body: '［ウィジェットを追加］、［Calendar］の順に選び、HTTPS または webcal の iCalendar 購読 URL を入力して host access の説明を確認します。',
            title: 'Calendar URL を入力する',
          },
          {
            body: '［アクセスを許可して購読］を選びます。Chrome は入力した origin だけを許可し、Starlit が feed を読み込みます。別の feed は新しい widget として追加します。',
            title: 'Feed origin を許可する',
          },
          {
            body: 'URL を消すか widget を削除すると Scene から取り除けます。［すべてリセット］は event cache を消します。許可済み host も解除する場合は Chrome の拡張機能設定を使います。',
            title: 'Data と permission を意図して削除する',
          },
        ],
        title: 'Clock と URL 購読 Calendar',
      },
      'command-palette': {
        callout: {
          body: 'Shortcut は focus 中の Starlit 新しいタブだけで動きます。Chrome 全体の browser command としては登録されません。',
          title: 'Palette は page 内だけで開きます',
          tone: 'info',
        },
        description:
          'キーボード中心の dialog から、bookmark、folder、Scene、設定の移動先をまとめて検索します。',
        details: [
          {
            body: '現在の Scene の結果を優先します。その中で title prefix、domain prefix、path substring の順に評価し、最後に title substring を fallback として使います。同点も常に同じ順になります。',
            title: '検索結果はどの順番ですか？',
          },
          {
            body: 'Bookmark を開く、folder または group へ移動する、Scene を preview して適用する、設定の正確な section を開く操作ができます。Bookmark の編集や移動は対象外です。',
            title: 'Palette では何を変更できますか？',
          },
        ],
        facts: [
          'macOS は Cmd+K、それ以外は Ctrl+K を新しいタブに focus がある状態で押します。',
          '方向キーで結果を移動し、Enter で選択、Escape で閉じます。',
          '閉じると、palette を開く前に focus していた要素へ戻ります。',
        ],
        media: [],
        steps: [
          {
            body: '新しいタブで Cmd+K または Ctrl+K を押します。',
            title: 'Palette を開く',
          },
          {
            body: 'Bookmark title、site domain、folder path、Scene 名、設定の移動先を入力します。',
            title: '移動先をまとめて検索する',
          },
          {
            body: '方向キーで category 別の結果を確認し、Enter で選択した項目を開きます。',
            title: '結果を選ぶ',
          },
          {
            body: 'Scene の結果は preview を確認してから適用します。現在の設定を変えない場合は Escape を押します。',
            title: 'Scene の変更を確認する',
          },
        ],
        title: 'Cmd/Ctrl+K で検索・移動する',
      },
      appearance: {
        callout: {
          body: '背景 URL はこの extension profile の Scene に保存され、Chrome Sync には送られません。素材は提供元から読み込まれます。アップロードしたファイルは、Portable Profile に明示的に含めない限り、この端末の IndexedDB にだけ保存されます。',
          title: 'URL とファイルでは引き継がれ方が異なります',
          tone: 'warning',
        },
        description:
          'Chrome ブックマークの内容を変えずに、背景、コンテナー、ブックマーク、フォルダー、色、Custom CSS を調整します。',
        details: [
          {
            body: '提供元で media を管理する場合は URL、extension storage 内に置く場合は file upload を選びます。別の profile や extension ID へ移すときは Scene を有効にした Portable Profile を export し、file を使う Scene では uploaded media も有効にしてください。',
            title: 'URL とファイルアップロードのどちらを使うべきですか？',
          },
          {
            body: 'Starlit は適用前に危険なルールや宣言を取り除きます。CSS パネルに示される公開 data-starlit-part selector から始め、保存前にプレビューを確認してください。',
            title: 'Custom CSS の一部が消えたのはなぜですか？',
          },
        ],
        facts: [
          '画像・動画 URL は背景設定として保存され、Chrome が提供元から直接読み込みます。',
          '背景 file upload は画像ウィジェット media と同じ processor を使います。静止画像は WebP、GIF は WebM になり、再生可能な動画は元の形式を保ちます。入力と出力は 20 MiB、1920 pixel までで、GIF は 300 frame、30 秒までです。',
          'Uploaded media は local で処理され、IndexedDB に保存されます。Starlit の server には送信されません。',
          'Custom CSS は安全化された後、Starlit の基本スタイルより後に適用されます。',
        ],
        media: [
          {
            alt: '背景プレビューと URL・ファイル切り替えが表示された Starlit の外観設定',
            caption:
              '外観にはライブプレビューがあり、背景の URL とファイルアップロードを個別に選べます。',
            src: '/assets/guide/settings-appearance.jpg',
          },
          {
            alt: '公開 part selector と CSS 入力欄が表示された Starlit の Custom CSS 設定',
            caption:
              'CSS パネルには、安全化された Custom CSS から利用できる安定した公開 part が表示されます。',
            src: '/assets/guide/settings-custom-css.jpg',
          },
        ],
        steps: [
          {
            body: '設定の［外観］を開き、ライブの新しいタブへ適用する前にプレビューで変更を確認します。',
            title: '外観設定を開く',
          },
          {
            body: '背景に URL または file upload を選び、静止画像、GIF、または browser で再生できる動画を指定します。現在の背景を削除することもできます。',
            title: '背景の入力元を選ぶ',
          },
          {
            body: 'コンテナー、ブックマーク、フォルダーを調整します。標準設定で足りない場合だけ CSS タブを使います。',
            title: '画面を整える',
          },
          {
            body: 'プレビューを確認して［保存］を選びます。閉じる、またはキャンセルすると外観の下書きは破棄されます。',
            title: '下書きを保存する',
          },
        ],
        title: '背景・テーマ・Custom CSS',
      },
      'overlay-images': {
        callout: {
          body: '順序、新しく追加したファイル、motion 設定、位置の編集は、［保存］を選ぶまで設定の下書きです。［キャンセル］すると、画像ウィジェットの下書き全体が破棄されます。',
          title: 'Canvas の下書き全体を保存します',
          tone: 'info',
        },
        description:
          '画像ウィジェットをブックマークの前後に配置し、通常のブックマーク操作を妨げずに、保存済み motion を設定します。',
        details: [
          {
            body: '［ブックマーク］行はブックマーク画面全体を表し、削除できません。前から後ろへ並ぶ一覧で、その行より上の画像はブックマークの前、下の画像は後ろに表示されます。',
            title: 'ブックマーク行とは何ですか？',
          },
          {
            body: '各画像は、画面上の 9 個の基準位置のいずれかから pixel 単位の距離を保ちます。画面サイズが変わっても位置関係を保てるよう、最も近い角、辺、または中央を選びます。',
            title: '画面基準位置はどれを選べばよいですか？',
          },
          {
            body: '追加できます。静止画像は WebP、GIF は WebM に変換し、browser で再生できる動画は元の形式を保ちます。無効、未対応、上限超過、decode または encode に失敗した media は保存前に拒否します。',
            title: 'GIF や動画を画像ウィジェットとして追加できますか？',
          },
        ],
        facts: [
          '新規インストールまたは［すべてリセット］後のプロフィールには、右下を基準にした同梱の Getting 画像がブックマークの前に表示されます。他の画像と同じように移動、並べ替え、削除できます。',
          '入力と処理後の出力はすべて 20 MiB までです。静止画像は 1920 pixel 以内へ縮小し、GIF と動画が上限を超える場合は拒否します。GIF は 300 frame、30 秒までです。',
          '保存済みの motion 画像ウィジェットは 0.5×、1×、1.5×、2× に対応します。どの mode も非表示 tab では停止します。reduced-motion では最初から停止し、現在の session だけ明示的に再生できます。',
          '位置編集では複数選択、drag、方向キー移動、単一選択での回転・scale、group、6 pixel の snap guide を使用できます。Alt を押すと snap を一時的に解除します。',
          'ブックマークの前にある画像は通常の left click で pointer event を受け取らないため、ブックマークリンクをそのまま選べます。Right click では回転した画像も検出し、行の More menu と同じ非表示、lock、motion の再生・停止、複製、置換、順序、削除 action を開きます。',
        ],
        media: [],
        steps: [
          {
            body: '設定の［ウィジェット］を開きます。一覧は画面の前から後ろの順に並びます。',
            title: '画像ウィジェットを開く',
          },
          {
            body: '［ウィジェットを追加］、［画像］の順に選び、静止画像、GIF、または browser で再生できる動画を指定します。各ファイルは下書き内の個別の画像ウィジェットになります。',
            title: '画像ウィジェットを追加する',
          },
          {
            body: '行を drag するか移動 control を使い、固定された［ブックマーク］行を基準に画像を移動します。位置 editor では選択した画像を lock、非表示、group、移動、削除できます。',
            title: '前後の順序を整える',
          },
          {
            body: '［位置を編集］で画像を選択し、名前付きの画面基準位置、drag、方向キー、snap guide を使います。回転、scale、画面基準位置の変更は 1 個だけ選択した場合に行います。',
            title: '選択した画像を配置する',
          },
          {
            body: '既存の motion item では playback rate と active-tab-only または always を選べます。Reduced-motion では最初から停止するため、必要なら明示的な再生 control で現在の session だけ再生します。その後［保存］を選び、順序、ファイル、位置、motion 設定をまとめて反映します。',
            title: 'Motion を確認して保存する',
          },
        ],
        title: '画像ウィジェットと motion',
      },
      'backup-permissions': {
        callout: {
          body: 'Portable import、リセット、ブックマークマネージャー、タブグループの操作はすぐに実行され、［キャンセル］では元に戻りません。Import は専用 Chrome bookmark folder を作成できるため、適用前に preview とすべての Scene conflict を確認してください。',
          title: 'すぐ実行される操作をよく確認します',
          tone: 'warning',
        },
        description:
          'Portable Profile V4 で選択した Scene data を移し、import 前に conflict を解決し、権限とリセットの境界を確認します。',
        details: [
          {
            body: 'Scene、外観、layout、画像ウィジェットの media 参照、秘密情報を除いた時計・Calendar 設定は既定で含まれます。Calendar feed URL はすべて null に置き換えます。Chrome bookmark URL と uploaded media は既定で除外されます。権限、tutorial、feed URL、cached event は常に除外します。',
            title: 'Portable Profile V4 には何が含まれますか？',
          },
          {
            body: '適用前に、全体件数と Scene ごとの変更 section、bookmark folder、URL、media 件数を表示します。ID conflict には［copy として追加］、［Scene を置換］、［skip］の選択が必要です。Bookmark data は replace の場合も新しい専用 folder に準備します。',
            title: 'Import conflict はどのように処理しますか？',
          },
          {
            body: 'Storage と bookmarks は必須です。tabGroups は接続解除まで任意で保持し、tabs は明示的な open group import の間だけ要求して解除します。Calendar は optional HTTPS host を宣言しますが、［アクセスを許可して購読］の後に exact feed origin だけを要求します。',
            title: 'それぞれの権限はなぜ必要ですか？',
          },
        ],
        facts: [
          '同じ端末でも、別の Chrome プロフィールや別の拡張機能 ID には独立した保存領域があります。',
          'Bookmark URL または media を除外しても Scene 設定は移動しますが、対応する Chrome folder の内容や media Blob は移動しません。Bookmark URL を除外すると、新規またはコピーした Scene では端末固有のグループ表示と順序を省き、適用前に Relink が必要です。Replace は移行先 Scene の bookmark collection を保持します。Custom favicon 設定は含みません。',
          'Bookmark URL と media は Scene category が必要で、download した JSON に sensitive data が入る可能性があります。',
          'Skip した Scene は変更せず、profile の global language とブックマークを開く設定は取り込みます。',
          'Replace Scene は新しい folder と asset の準備後に参照を切り替え、既存 bookmark folder を直接上書きしません。',
          '［Theme をリセット］は色だけを戻します。［すべてリセット］は確認内容に従って Starlit 設定、Scene record、cache、custom favicon、local media を削除します。',
          'Reset は Chrome bookmark や Scene folder を削除しません。［すべてリセット］は Calendar event cache を消去しますが、許可済み host permission は Chrome の拡張機能設定で管理します。',
        ],
        media: [
          {
            alt: 'Portable profile を選択し、Scene、bookmark URL、uploaded media の export 項目が表示された Starlit 設定',
            caption:
              'Portable Profile の export と import は専用の設定タブにあります。Reset は［一般］に残り、いずれも選ぶとすぐに実行されます。',
            src: '/assets/guide/settings-portable-profile.jpg',
          },
        ],
        steps: [
          {
            body: '設定の［Portable profile］を開きます。Scene を選択したまま、Chrome bookmark URL と uploaded media を JSON に含めるか個別に決めます。',
            title: 'Export category を選ぶ',
          },
          {
            body: 'URL または media を選んだ場合は sensitive-data 警告を読み、V4 JSON を export して自分で管理できる場所に保管します。',
            title: 'Export file を保護する',
          },
          {
            body: '移行先で［Import］を選び、全体件数と Scene diff を確認します。すべての ID conflict で［copy として追加］、［Scene を置換］、［skip］のいずれかを選んでから適用します。',
            title: 'Preview して conflict を解決する',
          },
          {
            body: 'Tab group と Calendar の接続は別に確認します。先に export し、確認画面で削除される local Starlit data を確認してから reset を実行します。',
            title: '接続と reset を意図して管理する',
          },
        ],
        title: 'Portable Profile V4・権限・リセット',
      },
      'bookmarks-folders': {
        callout: {
          body: 'Starlit でのブックマーク削除は、表示だけを消す操作ではありません。確認すると Chrome の同じブックマークも削除され、設定のキャンセルでは元に戻りません。',
          title: '削除は Chrome のデータを変更します',
          tone: 'warning',
        },
        description:
          'ブックマークの内容は Chrome で管理し、Starlit ではそのツリーをグループ、フォルダー、タイルとして閲覧します。',
        details: [
          {
            body: '追加、名前変更、移動は Chrome ブックマークマネージャーで行います。Starlit はそのツリーを表示するため、内容の編集場所を Chrome に統一すると二重管理を避けられます。',
            title: 'ブックマークはどこで整理しますか？',
          },
          {
            body: 'できます。表示、順序、カスタムアイコンは Starlit の設定です。グループを非表示にしたり表示順を変えたりしても、対応する Chrome フォルダーは移動・削除されません。',
            title: 'フォルダーを削除せずにグループを隠せますか？',
          },
        ],
        facts: [
          'Chrome ブックマークが原本で、Starlit はフォルダー構造、タイトル、URL を読み込みます。',
          'フォルダータイルを開くと同じ Starlit グループ内を移動し、breadcrumb から上位へ戻れます。',
          '表示設定は Chrome のツリーを変えません。確認した削除はブックマークを消し、明示的なタブグループ取り込みはフォルダーを追加します。',
        ],
        media: [
          {
            alt: 'Chrome ブックマークのルートとフォルダーツリーが表示された Starlit のブックマークグループ設定',
            caption:
              'Chrome ブックマークツリーのどこを Starlit ワークスペースのルートにするか選べます。',
            src: '/assets/guide/settings-bookmark-groups.jpg',
          },
        ],
        steps: [
          {
            body: 'ブックマークやフォルダーを作成、名前変更、移動、再整理するときは Chrome ブックマークマネージャーを開きます。',
            title: 'Chrome で原本を編集する',
          },
          {
            body: 'Chrome で変更した後、新しいタブを開きます。Starlit が最新のツリーを読み、選択したルートをグループとして表示します。',
            title: 'ワークスペースを更新する',
          },
          {
            body: 'フォルダータイルを選ぶと、その子要素を同じグループ内で表示します。親フォルダーへは breadcrumb で戻ります。',
            title: '入れ子のフォルダーを見る',
          },
          {
            body: 'タイルのメニューから削除する場合は、確認内容をよく読みます。確定すると Chrome からも削除されます。',
            title: '意図したときだけ削除する',
          },
        ],
        title: 'ブックマーク・フォルダー・原本',
      },
      'getting-started': {
        callout: {
          body: 'Starlit は二つ目のブックマークライブラリを作りません。Chrome ブックマークツリーが原本のまま、Starlit はその見せ方だけを保存します。',
          title: '今あるブックマークをそのまま使えます',
          tone: 'info',
        },
        description:
          '新しいタブのワークスペース、フォルダー移動、Chrome 由来の内容と Starlit が保存する表示設定の違いを説明します。',
        details: [
          {
            body: 'Starlit が Chrome の新しいタブを置き換えます。ブックマークグループをすぐに表示し、その周りにフォルダー移動、レイアウト、テーマ、タブグループ操作を加えます。',
            title: 'インストールすると何が変わりますか？',
          },
          {
            body: 'Chrome でブックマークを編集した後、新しいタブをもう一度開いてください。新しいページは現在のツリーを読みますが、すでに開いているページには以前の状態が残る場合があります。',
            title: 'Chrome での変更が見えないのはなぜですか？',
          },
        ],
        facts: [
          '選択したルート直下のブックマークはルートグループにまとまり、直下の各フォルダーは追加のグループになります。',
          'フォルダータイルを選ぶと同じグループ内を移動し、breadcrumb に現在の場所が表示されます。',
          '表示、順序、レイアウト、色、アイコンは Chrome ブックマークの編集ではなく Starlit の設定です。',
        ],
        media: [
          {
            alt: 'ブックマークの breadcrumb、開発グループ、フォルダー、ブックマークタイルが表示された Starlit の新しいタブ',
            caption:
              'Chrome ブックマークフォルダーが、フォルダーとブックマークタイルを移動できるグループとして表示されます。',
            src: '/assets/guide/new-tab-overview.jpg',
          },
        ],
        steps: [
          {
            body: 'Chrome で新しいタブを開きます。Starlit は選択したルート直下のブックマークをルートグループにまとめ、直下の各フォルダーを追加のグループとして表示します。',
            title: 'ワークスペースを開く',
          },
          {
            body: 'ブックマークを選んで移動するか、フォルダータイルを選んで同じグループ内をさらに深く閲覧します。',
            title: 'ブックマークとフォルダーを見る',
          },
          {
            body: '右下の設定ボタンを使うか、新しいタブの何もない場所を右クリックすると、［一般］［外観］［ウィジェット］［配置］［CSS］［ブックマークグループ］［Scene］［Portable profile］を開けます。',
            title: '設定を見つける',
          },
          {
            body: '通常の設定はプレビューで試し、［保存］で反映します。下書きを破棄する場合は［キャンセル］を選びます。',
            title: 'プレビューして保存する',
          },
        ],
        title: 'はじめに',
      },
      'group-layout': {
        callout: {
          body: 'グループの選択、順序、レイアウトは表示設定です。対応する Chrome フォルダーを移動、名前変更、削除することはありません。',
          title: 'レイアウトとブックマークの内容は別です',
          tone: 'info',
        },
        description:
          'ブックマークのルートと表示グループを選び、ページ表示・展開表示、列、間隔、余白を利用する画面に合わせます。',
        details: [
          {
            body: 'ページ表示はグループをコンパクトに順番表示します。展開表示は一つのスクロール画面にグループを並べ、個別に折りたためます。同時に見たいグループ数で選んでください。',
            title: 'ページ表示と展開表示の違いは？',
          },
          {
            body: 'フォルダーが選択中のルート配下にあり、設定の［ブックマークグループ］で表示対象になっているか確認します。Chrome のツリーを最近変えた場合は、新しいタブも開き直してください。',
            title: 'フォルダーが表示されないのはなぜですか？',
          },
        ],
        facts: [
          '［ブックマークグループ］で Starlit が使うルート、表示状態、同階層の順序を設定します。',
          '配置プレビューは実際のブックマーク renderer を読み取り専用の縮小表示で使います。',
          '列数、間隔、余白、ブックマークの展開、アイコンの向きは Starlit の設定として保存されます。',
        ],
        media: [
          {
            alt: '縮小プレビュー、展開設定、列数、間隔の slider が表示された Starlit の配置設定',
            caption:
              '配置プレビューを見ながら、密度、アイコンの向き、列、間隔、余白を調整します。',
            src: '/assets/guide/settings-layout.jpg',
          },
        ],
        steps: [
          {
            body: '設定の［ブックマークグループ］を開き、ワークスペースのルートにする Chrome ブックマークフォルダーを選びます。',
            title: 'ルートを選ぶ',
          },
          {
            body: '表示するグループを選び、用意された順序操作で同階層のフォルダーを好みの並びにします。',
            title: 'グループを選んで並べる',
          },
          {
            body: '設定の［配置］を開き、コンパクトなページ表示またはスクロールする展開表示、ブックマーク展開、アイコンの向きを選びます。',
            title: '表示方式を選ぶ',
          },
          {
            body: 'プレビューを見ながら列、間隔、余白を調整し、［保存］で下書き全体を反映します。',
            title: '間隔を整えて保存する',
          },
        ],
        title: 'グループの表示・順序・レイアウト',
      },
      'tab-groups': {
        callout: {
          body: '取り込みは開いているタブグループを新しい Chrome ブックマークフォルダーへ一度コピーします。フォルダーを開く操作は新しいライブタブグループを一度作ります。どちらも継続的な同期ではありません。',
          title: 'どちら向きも明示的な一度限りの操作です',
          tone: 'warning',
        },
        description:
          '現在開いている Chrome タブグループをブックマークフォルダーへコピーするか、フォルダー直下のブックマークを新しいライブタブグループで開きます。',
        details: [
          {
            body: 'Chrome の拡張機能 API が公開するのは現在開いているグループで、閉じた Saved Tab Groups ではありません。保存済みグループを Chrome で開いてから、取り込み画面を開き直してください。',
            title: '保存済みタブグループが取り込み一覧にないのはなぜですか？',
          },
          {
            body: '現在のフォルダー直下にあるブックマークだけを開きます。子フォルダーは展開せず、対応していない URL はスキップします。同じ名前のグループがあっても、新しいグループを作成します。',
            title: 'フォルダー名を選ぶと何が開きますか？',
          },
        ],
        facts: [
          '取り込み画面に表示できるのは、その時点で Chrome に開いているタブグループだけです。',
          '取り込んだタブは新しい Chrome ブックマークフォルダーになり、元のグループとは同期されません。',
          '現在のフォルダー名を選ぶと、直下のブックマークが同名の新しいライブグループで開きます。残したい場合は Chrome で保存します。',
          'tabs 権限は取り込み中だけ一時利用し、tabGroups 権限は設定で接続解除するまで保持します。',
        ],
        media: [
          {
            alt: '「開発」ブックマークフォルダーを Chrome タブグループとして開く Starlit の確認ダイアログ',
            caption:
              '現在のフォルダー名を選ぶと、Starlit が新しいライブタブグループを開く前にブックマーク数を確認できます。',
            src: '/assets/guide/open-tab-group-confirm.jpg',
          },
        ],
        steps: [
          {
            body: '取り込み元が Saved Tab Group の場合は Chrome で開き、拡張機能 API から見える現在開いているグループにします。',
            title: '取り込み元を開く',
          },
          {
            body: '設定の［ブックマークグループ］で［Chrome タブグループを取り込む］を選び、必要な任意権限を許可します。',
            title: '取り込みを開始する',
          },
          {
            body: '開いているグループと保存先のブックマークフォルダーを選んで取り込みます。選んだ各グループが一度だけコピーされます。',
            title: 'グループと保存先を選ぶ',
          },
          {
            body: '反対向きは、現在のフォルダー名を選んで確認し、直下のブックマークを新しいライブグループで開きます。必要なら Chrome で保存します。',
            title: 'フォルダーをライブタブで開く',
          },
        ],
        title: 'Chrome タブグループの取り込みと再オープン',
      },
      troubleshooting: {
        callout: {
          body: 'データが見えないとき、最初に［すべてリセット］を実行しないでください。期待する設定が残る環境から Portable Profile を先にエクスポートし、復旧に必要な場合だけ bookmark URL または media を含めます。その後、Chrome profile、extension ID、権限、resource 参照を確認します。',
          title: '復元できるコピーを先に守る',
          tone: 'warning',
        },
        description:
          'Scene が適用できない、bookmark や media が見つからない、Calendar を接続できない、表示が古い場合に、リセット前に所有者と保存領域の境界を確認します。',
        details: [
          {
            body: '同じ Store 版の通常更新は拡張機能 ID を維持し、保存領域も保持します。Store 版、unpacked 版、別の Chrome プロフィール、別ディレクトリから読み直した unpacked 版は、別の保存領域を使う場合があります。古い環境からエクスポートし、新しい環境へインポートしてください。',
            title:
              '別のビルドを入れたら設定が消えたように見えるのはなぜですか？',
          },
          {
            body: 'Bookmark folder の参照または必要な local asset がない Scene は適用されません。Folder や asset を Relink するか、recovery snapshot が不足する参照をすべて満たす場合だけ Restore を使います。別の Scene を適用しても Chrome bookmark tree は修復も上書きもされません。',
            title: 'Scene を適用できないのはなぜですか？',
          },
          {
            body: 'Calendar は自動で host access を要求しません。有効な HTTPS または webcal URL を入力し、［アクセスを許可して購読］で exact origin を許可します。拒否または古い permission は Chrome の拡張機能設定を確認してから再購読します。',
            title:
              'Calendar feed または permission のエラーが出るのはなぜですか？',
          },
          {
            body: 'Scene 設定と uploaded media は一つの extension profile にあり、Chrome Sync では別端末に届きません。Scene category と、必要な場合は uploaded media を有効にして Portable Profile を export し、移動先 profile で import します。URL 背景では提供元へ接続できる必要があります。',
            title: '別の端末で media が表示されないのはなぜですか？',
          },
        ],
        facts: [
          '新しいタブを開き直すと Chrome ブックマークを再読み込みし、古い表示が原因の問題を解消できます。',
          '同じ ID の拡張機能更新は Starlit の保存領域を維持しますが、別 ID と別 Chrome プロフィールは自動共有しません。',
          '［すべてリセット］は Starlit の設定と local media を消しますが、保持した Chrome bookmark folder は削除しません。',
          'Portable Profile は明示的に有効にしない限り bookmark URL と uploaded media を含みません。',
        ],
        media: [],
        steps: [
          {
            body: '見えないものを特定します。Scene の bookmark folder、local asset、開いている tab group、Calendar feed または host permission、表示設定のどれかを確認します。',
            title: 'データの所有者を特定する',
          },
          {
            body: 'ブックマーク変更なら新しいタブを開き直します。タブグループなら Chrome でグループを開き、設定の［ブックマークグループ］で接続状態を確認します。',
            title: '正しい情報源を更新する',
          },
          {
            body: '想定した Chrome プロフィールと Starlit を使っているか確認します。別の拡張機能 ID は sync、local、IndexedDB を共有しません。',
            title: '保存領域の境界を確認する',
          },
          {
            body: '復元できる Scene を export します。Calendar URL は常に redact されるため別に保管します。その後で Relink、Restore、再購読、対象だけの reset、または［すべてリセット］を試します。',
            title: '復旧またはリセット前にエクスポートする',
          },
        ],
        title: 'トラブルシューティング',
      },
    },
    starlitData: {
      items: [
        'Scene record：外観、layout、bookmark folder 参照、canvas の widget 順、画像ウィジェットの media 参照、device-local feed URL を含む時計・Calendar 設定',
        'Global の言語、bookmark を開く方法、favicon override、UI cache',
        '拡張機能 profile に local 保存した uploaded media と shared Scene asset',
        'Device-local Scene に保存した Calendar feed URL と、現在の session に 5 分間 cache する parsed event 結果',
      ],
      title: 'Starlit は Scene と端末ごとの設定を保存します',
    },
    stepsTitle: '手順',
    support: {
      description:
        'このガイドで解決しない場合は、Starlit ホームページで最新情報を確認するか、再現手順を添えて公開 issue tracker に報告してください。',
      homepage: 'Starlit ホームページを開く',
      issues: '問題を報告する',
      title: 'さらにサポートが必要ですか？',
    },
    title: 'Starlit 使用ガイド',
  },
  ko: {
    badge: '제품 위키',
    chromeData: {
      items: [
        '북마크 폴더, 북마크 제목과 URL, 그리고 이를 편집한 결과',
        '사용자가 명시적으로 가져오는 동안 읽는 현재 열린 Chrome 탭 그룹과 탭',
        'Starlit이 연 뒤 Chrome에서 저장하거나 닫는 live tab group',
        'Calendar feed와 event는 feed 제공자에 남으며 Starlit은 사용자가 URL별 접근을 허용한 뒤 필요한 data만 읽습니다',
      ],
      title: 'Chrome과 Calendar 제공자가 원본을 관리합니다',
    },
    dataOwnershipDescription:
      'Starlit은 Chrome이 관리하는 북마크, 사용자가 구독한 Calendar feed, 자체 화면 설정을 함께 사용합니다. 이 경계를 알면 무엇이 동기화되고, 초기화 때 무엇이 사라지며, 어디에서 항목을 편집해야 하는지 판단하기 쉽습니다.',
    dataOwnershipTitle: '외부 provider data와 Starlit data',
    detailsTitle: '자주 묻는 질문',
    factsTitle: '알아두면 좋은 점',
    intro:
      '북마크 중심 Scene, 이미지·시계·Calendar 위젯, Cmd/Ctrl+K 검색, Portable Profile V4를 설명하는 실용 가이드입니다.',
    language: '가이드 언어',
    navigation: '가이드 목차',
    quickStart: {
      description:
        '이미 사용 중인 북마크로 바로 시작할 수 있습니다. Chrome 북마크 트리를 재구성하지 않고 레이아웃과 화면 모양만 다듬어 보세요.',
      steps: [
        {
          body: '새 탭을 엽니다. Starlit이 Chrome 북마크 폴더를 읽고 선택한 루트를 그룹으로 표시합니다.',
          title: '북마크 확인하기',
        },
        {
          body: '오른쪽 아래에서 설정을 열고 미리보기로 레이아웃이나 화면 모양을 바꿔 본 뒤 저장을 선택합니다.',
          title: '작업 공간 다듬기',
        },
        {
          body: '북마크 내용은 Chrome에서 정리합니다. 최신 북마크 트리를 다시 읽으려면 새 탭을 한 번 더 여세요.',
          title: 'Chrome을 원본으로 사용하기',
        },
      ],
      title: '3분 만에 시작하기',
    },
    sectionKicker: '가이드',
    releaseStatus: {
      body: 'v2 Calendar를 출시하려면 URL별 선택적 host 접근과 data 처리 방식에 맞춰 Chrome Web Store privacy practices를 갱신해야 합니다. 이 가이드는 Store 검토가 끝났다고 주장하지 않습니다.',
      title: 'Calendar 출시 전 Store 검토가 남아 있습니다',
    },
    sections: {
      scenes: {
        callout: {
          body: 'Scene을 만들 때만 개수 미리보기와 명시적인 확인을 거쳐 북마크를 복사합니다. 저장된 Scene을 적용하거나 전환할 때는 폴더 참조만 바뀌며 Chrome 북마크 트리를 다시 쓰지 않습니다.',
          title: '생성할 때는 복사하고 전환할 때는 복사하지 않습니다',
          tone: 'warning',
        },
        description:
          '화면 모양, 레이아웃, canvas 위젯, 북마크 폴더 참조를 나중에 돌아올 수 있는 하나의 설정으로 저장합니다.',
        details: [
          {
            body: 'Scene에는 theme, font, 배경, 북마크 표시 방식, Custom CSS, 이미지 위젯의 media와 순서, 시계·Calendar 위젯 설정, Chrome 북마크 폴더가 들어갑니다. 언어, 링크 열기 방식, tutorial 상태와 Chrome 권한은 전체 설정으로 남습니다.',
            title: 'Scene에는 무엇이 저장되나요?',
          },
          {
            body: '참조하는 폴더나 local media가 사라지면 Starlit은 적용을 막습니다. Relink로 이미 있는 대체 resource를 연결할 수 있습니다. Restore는 recovery snapshot이 빠진 resource를 모두 복구할 수 있을 때만 표시됩니다.',
            title: 'Relink나 Restore가 필요한 이유는 무엇인가요?',
          },
        ],
        facts: [
          '업데이트한 기존 profile은 activeSceneId가 null인 상태를 유지하며 현재 설정을 Scene으로 저장하기 전에는 북마크를 복사하지 않습니다.',
          '새 Scene은 기본적으로 Other bookmarks의 Starlit Scenes 아래에 전용 폴더를 가집니다.',
          '저장은 active Scene을 갱신하고 새 Scene으로 저장은 독립적인 Scene과 북마크 폴더를 만듭니다.',
          'Scene을 삭제해도 Chrome 북마크 폴더는 기본적으로 보존합니다. 해당 Scene에서만 쓰는 로컬 미디어는 삭제하고, 다른 Scene에서도 쓰는 미디어는 보존합니다.',
        ],
        media: [],
        steps: [
          {
            body: '설정 > Scene을 열고 현재 설정 저장을 선택합니다. 기존 profile은 이 작업을 시작하기 전까지 그대로 유지됩니다.',
            title: '현재 설정에서 시작하기',
          },
          {
            body: '폴더 수, URL 수, Scene 이름, 저장할 상위 폴더를 확인합니다. 전용 Chrome 폴더가 맞을 때만 계속하세요.',
            title: '복사 전에 확인하기',
          },
          {
            body: '설정 > Scene에서 저장된 Scene을 고릅니다. 미리보기를 확인한 다음 적용해 active setup과 북마크 root를 바꿉니다.',
            title: '미리보고 전환하기',
          },
          {
            body: '빠진 resource가 표시되면 불완전한 Scene을 적용하지 말고 Relink 또는 사용 가능한 recovery snapshot을 선택하세요.',
            title: '빠진 resource 복구하기',
          },
        ],
        title: 'Scene을 안전하게 저장하고 전환하기',
      },
      'widgets-calendar': {
        callout: {
          body: 'Starlit은 첫 실행에서 Calendar feed에 접근하지 않습니다. URL을 입력하고 접근 허용 및 구독을 선택했을 때만 Chrome이 해당 URL의 정확한 origin 접근을 요청합니다.',
          title: 'Calendar 구독은 항상 명시적으로 시작합니다',
          tone: 'warning',
        },
        description:
          'Scene에 Clock과 읽기 전용 Calendar를 필요한 만큼 추가하고, 각 위젯을 독립적으로 배치하고 설정합니다.',
        details: [
          {
            body: 'Starlit은 인증 정보가 포함되지 않은 HTTPS iCalendar URL을 읽습니다. 앞으로 7일의 event를 최대 50개까지 표시하며 제목, 시작·종료, 종일 여부, Calendar 색상, 안전한 HTTPS event link만 남깁니다. 설명, 참석자와 raw feed는 저장하지 않습니다.',
            title: '어떤 Calendar data를 읽나요?',
          },
          {
            body: 'Feed URL은 해당 Calendar 위젯의 Scene 설정에 기기별로 저장합니다. event 결과는 raw URL이 드러나지 않는 key로 session storage에서 최대 5분 동안 다시 사용합니다. Portable Profile V4에는 Calendar 위젯 설정을 넣되 feed URL은 null로 가립니다.',
            title: 'Calendar 상태는 어디에 저장되나요?',
          },
        ],
        facts: [
          'Digital Clock은 HH, H, hh, h, mm, m, ss, s, a token을 조합하고 IANA time zone을 지정할 수 있습니다.',
          'Analog Clock은 별도 표시 방식으로 선택하며 초침을 켜거나 끌 수 있습니다.',
          'Scene 하나에 Clock과 Calendar를 각각 여러 개 둘 수 있습니다.',
          'Calendar request는 extension에서 feed 제공자로 직접 보내며 중간에 Starlit backend가 없습니다.',
          '메뉴의 톱니바퀴와 canvas 위젯 우클릭은 같은 위젯별 설정 화면을 엽니다.',
        ],
        media: [],
        steps: [
          {
            body: '설정 > 위젯에서 위젯 추가, 시계 순서로 선택합니다. Digital 또는 Analog를 고르고 표시 형식, time zone이나 초침을 설정합니다.',
            title: 'Local Clock 추가하기',
          },
          {
            body: '위젯 추가, Calendar 순서로 선택하고 HTTPS 또는 webcal Calendar URL을 입력합니다. 설명을 확인한 뒤 접근 허용 및 구독을 선택합니다.',
            title: 'Calendar URL 구독하기',
          },
          {
            body: 'Chrome 권한 dialog에서 입력한 URL의 정확한 origin만 허용합니다. 구독되면 앞으로 7일의 event가 해당 위젯에 표시됩니다.',
            title: 'URL별 접근 허용하기',
          },
          {
            body: '위젯을 삭제하거나 전체 초기화하면 저장된 URL과 event cache가 사라집니다. 이미 허용한 host 권한까지 없애려면 Chrome의 확장 프로그램 site access 설정에서 직접 회수합니다.',
            title: '구독과 host 권한 정리하기',
          },
        ],
        title: '설정 가능한 Clock과 URL 구독 Calendar',
      },
      'command-palette': {
        callout: {
          body: 'Shortcut은 focus된 Starlit 새 탭 안에서만 동작합니다. Chrome 전체에서 쓰는 browser command로 등록하지 않습니다.',
          title: 'Palette는 현재 page에서만 열립니다',
          tone: 'info',
        },
        description:
          '키보드 중심 dialog 하나에서 북마크, 폴더, Scene, 설정 목적지를 검색합니다.',
        details: [
          {
            body: '현재 Scene의 결과를 먼저 보여줍니다. 그 안에서는 제목 prefix, domain prefix, path substring 순으로 점수를 매기고 마지막에는 제목 substring을 fallback으로 사용합니다. 동점도 항상 같은 순서로 정렬합니다.',
            title: '검색 결과는 어떤 순서인가요?',
          },
          {
            body: '북마크 열기, 폴더·그룹 이동, Scene 미리보기와 적용, 정확한 설정 section 열기를 할 수 있습니다. 북마크 편집과 이동은 이 palette의 범위가 아닙니다.',
            title: 'Palette에서 무엇을 바꿀 수 있나요?',
          },
        ],
        facts: [
          'macOS에서는 Cmd+K, 다른 환경에서는 Ctrl+K를 새 탭에 focus가 있는 상태에서 누릅니다.',
          '방향키로 결과를 이동하고 Enter로 선택하며 Escape로 dialog를 닫습니다.',
          '닫으면 palette를 열기 전에 focus했던 요소로 돌아갑니다.',
        ],
        media: [],
        steps: [
          {
            body: '새 탭에서 Cmd+K 또는 Ctrl+K를 누릅니다.',
            title: 'Palette 열기',
          },
          {
            body: '북마크 제목, site domain, 폴더 path, Scene 이름, 설정 목적지를 입력합니다.',
            title: '목적지 한 번에 검색하기',
          },
          {
            body: '방향키로 category별 결과를 살펴보고 Enter를 눌러 선택한 항목을 실행합니다.',
            title: '결과 선택하기',
          },
          {
            body: 'Scene 결과는 미리보기를 확인하고 적용합니다. 현재 설정을 바꾸지 않으려면 Escape를 누르세요.',
            title: 'Scene 변경 확인하기',
          },
        ],
        title: 'Cmd/Ctrl+K로 찾고 이동하기',
      },
      appearance: {
        callout: {
          body: '배경 URL은 이 extension profile의 Scene에 저장되며 Chrome Sync로 전송되지 않습니다. 실제 파일은 제공처에서 불러옵니다. 업로드한 파일은 Portable Profile에 명시적으로 포함하지 않는 한 이 기기의 IndexedDB에만 저장됩니다.',
          title: 'URL과 업로드 파일은 이동 방식이 다릅니다',
          tone: 'warning',
        },
        description:
          'Chrome 북마크 내용은 바꾸지 않고 배경, 컨테이너, 북마크, 폴더, 색상, Custom CSS를 조정합니다.',
        details: [
          {
            body: '미디어를 제공처에서 관리하려면 URL을, extension storage에 보관하려면 file upload를 사용하세요. 다른 profile이나 extension ID로 옮길 때는 Scene을 켠 Portable Profile을 내보내고, 파일을 쓰는 Scene이면 uploaded media도 함께 켜세요.',
            title: 'URL과 파일 업로드 중 무엇을 선택할까요?',
          },
          {
            body: 'Starlit은 적용 전에 안전하지 않은 규칙과 선언을 제거합니다. CSS 화면에 안내된 공개 data-starlit-part selector부터 사용하고 저장 전에 미리보기를 확인하세요.',
            title: 'Custom CSS 일부가 사라진 이유는 무엇인가요?',
          },
        ],
        facts: [
          '이미지·동영상 URL은 배경 설정으로 저장되고 Chrome이 제공처에서 직접 불러옵니다.',
          '배경 file upload는 이미지 위젯 media와 같은 processor를 사용합니다. 정적 이미지는 WebP, GIF는 WebM이 되고 재생 가능한 동영상은 원본 형식을 유지합니다. 입력과 출력은 20 MiB·1920px까지, GIF는 300 frame·30초까지 허용합니다.',
          'Uploaded media는 local에서 처리해 IndexedDB에 저장하며 Starlit server로 전송하지 않습니다.',
          'Custom CSS는 안전하게 정리된 뒤 Starlit 기본 스타일보다 나중에 적용됩니다.',
        ],
        media: [
          {
            alt: '배경 미리보기와 URL·파일 선택 화면이 보이는 Starlit 외형 설정',
            caption:
              '외형 화면에서 실시간 미리보기를 확인하고 배경 URL과 파일 업로드 중 하나를 선택할 수 있습니다.',
            src: '/assets/guide/settings-appearance.jpg',
          },
          {
            alt: '공개 part selector와 CSS 입력창이 보이는 Starlit Custom CSS 설정',
            caption:
              'CSS 화면에는 안전하게 정리되는 Custom CSS에서 사용할 수 있는 안정적인 공개 part가 표시됩니다.',
            src: '/assets/guide/settings-custom-css.jpg',
          },
        ],
        steps: [
          {
            body: '설정에서 외형을 열고 실제 새 탭에 반영하기 전에 미리보기로 변경 결과를 살펴봅니다.',
            title: '화면 설정 열기',
          },
          {
            body: '배경 가져오기 방식으로 URL 또는 file upload를 고른 뒤 정적 이미지, GIF, browser가 재생할 수 있는 동영상을 지정합니다. 현재 배경을 제거할 수도 있습니다.',
            title: '배경 가져오기 방식 고르기',
          },
          {
            body: '컨테이너, 북마크, 폴더 화면을 조정합니다. 기본 설정만으로 부족할 때만 CSS tab을 사용하세요.',
            title: '화면 요소 다듬기',
          },
          {
            body: '미리보기를 확인하고 저장을 선택합니다. 닫기나 취소를 선택하면 화면 설정 draft를 버립니다.',
            title: 'Draft 저장하기',
          },
        ],
        title: '배경·테마·Custom CSS',
      },
      'overlay-images': {
        callout: {
          body: '순서, 새로 추가한 파일, motion 설정, 위치 편집은 저장을 선택하기 전까지 설정 draft입니다. 취소하면 이미지 위젯 draft 전체를 버립니다.',
          title: 'Canvas draft 전체를 저장합니다',
          tone: 'info',
        },
        description:
          '이미지 위젯을 북마크 앞이나 뒤에 배치하고, 평소 북마크 사용을 막지 않으면서 저장된 motion을 설정합니다.',
        details: [
          {
            body: '북마크 행은 전체 북마크 화면을 뜻하며 삭제할 수 없습니다. 앞에서 뒤 순서인 목록에서 북마크보다 위에 둔 이미지는 북마크 앞에, 아래에 둔 이미지는 뒤에 표시됩니다.',
            title: '북마크 행은 무엇인가요?',
          },
          {
            body: '각 이미지는 화면의 9개 기준 위치 중 하나에서 pixel 단위 거리를 유지합니다. 화면 크기가 달라져도 위치 관계를 유지하도록 가장 가까운 모서리, 변, 중앙을 고르세요.',
            title: '어떤 화면 기준 위치를 선택해야 하나요?',
          },
          {
            body: '가능합니다. 정적 이미지는 WebP로, GIF는 WebM으로 변환하고 browser가 재생할 수 있는 동영상은 원본 형식을 유지합니다. 형식 오류, 미지원, 제한 초과, decode·encode 실패 media는 저장 전에 거절합니다.',
            title: 'GIF나 동영상을 이미지 위젯으로 추가할 수 있나요?',
          },
        ],
        facts: [
          '새로 설치하거나 전체 초기화한 profile에는 오른쪽 아래를 기준으로 한 기본 Getting 이미지가 북마크 앞에 표시됩니다. 다른 이미지처럼 이동, 순서 변경, 삭제할 수 있습니다.',
          '입력과 처리 결과는 모두 20 MiB까지 허용합니다. 정적 이미지는 1920px 안으로 줄이고 GIF와 동영상이 이 범위를 넘으면 거절합니다. GIF는 300 frame, 30초까지입니다.',
          '저장된 motion 이미지 위젯은 0.5×, 1×, 1.5×, 2× 재생을 지원합니다. 모든 mode는 숨겨진 tab에서 멈춥니다. reduced-motion에서는 처음부터 멈추며 현재 session에서 명시적으로 재생할 수 있습니다.',
          '위치 편집에서는 다중 선택, drag, 방향키 이동, 단일 선택의 회전·scale, group, 6px snap guide를 지원합니다. Alt를 누르면 snap을 잠시 끕니다.',
          '북마크 앞에 둔 이미지도 일반 left click에서는 pointer event를 받지 않아 북마크 link를 그대로 선택할 수 있습니다. Right click은 회전한 이미지도 찾아 행의 더보기 menu와 같은 숨김, 잠금, motion 재생·멈춤, 복제, 교체, 순서, 삭제 action을 엽니다.',
        ],
        media: [],
        steps: [
          {
            body: '설정 > 위젯을 엽니다. 목록은 화면의 앞에서 뒤 순서로 표시됩니다.',
            title: '이미지 위젯 열기',
          },
          {
            body: '위젯 추가, 이미지 순서로 선택하고 정적 이미지, GIF, browser가 재생할 수 있는 동영상을 고릅니다. 각 파일은 draft 안의 별도 이미지 위젯이 됩니다.',
            title: '이미지 위젯 추가하기',
          },
          {
            body: '행을 drag하거나 이동 control을 사용해 고정된 북마크 행을 기준으로 이미지를 옮깁니다. 위치 editor에서는 선택한 이미지를 잠그고, 숨기고, group으로 묶고, 이동하거나 삭제할 수 있습니다.',
            title: '앞뒤 순서 정하기',
          },
          {
            body: '위치 편집에서 이미지를 선택하고 이름이 붙은 화면 기준 위치, drag, 방향키, snap guide를 사용합니다. 회전, scale, 화면 기준 위치 변경은 하나만 선택했을 때 적용합니다.',
            title: '선택한 이미지 배치하기',
          },
          {
            body: '기존 motion item에서는 재생 속도와 active-tab-only 또는 always를 고를 수 있습니다. reduced-motion에서는 처음부터 멈추므로 필요하면 명시적인 재생 control로 현재 session에서만 재생하세요. 그다음 저장을 선택해 순서, 파일, 위치, motion 설정을 함께 반영합니다.',
            title: 'Motion 확인하고 저장하기',
          },
        ],
        title: '이미지 위젯과 motion',
      },
      'backup-permissions': {
        callout: {
          body: 'Portable 가져오기, 초기화, 북마크 관리자, 탭 그룹 작업은 즉시 실행되며 취소로 되돌릴 수 없습니다. 가져오기는 전용 Chrome 북마크 폴더를 만들 수 있으므로 적용 전에 미리보기와 모든 Scene 충돌을 확인하세요.',
          title: '즉시 실행되는 작업을 자세히 확인하세요',
          tone: 'warning',
        },
        description:
          'Portable Profile V4로 선택한 Scene data를 옮기고 적용 전에 충돌을 해결하며 권한과 초기화 범위를 확인합니다.',
        details: [
          {
            body: 'Scene, 화면 모양, layout, 이미지 위젯 media 참조, 시계·Calendar 위젯 설정은 기본으로 포함합니다. Calendar feed URL은 항상 null로 가립니다. Chrome 북마크 URL과 uploaded media는 기본으로 제외하며 켜면 민감정보 안내를 표시합니다. Locale과 링크 열기 방식은 global preference이며 Scene을 꺼도 포함합니다. 권한, tutorial 상태와 cached event도 항상 제외합니다.',
            title: 'Portable Profile V4에는 무엇이 들어가나요?',
          },
          {
            body: '적용 전에 전체 개수와 Scene별 변경 section, 북마크 폴더, URL, media 개수를 보여줍니다. ID가 겹치면 사본으로 추가, Scene 교체, 건너뛰기 중 하나를 골라야 합니다. 북마크 data는 교체할 때도 새 전용 폴더에 먼저 준비합니다.',
            title: '가져오기 충돌은 어떻게 처리하나요?',
          },
          {
            body: 'Storage와 bookmarks는 필수입니다. tabGroups는 연결을 해제할 때까지 선택 권한으로 유지하고 tabs는 명시적인 열린 그룹 가져오기 동안만 요청한 뒤 회수합니다. Calendar는 구독할 때 입력한 URL의 정확한 HTTPS origin에 대한 선택 권한만 요청합니다.',
            title: '각 Chrome 권한은 왜 필요한가요?',
          },
        ],
        facts: [
          '같은 컴퓨터에서도 Chrome profile이나 extension ID가 다르면 별도 저장 공간을 사용합니다.',
          '북마크 URL이나 media를 제외해도 Scene 설정은 이동하지만 해당 Chrome 폴더 내용이나 media Blob은 이동하지 않습니다. 북마크 URL을 제외하면 새 Scene이나 복사본에서 기기에 종속된 그룹 표시 여부와 순서를 빼고 적용 전에 Relink를 요구합니다. Scene 교체는 대상 Scene의 bookmark collection을 보존합니다. Custom favicon 설정은 포함하지 않습니다.',
          '북마크 URL과 media를 포함하려면 Scene category를 켜야 하며 내려받은 JSON에 민감정보가 들어갈 수 있습니다.',
          '건너뛴 Scene은 바꾸지 않고 profile의 global 언어와 북마크 열기 preference는 가져옵니다.',
          'Scene 교체는 새 폴더와 asset을 준비한 뒤 참조를 바꾸며 기존 북마크 폴더를 직접 덮어쓰지 않습니다.',
          '테마 초기화는 색상만 되돌립니다. 전체 초기화는 확인 내용에 따라 Starlit 설정, Scene record, cache, custom favicon, local media를 지웁니다.',
          '초기화는 Chrome 북마크와 Scene 폴더를 삭제하지 않습니다. 전체 초기화는 Calendar feed URL과 event cache를 지우지만 이미 허용한 host 권한은 Chrome의 확장 프로그램 site access 설정에서 관리합니다.',
        ],
        media: [
          {
            alt: 'Portable profile을 선택하고 Scene, 북마크 URL, uploaded media 내보내기 항목이 보이는 Starlit 설정',
            caption:
              'Portable Profile 내보내기와 가져오기는 별도 설정 탭에 있습니다. 초기화는 일반에 남으며 세 작업 모두 선택하면 즉시 실행됩니다.',
            src: '/assets/guide/settings-portable-profile.jpg',
          },
        ],
        steps: [
          {
            body: '설정 > Portable profile을 엽니다. Scene은 선택한 채 Chrome 북마크 URL과 uploaded media를 JSON에 넣을지 각각 결정합니다.',
            title: '내보내기 category 고르기',
          },
          {
            body: 'URL이나 media를 골랐다면 민감정보 안내를 읽고 V4 JSON을 내보낸 뒤 직접 관리할 수 있는 곳에 보관합니다.',
            title: '내보내기 파일 보호하기',
          },
          {
            body: '이동할 환경에서 가져오기를 선택하고 전체 개수와 Scene diff를 확인합니다. 모든 ID 충돌에서 사본으로 추가, Scene 교체, 건너뛰기 중 하나를 고른 뒤 적용합니다.',
            title: '미리보고 충돌 해결하기',
          },
          {
            body: '탭 그룹과 Calendar 연결은 따로 확인합니다. 먼저 내보낸 뒤 확인창에서 어떤 local Starlit data를 지우는지 확인하고 초기화하세요.',
            title: '연결과 초기화 의도적으로 관리하기',
          },
        ],
        title: 'Portable Profile V4·권한·초기화',
      },
      'bookmarks-folders': {
        callout: {
          body: 'Starlit에서 북마크를 삭제하는 것은 화면에서만 숨기는 작업이 아닙니다. 확인하면 Chrome의 같은 북마크도 삭제되며 설정 취소로 되돌릴 수 없습니다.',
          title: '삭제는 Chrome 데이터도 바꿉니다',
          tone: 'warning',
        },
        description:
          '북마크 내용은 Chrome에서 관리하고, Starlit에서는 그 트리를 그룹·폴더·타일 형태로 탐색합니다.',
        details: [
          {
            body: '북마크 추가, 이름 변경, 이동은 Chrome 북마크 관리자에서 하세요. Starlit은 해당 트리를 보여주는 화면이므로 내용 편집 위치를 Chrome으로 통일하면 이중 관리하지 않아도 됩니다.',
            title: '북마크는 어디에서 정리하나요?',
          },
          {
            body: '가능합니다. 표시 여부, 순서, custom icon은 Starlit 설정입니다. 그룹을 숨기거나 화면 순서를 바꿔도 해당 Chrome 폴더가 이동하거나 삭제되지는 않습니다.',
            title: '폴더를 지우지 않고 그룹만 숨길 수 있나요?',
          },
        ],
        facts: [
          'Chrome 북마크가 원본이며 Starlit은 폴더 구조, 제목, URL을 읽습니다.',
          '폴더 타일을 열면 같은 Starlit 그룹 안에서 이동하고 breadcrumb로 상위 폴더에 돌아갈 수 있습니다.',
          '화면 설정은 Chrome 트리를 바꾸지 않습니다. 확인한 삭제는 북마크를 지우고, 명시적인 탭 그룹 가져오기는 폴더를 추가합니다.',
        ],
        media: [
          {
            alt: 'Chrome 북마크 루트와 폴더 트리가 보이는 Starlit 북마크 그룹 설정',
            caption:
              'Chrome 북마크 트리에서 어느 지점을 Starlit 작업 공간의 루트로 사용할지 선택할 수 있습니다.',
            src: '/assets/guide/settings-bookmark-groups.jpg',
          },
        ],
        steps: [
          {
            body: '북마크나 폴더를 만들고 이름을 바꾸거나 이동·재구성할 때는 Chrome 북마크 관리자를 엽니다.',
            title: 'Chrome에서 원본 편집하기',
          },
          {
            body: 'Chrome에서 변경한 뒤 새 탭을 엽니다. Starlit이 최신 트리를 읽고 선택한 북마크 루트를 그룹으로 표시합니다.',
            title: '작업 공간 새로 읽기',
          },
          {
            body: '폴더 타일을 선택해 같은 그룹 안에서 하위 항목을 탐색합니다. 상위 폴더로 돌아갈 때는 breadcrumb를 사용하세요.',
            title: '중첩 폴더 탐색하기',
          },
          {
            body: '타일 메뉴에서 삭제할 때는 확인 내용을 자세히 읽으세요. 확정하면 Chrome에서도 같은 북마크가 삭제됩니다.',
            title: '의도할 때만 삭제하기',
          },
        ],
        title: '북마크·폴더·원본 데이터',
      },
      'getting-started': {
        callout: {
          body: 'Starlit은 별도의 북마크 보관함을 만들지 않습니다. Chrome 북마크 트리가 계속 원본이고, Starlit은 그 트리를 보여주는 방식만 저장합니다.',
          title: '기존 북마크를 그대로 가져오세요',
          tone: 'info',
        },
        description:
          '새 탭 작업 공간, 폴더 탐색, Chrome이 제공하는 내용과 Starlit이 저장하는 화면 설정의 차이를 알아봅니다.',
        details: [
          {
            body: 'Starlit이 Chrome 새 탭 화면을 대체합니다. 북마크 그룹을 바로 보여주고 그 주변에 폴더 탐색, 레이아웃, 테마, 탭 그룹 작업을 더합니다.',
            title: '설치하면 무엇이 달라지나요?',
          },
          {
            body: 'Chrome에서 북마크를 편집한 뒤 새 탭을 한 번 더 여세요. 새 페이지는 현재 북마크 트리를 읽지만 이미 열려 있던 페이지에는 이전 snapshot이 남아 있을 수 있습니다.',
            title: 'Chrome에서 바꾼 내용이 바로 보이지 않아요',
          },
        ],
        facts: [
          '선택한 루트 바로 아래 북마크는 루트 그룹에 모이고, 바로 아래의 각 폴더는 추가 그룹으로 표시됩니다.',
          '폴더 타일을 선택하면 같은 그룹 안에서 이동하고 breadcrumb에 현재 경로가 표시됩니다.',
          '표시 여부, 순서, 레이아웃, 색상, icon은 Chrome 북마크 편집이 아니라 Starlit 설정입니다.',
        ],
        media: [
          {
            alt: '북마크 breadcrumb, 개발 그룹, 폴더와 북마크 타일이 보이는 Starlit 새 탭',
            caption:
              'Chrome 북마크 폴더가 폴더와 북마크 타일을 탐색할 수 있는 하나의 그룹으로 표시됩니다.',
            src: '/assets/guide/new-tab-overview.jpg',
          },
        ],
        steps: [
          {
            body: 'Chrome 새 탭을 엽니다. Starlit이 선택한 루트 바로 아래 북마크를 루트 그룹에 모으고, 바로 아래의 각 폴더를 추가 그룹으로 보여줍니다.',
            title: '작업 공간 열기',
          },
          {
            body: '북마크를 선택해 이동하거나 폴더 타일을 골라 현재 그룹 안에서 더 깊은 폴더를 탐색합니다.',
            title: '북마크와 폴더 탐색하기',
          },
          {
            body: '오른쪽 아래 설정 버튼을 누르거나 새 탭의 빈 공간을 우클릭하면 일반, 외형, 위젯, 배치, CSS, 북마크 그룹, Scene, Portable profile 화면을 열 수 있습니다.',
            title: '설정 찾기',
          },
          {
            body: '설정 변경은 미리보기로 시도한 뒤 저장을 눌러 반영합니다. Draft를 버리려면 취소를 선택하세요.',
            title: '미리 본 뒤 저장하기',
          },
        ],
        title: '시작하기',
      },
      'group-layout': {
        callout: {
          body: '그룹 선택, 순서, 레이아웃은 화면 표시 설정입니다. 이에 대응하는 Chrome 폴더를 이동하거나 이름을 바꾸거나 삭제하지 않습니다.',
          title: '레이아웃과 북마크 내용은 별개입니다',
          tone: 'info',
        },
        description:
          '북마크 루트와 표시할 그룹을 고르고 페이지형·펼치기형, 열 개수, 간격, 여백을 사용하는 화면에 맞게 조절합니다.',
        details: [
          {
            body: '페이지형은 그룹을 차례로 간결하게 보여줍니다. 펼치기형은 하나의 스크롤 화면에 그룹을 펼치고 개별 그룹을 접을 수 있습니다. 한 번에 보고 싶은 그룹 수에 맞춰 고르세요.',
            title: '페이지형과 펼치기형은 어떻게 다른가요?',
          },
          {
            body: '해당 폴더가 선택한 루트 아래에 있는지, 설정 > 북마크 그룹에서 표시하도록 설정했는지 확인하세요. 최근 Chrome 북마크 트리를 바꿨다면 새 탭도 다시 열어야 합니다.',
            title: '폴더가 그룹으로 보이지 않아요',
          },
        ],
        facts: [
          '북마크 그룹 화면에서 Starlit이 사용할 루트, 표시 여부, 같은 계층의 순서를 정합니다.',
          '배치 미리보기는 실제 bookmark renderer를 읽기 전용 축소 화면으로 사용합니다.',
          '열 개수, 간격, 여백, 북마크 펼치기, icon 방향은 Starlit 설정으로 저장됩니다.',
        ],
        media: [
          {
            alt: '축소 미리보기, 펼치기 설정, 열 개수와 간격 slider가 보이는 Starlit 배치 설정',
            caption:
              '배치 미리보기를 보며 그룹 밀도, icon 방향, 열, 간격, 여백을 조절합니다.',
            src: '/assets/guide/settings-layout.jpg',
          },
        ],
        steps: [
          {
            body: '설정 > 북마크 그룹을 열고 작업 공간의 루트로 사용할 Chrome 북마크 폴더를 선택합니다.',
            title: '루트 고르기',
          },
          {
            body: '보이게 할 그룹을 선택하고 제공되는 순서 조절 기능으로 같은 계층의 폴더를 원하는 차례에 놓습니다.',
            title: '그룹 선택하고 정렬하기',
          },
          {
            body: '설정 > 배치를 열고 간결한 페이지형 또는 스크롤하는 펼치기형을 고르고 북마크 펼치기와 icon 방향을 정합니다.',
            title: '보기 방식 선택하기',
          },
          {
            body: '미리보기를 보며 열, 간격, 여백을 조절한 뒤 저장을 눌러 전체 draft를 반영합니다.',
            title: '간격 조절하고 저장하기',
          },
        ],
        title: '그룹 표시·순서·레이아웃',
      },
      'tab-groups': {
        callout: {
          body: '가져오기는 열린 탭 그룹을 새 Chrome 북마크 폴더로 한 번 복사합니다. 폴더 열기는 새 live tab group을 한 번 만듭니다. 어느 방향도 계속 동기화하지 않습니다.',
          title: '양쪽 모두 명시적인 일회성 작업입니다',
          tone: 'warning',
        },
        description:
          '현재 열린 Chrome 탭 그룹을 북마크 폴더로 복사하거나, 폴더 바로 아래 북마크를 새 Chrome live tab group으로 엽니다.',
        details: [
          {
            body: 'Chrome extension API는 현재 열린 그룹만 제공하고 닫힌 Saved Tab Groups는 제공하지 않습니다. 저장된 그룹을 Chrome에서 먼저 연 뒤 가져오기 화면을 다시 여세요.',
            title: '저장된 탭 그룹이 가져오기 목록에 없는 이유는 무엇인가요?',
          },
          {
            body: '현재 폴더 바로 아래 북마크만 엽니다. 하위 폴더를 펼치지 않고 지원하지 않는 URL은 건너뜁니다. 같은 제목의 그룹이 있어도 별도의 새 그룹을 만듭니다.',
            title: '폴더 제목을 선택하면 무엇이 열리나요?',
          },
        ],
        facts: [
          '가져오기 화면에는 그 시점에 Chrome에서 열려 있는 탭 그룹만 표시할 수 있습니다.',
          '가져온 탭은 새 Chrome 북마크 폴더가 되며 원본 탭 그룹과 연결된 채 유지되지 않습니다.',
          '현재 폴더 제목을 선택하면 바로 아래 북마크를 같은 제목의 새 live group으로 엽니다. 계속 남기려면 Chrome에서 저장하세요.',
          'tabs 권한은 가져오기 중에만 임시로 사용하고 tabGroups 권한은 설정에서 연결을 해제할 때까지 유지합니다.',
        ],
        media: [
          {
            alt: '개발 북마크 폴더를 Chrome 탭 그룹으로 여는 Starlit 확인 dialog',
            caption:
              '현재 폴더 제목을 선택하면 Starlit이 새 live tab group을 열기 전에 북마크 개수를 확인할 수 있습니다.',
            src: '/assets/guide/open-tab-group-confirm.jpg',
          },
        ],
        steps: [
          {
            body: '가져올 대상이 Saved Tab Group이라면 Chrome에서 열어 extension API가 볼 수 있는 현재 열린 그룹으로 만듭니다.',
            title: '원본 그룹 열기',
          },
          {
            body: '설정 > 북마크 그룹에서 Chrome 탭 그룹 가져오기를 선택하고 요청되는 선택 권한을 허용합니다.',
            title: '가져오기 시작하기',
          },
          {
            body: '열린 그룹과 저장할 북마크 폴더를 선택한 뒤 가져옵니다. 선택한 각 그룹이 북마크로 한 번 복사됩니다.',
            title: '그룹과 저장 위치 고르기',
          },
          {
            body: '반대 방향으로 열려면 현재 폴더 제목을 선택하고 확인하세요. 바로 아래 북마크가 새 live group으로 열리며, 필요하면 Chrome에서 저장합니다.',
            title: '폴더를 live tab으로 다시 열기',
          },
        ],
        title: 'Chrome 탭 그룹 가져오기·다시 열기',
      },
      troubleshooting: {
        callout: {
          body: '데이터가 사라진 것처럼 보일 때 전체 초기화부터 하지 마세요. 원하는 설정이 남아 있는 설치에서 Portable Profile을 먼저 내보내고, 복구에 필요한 경우에만 북마크 URL이나 미디어를 포함하세요. 그다음 Chrome profile, extension ID, 권한, resource 참조를 확인합니다.',
          title: '복구 가능한 사본부터 지키세요',
          tone: 'warning',
        },
        description:
          'Scene이 적용되지 않거나 북마크·미디어가 사라졌거나 Calendar 구독과 화면 갱신에 문제가 있을 때, 초기화보다 먼저 데이터 소유권과 저장 공간 경계를 확인합니다.',
        details: [
          {
            body: '같은 Store 설치의 정상 업데이트는 같은 extension ID를 유지하므로 저장 공간도 보존합니다. Store build, unpacked build, 다른 Chrome profile, 다른 경로에서 다시 불러온 unpacked build는 별도 저장 공간을 사용할 수 있습니다. 이전 설치에서 내보내고 새 설치에서 가져오세요.',
            title: '다른 build를 설치한 뒤 설정이 사라진 것처럼 보여요',
          },
          {
            body: '북마크 폴더 참조나 필요한 local asset이 없으면 Scene을 적용하지 않습니다. 폴더나 asset을 Relink하거나, recovery snapshot이 빠진 참조를 모두 채울 수 있을 때만 Restore하세요. 다른 Scene을 적용해도 Chrome 북마크 트리를 복구하거나 덮어쓰지 않습니다.',
            title: 'Scene이 적용되지 않아요',
          },
          {
            body: 'Calendar는 자동으로 구독되지 않습니다. 위젯 설정에서 유효한 HTTPS 또는 webcal URL을 입력하고 해당 origin의 접근을 허용하세요. 제공자가 iCalendar 대신 로그인 page나 HTML을 반환하거나 URL이 만료되면 새 feed URL이 필요합니다.',
            title: 'Calendar 구독 또는 feed 오류가 보여요',
          },
          {
            body: 'Scene 설정과 업로드한 미디어는 한 extension profile에 있으며 Chrome Sync로 다른 기기에 전달되지 않습니다. Scene category와 필요한 경우 uploaded media를 켜서 Portable Profile을 내보낸 뒤 대상 profile에서 가져오세요. URL 배경은 제공처에 계속 접속할 수 있어야 합니다.',
            title: '다른 기기에서 미디어가 보이지 않아요',
          },
        ],
        facts: [
          '새 탭을 다시 열면 Chrome 북마크를 새로 읽으므로 오래된 화면 snapshot 문제를 해결할 수 있습니다.',
          '같은 ID의 extension update는 Starlit 저장 공간을 유지하지만 다른 ID와 Chrome profile은 자동으로 공유하지 않습니다.',
          '전체 초기화는 Starlit 설정과 local media를 지우지만 보존된 Chrome 북마크 폴더는 삭제하지 않습니다.',
          'Portable Profile은 명시적으로 켜지 않으면 북마크 URL과 uploaded media를 포함하지 않습니다.',
        ],
        media: [],
        steps: [
          {
            body: '무엇이 보이지 않는지 먼저 구분합니다. Scene 북마크 폴더, local asset, 열린 탭 그룹, Calendar feed, 화면 설정 중 어디에 해당하는지 확인하세요.',
            title: '데이터 소유자 확인하기',
          },
          {
            body: '북마크 변경은 새 탭을 다시 엽니다. 탭 그룹은 Chrome에서 해당 그룹을 열고 설정 > 북마크 그룹의 연결 상태를 확인합니다.',
            title: '올바른 원본 새로 읽기',
          },
          {
            body: '예상한 Chrome profile과 Starlit 설치를 사용 중인지 확인합니다. extension ID가 다르면 sync, local, IndexedDB 저장 공간도 나뉩니다.',
            title: '저장 공간 경계 확인하기',
          },
          {
            body: '복구 가능한 Scene을 내보냅니다. Calendar feed URL은 내보내지 않으므로 따로 보관하세요. 대상 profile에 필요한 경우에만 북마크 URL이나 uploaded media를 켜고, 그다음 Relink, Restore, URL 재구독, 선택 초기화 또는 전체 초기화를 시도합니다.',
            title: '복구·초기화 전에 내보내기',
          },
        ],
        title: '문제 해결',
      },
    },
    starlitData: {
      items: [
        'Scene record: 화면 모양, layout, 북마크 폴더 참조, canvas 위젯 순서, 이미지 위젯 media 참조, 시계·Calendar 위젯 설정',
        'Global 언어, 북마크 열기 방식, favicon override, UI cache',
        'Extension profile에 local로 저장한 uploaded media와 shared Scene asset',
        '각 Calendar 위젯에 local로 저장한 feed URL과 raw URL을 드러내지 않는 key로 현재 session에 최대 5분 동안 cache한 event 결과',
      ],
      title: 'Starlit은 Scene과 기기별 설정을 저장합니다',
    },
    stepsTitle: '작업 순서',
    support: {
      description:
        '이 가이드로 해결되지 않으면 Starlit 홈페이지에서 최신 정보를 확인하거나, 재현 방법을 정리해 공개 issue tracker에 제보해 주세요.',
      homepage: 'Starlit 홈페이지 열기',
      issues: '문제 제보하기',
      title: '도움이 더 필요한가요?',
    },
    title: 'Starlit 사용 가이드',
  },
};

export function getGuideCopy(locale: Locale): GuideCopy {
  return COPY[locale];
}
