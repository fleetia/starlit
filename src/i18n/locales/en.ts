import type { Translations } from '../types';

const en: Translations = {
  // IconButton
  'iconButton.add': 'Add',

  // NavigationButton
  'navigation.previous': 'Previous',
  'navigation.next': 'Next',
  'navigation.path': 'path',

  // CardPagination
  'pagination.previousPage': 'Previous page',
  'pagination.nextPage': 'Next page',
  'pagination.pages': 'pages',

  // App
  'newtab.options': 'Options',
  'newtab.empty': 'No bookmark groups are available.',
  'newtab.scene': 'Current Scene',
  'background.motion.play': 'Play background motion',
  'background.motion.pause': 'Pause background motion',
  'contextMenu.label': 'Bookmark actions',
  'contextMenu.changeIcon': 'Change icon',
  'contextMenu.resetIcon': 'Reset icon',
  'contextMenu.delete': 'Delete bookmark',
  'contextMenu.deleteConfirmTitle': 'Delete from Chrome bookmarks?',
  'contextMenu.deleteConfirmDescription':
    'This bookmark will be removed from both Starlit and your Chrome bookmarks.',
  'contextMenu.deleteConfirmAction': 'Delete from Chrome',
  'contextMenu.deleteFailed':
    'We could not delete this Chrome bookmark. Please try again.',

  // OptionsSidebar - Primary tabs
  'sidebar.tab.appearance': 'Appearance',
  'sidebar.tab.layout': 'Layout',
  'sidebar.tab.css': 'CSS',
  'sidebar.tab.groups': 'Bookmark groups',
  'sidebar.tab.general': 'General',
  'sidebar.tab.scene': 'Scene',
  'sidebar.tab.widgets': 'Widgets',
  'sidebar.support.title': 'Support Starlit',
  'sidebar.support.description':
    'If Starlit makes your day brighter, help keep it glowing.',
  'sidebar.support.fairy': 'Support on Fairy',

  // OptionsSidebar - Appearance sub tabs
  'sidebar.appearance.background': 'Background',
  'sidebar.appearance.container': 'Container',
  'sidebar.appearance.bookmark': 'Bookmark',
  'sidebar.appearance.folder': 'Folder',

  // OptionsSidebar - Background section
  'sidebar.background.image': 'Background media',
  'sidebar.background.source': 'Background source',
  'sidebar.background.sourceDescription':
    'URLs sync across devices. Uploaded files are stored only on this device.',
  'sidebar.background.sourceUrl': 'URL',
  'sidebar.background.sourceFile': 'Device file',
  'sidebar.background.url': 'Image or video URL',
  'sidebar.background.urlDescription':
    'Enter a public image, GIF, or video URL. The address is synced when you save.',
  'sidebar.background.urlPlaceholder': 'Enter URL',
  'sidebar.background.fileUpload': 'Upload file',
  'sidebar.background.fileDescription':
    'After you choose a file, saving converts images to WebP and GIFs to WebM; videos are stored unchanged. Uploaded files stay only on this device.',
  'sidebar.background.fileSelect': 'Choose file',
  'sidebar.background.remove': 'Remove',
  'sidebar.background.current': 'Current background',
  'sidebar.background.selected': 'Background to save',
  'sidebar.background.pendingRemoval':
    'The current background will be removed when you save.',
  'sidebar.background.imageType': 'Image',
  'sidebar.background.video': 'Video',
  'sidebar.background.box': 'Background box',
  'sidebar.background.color': 'Color',
  'sidebar.background.processing': 'Processing and saving background file',
  'sidebar.background.preview': 'Background preview',
  'sidebar.tokens.surfaceTitle': 'Starlit surface',
  'sidebar.tokens.surface': 'Surface',
  'sidebar.tokens.muted': 'Muted',
  'sidebar.tokens.chromeTitle': 'Starlit chrome',
  'sidebar.tokens.accent': 'Accent',
  'sidebar.tokens.accentText': 'Accent text',
  'sidebar.tokens.border': 'Border',
  'sidebar.tokens.bookmarkTitle': 'Bookmark palette',
  'sidebar.colorAlpha': 'Alpha',
  'sidebar.colorSwatch': 'color swatch',

  // OptionsSidebar - Container section
  'sidebar.container.title': 'Title',
  'sidebar.container.titleBackground': 'Title background',
  'sidebar.container.text': 'Text',
  'sidebar.container.size': 'Size',
  'sidebar.container.hover': 'Hover',
  'sidebar.container.border': 'Border',
  'sidebar.container.borderColor': 'Border color',
  'sidebar.container.borderWidth': 'Width',
  'sidebar.container.subtitle': 'Subtitle',
  'sidebar.container.containerBox': 'Container box',
  'sidebar.container.borderRadius': 'Border radius',
  'sidebar.container.preview': 'Container preview',
  'sidebar.container.mockupTitle': 'Title',
  'sidebar.container.mockupSubtitle': 'Subtitle / Path',

  // OptionsSidebar - Bookmark section
  'sidebar.bookmark.horizontalIcon': 'Use horizontal icons',
  'sidebar.bookmark.scale': 'Scale (em)',
  'sidebar.bookmark.horizontalSize': 'Horizontal size',
  'sidebar.bookmark.verticalSize': 'Vertical size',
  'sidebar.bookmark.iconSize': 'Icon size',
  'sidebar.bookmark.borderRadius': 'Border radius',
  'sidebar.bookmark.iconBorderRadius': 'Icon border radius',
  'sidebar.bookmark.boxColor': 'Box color',
  'sidebar.bookmark.borderColor': 'Card border color',
  'sidebar.bookmark.text': 'Text',
  'sidebar.bookmark.hoverBackground': 'Hover background',
  'sidebar.bookmark.hoverText': 'Hover text',
  'sidebar.bookmark.preview': 'Bookmark preview',
  'sidebar.bookmark.mockupName': 'Bookmark',

  // OptionsSidebar - Folder section
  'sidebar.folder.horizontalIcon': 'Use horizontal icons',
  'sidebar.folder.background': 'Background',
  'sidebar.folder.iconBackground': 'Icon background',
  'sidebar.folder.iconColor': 'Icon color',
  'sidebar.folder.text': 'Text',
  'sidebar.folder.border': 'Border',
  'sidebar.folder.preview': 'Folder preview',
  'sidebar.folder.mockupName': 'Folder',

  // OptionsSidebar - Layout section
  'sidebar.layout.expandBookmarks': 'Expand bookmarks',
  'sidebar.layout.horizontalIcon': 'Use horizontal icons',
  'sidebar.layout.expandLayout': 'Expand layout',
  'sidebar.layout.scrollLayout': 'Scroll layout',
  'sidebar.layout.cardColumns': 'Card columns',
  'sidebar.layout.horizontalSize': 'Horizontal size',
  'sidebar.layout.cardInnerColumns': 'Inner columns',
  'sidebar.layout.horizontalColumnCount': 'Horizontal columns',
  'sidebar.layout.cardGap': 'Card gap',
  'sidebar.layout.bookmarkGap': 'Bookmark gap',
  'sidebar.layout.count': 'Count',
  'sidebar.layout.columnCount': 'Columns',
  'sidebar.layout.rowCount': 'Rows',
  'sidebar.layout.gap': 'Gap',
  'sidebar.layout.positionMargin': 'Position + Margin',
  'sidebar.layout.preview': 'Layout preview',
  'sidebar.preview.note':
    'Uses the actual bookmark renderer in a read-only scaled view.',

  // OptionsSidebar - CSS section
  'sidebar.css.title': 'Custom CSS',
  'sidebar.css.help':
    'Use #root [data-starlit-part="..."] for public selectors, ^= for a part family, and data-kind, data-layout, or data-direction to narrow state.',
  'sidebar.css.placeholder':
    '/* Stable parts: root, main, background-media, paged-groups,\n' +
    '   expanded-groups, group-rail, group-navigation, settings-trigger,\n' +
    '   bookmark-group, bookmark-group-header, bookmark-breadcrumb,\n' +
    '   bookmark-route, bookmark-grid, bookmark-tile, bookmark-tile-icon,\n' +
    '   bookmark-tile-favicon, bookmark-tile-marker, bookmark-tile-label,\n' +
    '   pagination, pagination-control, pagination-status */\n\n' +
    '/* Target one part. #root overrides class-based app styles. */\n' +
    '#root [data-starlit-part="bookmark-tile-label"] {\n' +
    '  font-weight: 700;\n' +
    '}\n\n' +
    '/* Narrow by state: data-kind, data-layout, or data-direction. */\n' +
    '#root [data-starlit-part="bookmark-tile"][data-kind="folder"] {\n' +
    '  border-style: solid;\n' +
    '}\n\n' +
    '/* ^= targets a part family such as bookmark-tile and bookmark-tile-*. */\n' +
    '#root [data-starlit-part^="bookmark-tile"] {\n' +
    '}',

  // OptionsSidebar - General section
  'sidebar.general.language': 'Language',
  'sidebar.general.fontFamily': 'Font',
  'sidebar.general.fontDescription':
    'IBM Plex Sans follows the selected language. System uses your browser and operating system defaults.',
  'sidebar.general.fontIbmPlexSans': 'IBM Plex Sans',
  'sidebar.general.fontSystem': 'System font',
  'sidebar.general.openInNewTab': 'Open in new tab by default',
  'sidebar.general.guide': 'User guide',
  'sidebar.general.guideDescription':
    'Read about bookmarks, tab groups, layouts, and permissions on a separate page.',
  'sidebar.general.openGuide': 'Open the full user guide',
  'sidebar.general.exportImport': 'Export / Import',
  'sidebar.general.export': 'Export',
  'sidebar.general.import': 'Import',
  'sidebar.general.reset': 'Reset',
  'sidebar.general.resetTheme': 'Reset to default theme',
  'sidebar.general.resetAll': 'Reset all',
  'sidebar.general.resetAllConfirmTitle': 'Reset all Starlit data?',
  'sidebar.general.resetAllConfirmDescription':
    'This permanently removes Starlit settings, Scenes, caches, custom favicons, tutorial and display state, and local media. Chrome bookmarks, Scene folders, and granted optional permissions remain.',
  'sidebar.general.resetAllConfirmAction': 'Permanently reset',
  'sidebar.general.credits': 'Credits',
  'sidebar.general.credits.dev': 'Dev & Design',
  'sidebar.general.credits.planning': 'Planning & QA',
  'sidebar.general.credits.github': 'GitHub',
  'sidebar.general.credits.readme': 'README',
  'sidebar.general.credits.postype': 'Postype',
  'sidebar.general.credits.bugReport': 'Bug Report',
  'sidebar.general.credits.homepage': 'Homepage',

  // OptionsSidebar - Footer / Confirm
  'sidebar.cancel': 'Cancel',
  'sidebar.save': 'Save',
  'sidebar.confirm.unsavedChanges': 'You have unsaved changes. Close anyway?',
  'sidebar.confirm.yes': 'Yes',
  'sidebar.confirm.no': 'No',

  // Canvas layers
  'layers.title': 'Canvas order',
  'layers.description':
    'Arrange images, calendars, clocks, and bookmarks. The top row is closest to you.',
  'layers.add': 'Add images',
  'layers.processing': 'Processing image widgets',
  'layers.empty': 'No widgets have been added.',
  'layers.bookmarks': 'Bookmarks',
  'layers.bookmarksDescription': 'The complete bookmark surface',
  'layers.front': 'Front',
  'layers.back': 'Back',
  'layers.frontToBackDescription':
    'Canvas items are listed from front to back. Move any item to control what appears above or below bookmarks.',
  'layers.layerList': 'Canvas item order',
  'layers.moveForward': 'Move forward',
  'layers.moveBackward': 'Move backward',
  'layers.remove': 'Remove image',
  'layers.dragToReorder': 'Drag to reorder canvas items',
  'layers.editPositions': 'Edit positions',
  'layers.fileDescription':
    'Static images become WebP, GIFs become WebM, and playable videos are accepted. Uploaded files stay on this device.',
  'layers.editor.title': 'Edit image widget positions',
  'layers.editor.done': 'Back to settings',
  'layers.editor.image': 'Image',
  'layers.editor.noImageSelected': 'No image selected',
  'layers.editor.selectedCount': 'selected',
  'layers.editor.selectedActions': 'Selected image actions',
  'layers.editor.noSelection': 'No images selected.',
  'layers.editor.anchor': 'Screen position',
  'layers.editor.rotation': 'Rotation',
  'layers.editor.zoom': 'Zoom',
  'layers.editor.empty': 'Add an image before editing positions.',
  'layers.editor.resetPosition': 'Reset position',
  'layers.editor.instructions':
    'Drag the image or use Arrow keys to move it. Hold Shift to move 10 pixels.',
  'layers.editor.moveToolbar': 'Move toolbar',
  'layers.editor.viewportPreview': 'Screen position preview',
  'layers.editor.viewportSize': 'Preview viewport size',
  'layers.editor.viewportWide': 'Wide',
  'layers.editor.viewportNarrow': 'Narrow',
  'layers.anchor.topLeft': 'Top left',
  'layers.anchor.topCenter': 'Top center',
  'layers.anchor.topRight': 'Top right',
  'layers.anchor.centerLeft': 'Center left',
  'layers.anchor.centerCenter': 'Center',
  'layers.anchor.centerRight': 'Center right',
  'layers.anchor.bottomLeft': 'Bottom left',
  'layers.anchor.bottomCenter': 'Bottom center',
  'layers.anchor.bottomRight': 'Bottom right',
  'layers.action.hide': 'Hide',
  'layers.action.show': 'Show',
  'layers.action.edit': 'Edit',
  'layers.action.lock': 'Lock',
  'layers.action.unlock': 'Unlock',
  'layers.action.duplicate': 'Duplicate',
  'layers.action.replace': 'Replace',
  'layers.action.menu': 'Image widget actions',
  'layers.action.more': 'More actions',
  'layers.action.play': 'Play for this session',
  'layers.action.pause': 'Pause for this session',
  'layers.action.bringToFront': 'Bring to front',
  'layers.action.sendToBack': 'Send to back',
  'layers.action.group': 'Group',
  'layers.action.ungroup': 'Ungroup',
  'layers.playbackRate': 'Playback rate',
  'layers.playbackActiveTab': 'Play in active tab only',
  'layers.playbackAlways': 'Always play',
  'layers.screenPosition': 'Screen position',
  'layers.error': 'The image widget action could not be completed.',

  // Widgets
  'widgets.sceneRequired':
    'Save the current setup as a Scene to add Calendar or Clock widgets.',
  'widgets.description':
    'Add any number of images, calendars, or clocks to your new tab.',
  'widgets.image': 'Image',
  'widgets.chooseTitle': 'Choose a widget',
  'widgets.clock': 'Clock',
  'widgets.clockDescription':
    'Display digital or analog time in an independent format and time zone.',
  'widgets.calendar': 'Calendar',
  'widgets.calendarDescription':
    'Subscribe to an iCalendar URL and show events from the next seven days.',
  'widgets.add': 'Add widget',
  'widgets.remove': 'Remove widget',
  'widgets.configure': 'Configure widget',
  'widgets.appearance': 'Clock style',
  'widgets.digital': 'Digital',
  'widgets.analog': 'Analog',
  'widgets.format': 'Time format',
  'widgets.formatDescription': 'Use HH, H, hh, h, mm, m, ss, s, and a tokens.',
  'widgets.invalidFormat': 'Enter a valid time format.',
  'widgets.timeZone': 'Time zone',
  'widgets.timeZoneDescription':
    'Leave blank for local time, or enter an IANA zone such as Asia/Seoul.',
  'widgets.invalidTimeZone': 'Enter a valid IANA time zone.',
  'widgets.showSecondHand': 'Show second hand',
  'widgets.feedUrl': 'Calendar URL',
  'widgets.feedUrlDescription':
    'HTTPS and webcal iCalendar subscription URLs are supported. The URL stays on this device.',
  'widgets.invalidFeedUrl': 'Enter a valid HTTPS or webcal URL.',
  'widgets.subscribe': 'Allow and subscribe',
  'widgets.maxEvents': 'Maximum events',
  'widgets.showAllDay': 'Show all-day events',
  'widgets.offsetX': 'Horizontal offset',
  'widgets.offsetY': 'Vertical offset',
  'widgets.width': 'Width',
  'widgets.height': 'Height',
  'widgets.calendarConsent':
    'Starlit requests access only to the exact origin you entered. Calendar data is never sent to a Starlit server.',
  'widgets.configureInSettings':
    "Configure or subscribe to a Calendar URL in this widget's settings.",
  'widgets.refresh': 'Refresh',
  'widgets.empty': 'No events to show.',
  'widgets.loading': 'Loading events.',
  'widgets.error': 'Events could not be loaded.',

  // Command palette
  'palette.title': 'Search Starlit',
  'palette.inputLabel': 'Search bookmarks, groups, Scenes, or settings',
  'palette.placeholder': 'Type to search',
  'palette.empty': 'No matching items.',
  'palette.error': 'The command could not be completed.',
  'palette.hint': '↑↓ navigate · Enter open · Esc close',
  'palette.category.bookmark': 'Bookmark',
  'palette.category.group': 'Group',
  'palette.category.scene': 'Scene',
  'palette.category.settings': 'Settings',

  // Scene
  'scene.currentSetup': 'Current setup',
  'scene.none': 'No saved Scene',
  'scene.create': 'Save current setup as Scene',
  'scene.saveAsNew': 'Save as new Scene',
  'scene.name': 'Scene name',
  'scene.previewTitle': 'Copy Chrome bookmarks?',
  'scene.previewDescription':
    'Your existing tree stays untouched. A dedicated folder is created under Starlit Scenes.',
  'scene.previewCounts': 'Folders and URLs to copy',
  'scene.folders': 'Folders',
  'scene.urls': 'URLs',
  'scene.active': 'Current Scene',
  'scene.destination': 'Create the dedicated folder in',
  'scene.otherBookmarks': 'Other bookmarks',
  'scene.confirmCreate': 'Confirm and create Scene',
  'scene.applyPreviewTitle': 'Apply this Scene?',
  'scene.applyPreviewDescription':
    'Appearance, layout, widgets, and the bookmark folder will switch to this Scene.',
  'scene.confirmApply': 'Apply Scene',
  'scene.switch': 'Apply Scene',
  'scene.delete': 'Delete Scene',
  'scene.deleteFolder': 'Also delete its Chrome folder',
  'scene.keepFolder': 'Keep Chrome folder',
  'scene.deleteMediaNotice':
    'Local media used only by this Scene will be removed. Media still used by another Scene is kept.',
  'scene.relink': 'Relink',
  'scene.relinkAsset': 'Replacement media',
  'scene.relinkFolder': 'Replacement bookmark folder',
  'scene.restore': 'Restore recovery snapshot',
  'scene.missingResources':
    'This Scene cannot be applied because a bookmark folder or media file is missing.',
  'scene.nameRequired': 'Enter a Scene name.',
  'scene.error': 'The Scene action could not be completed.',

  // Portable profile
  'portable.title': 'Portable profile',
  'portable.scenes': 'Scenes, appearance, and layout',
  'portable.sceneScopeNote':
    'Without bookmark URLs, new or copied Scenes require Relink and omit device-bound group visibility and order. Custom favicons are excluded.',
  'portable.globalScopeNote':
    'Language and bookmark-opening preferences are always included.',
  'portable.bookmarks': 'Chrome bookmark URLs',
  'portable.media': 'Uploaded media',
  'portable.sensitiveWarning':
    'URLs or media can contain private information. Review the file before sharing it.',
  'portable.preview': 'Import preview',
  'portable.changedSections': 'Changed sections',
  'portable.addCopy': 'Add as copy',
  'portable.replace': 'Replace Scene',
  'portable.skip': 'Skip',
  'portable.skipAllNote':
    'Skipped Scenes stay unchanged. The global language and bookmark-opening preference shown above are still imported.',
  'portable.error': 'The Portable Profile action could not be completed.',

  // BookmarkTreeSelector
  'groups.rootGroup': 'Root group',
  'groups.allTopLevel': 'All (top level)',
  'groups.hide': 'Hide',
  'groups.show': 'Show',
  'groups.dragToReorder': 'Drag to reorder',
  'groups.connectionTitle': 'Uses Chrome bookmarks',
  'groups.connectionDescription':
    'Starlit displays your Chrome bookmark folders. Changes made in Chrome appear when you open a new tab again.',
  'groups.localPreferences':
    'Root selection, hidden groups, custom order, and icons only affect Starlit.',
  'groups.openManager': 'Open Chrome bookmarks',
  'groups.openManagerFailed':
    'We could not open the Chrome bookmark manager. Please try again.',
  'groups.guideSummary': 'How it works',
  'groups.guideChrome':
    'Add, rename, or move bookmarks in Chrome. Starlit picks up those changes the next time you open a new tab.',
  'groups.guideStarlit':
    'Hiding or reordering groups and changing icons does not change Chrome bookmarks.',
  'groups.guideDelete':
    'Deleting a bookmark in Starlit also deletes it from Chrome bookmarks.',

  // Chrome Tab Groups
  'tabGroups.openAction': 'Open this folder as a tab group',
  'tabGroups.activationFailed':
    'The tab group opened, but its first tab could not be activated.',
  'tabGroups.empty': 'This folder has no direct bookmarks to open.',
  'tabGroups.failed': 'The tab group could not be opened.',
  'tabGroups.noValidBookmarks':
    'This folder has no bookmarks with supported URLs.',
  'tabGroups.openedSuffix': ' bookmarks opened as a tab group.',
  'tabGroups.skippedSuffix': ' could not be opened.',
  'tabGroups.opening': 'Opening the tab group.',
  'tabGroups.permissionDenied': 'Tab group permission was not granted.',
  'tabGroups.rollbackIncompleteSuffix': ' tabs may still be open.',
  'tabGroups.openConfirm': 'Open tab group',
  'tabGroups.openConfirmTitle': 'Open bookmarks as a tab group?',
  'tabGroups.singleTabCountSuffix': ' tab.',
  'tabGroups.tabCountSuffix': ' tabs.',
  'tabGroups.openConfirmDescription':
    'These bookmarks will open in a new tab group with the same title.',

  // PopupApp
  'popup.active': 'Active',
  'popup.inactive': 'Inactive',
  'popup.deactivate': 'Deactivate',
  'popup.activate': 'Activate',
  'popup.description': 'You can use Starlit features in the current tab.',
  'popup.settings': 'Settings',

  // ConfirmDialog
  'confirmDialog.confirm': 'Confirm',
  'confirmDialog.cancel': 'Cancel',

  // Tree
  'tree.collapse': 'Collapse',
  'tree.expand': 'Expand',
  'tree.hide': 'Hide',
  'tree.show': 'Show',
  'tree.dragToReorder': 'Drag to reorder',

  // Modal
  'modal.close': 'Close',

  // PositionGrid
  'positionGrid.group': 'Position grid',
  'positionGrid.margin.top': 'Top margin',
  'positionGrid.margin.bottom': 'Bottom margin',
  'positionGrid.margin.left': 'Left margin',
  'positionGrid.margin.right': 'Right margin',

  // Content script
  'content.activated': 'Starlit activated',
};

export default en;
