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

  // NewTabApp
  'newtab.options': 'Options',
  'newtab.empty': 'No bookmark groups are available.',
  'contextMenu.label': 'Bookmark actions',
  'contextMenu.changeIcon': 'Change icon',
  'contextMenu.resetIcon': 'Reset icon',
  'contextMenu.delete': 'Delete bookmark',

  // OptionsSidebar - Primary tabs
  'sidebar.tab.appearance': 'Appearance',
  'sidebar.tab.layout': 'Layout',
  'sidebar.tab.css': 'CSS',
  'sidebar.tab.groups': 'Groups',
  'sidebar.tab.general': 'General',
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
  'sidebar.background.image': 'Background image',
  'sidebar.background.urlPlaceholder': 'Enter URL',
  'sidebar.background.apply': 'Apply',
  'sidebar.background.fileUpload': 'Upload file',
  'sidebar.background.remove': 'Remove',
  'sidebar.background.box': 'Background box',
  'sidebar.background.color': 'Color',
  'sidebar.background.processing': 'Processing',
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
  'sidebar.general.openInNewTab': 'Open in new tab by default',
  'sidebar.general.exportImport': 'Export / Import',
  'sidebar.general.export': 'Export',
  'sidebar.general.import': 'Import',
  'sidebar.general.reset': 'Reset',
  'sidebar.general.resetTheme': 'Reset to default theme',
  'sidebar.general.resetAll': 'Reset all',
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

  // BookmarkTreeSelector
  'groups.rootGroup': 'Root group',
  'groups.allTopLevel': 'All (top level)',
  'groups.hide': 'Hide',
  'groups.show': 'Show',
  'groups.dragToReorder': 'Drag to reorder',

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
