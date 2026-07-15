import type { Translations } from '../types';

const ja: Translations = {
  // IconButton
  'iconButton.add': '追加',

  // NavigationButton
  'navigation.previous': '前へ',
  'navigation.next': '次へ',
  'navigation.path': 'パス',

  // CardPagination
  'pagination.previousPage': '前のページ',
  'pagination.nextPage': '次のページ',
  'pagination.pages': 'ページ',

  // NewTabApp
  'newtab.options': 'オプション',
  'newtab.empty': '利用できるブックマークグループがありません。',
  'contextMenu.label': 'ブックマーク操作',
  'contextMenu.changeIcon': 'アイコンを変更',
  'contextMenu.resetIcon': 'アイコンをリセット',
  'contextMenu.delete': 'ブックマークを削除',

  // OptionsSidebar - Primary tabs
  'sidebar.tab.appearance': '外観',
  'sidebar.tab.layout': '配置',
  'sidebar.tab.css': 'CSS',
  'sidebar.tab.groups': 'グループ',
  'sidebar.tab.general': '一般',

  // OptionsSidebar - Appearance sub tabs
  'sidebar.appearance.background': '背景',
  'sidebar.appearance.container': 'コンテナ',
  'sidebar.appearance.bookmark': 'ブックマーク',
  'sidebar.appearance.folder': 'フォルダ',

  // OptionsSidebar - Background section
  'sidebar.background.image': '背景画像',
  'sidebar.background.urlPlaceholder': 'URLを入力してください',
  'sidebar.background.apply': '適用',
  'sidebar.background.fileUpload': 'ファイルアップロード',
  'sidebar.background.remove': '削除',
  'sidebar.background.box': '背景ボックス',
  'sidebar.background.color': '色',
  'sidebar.background.processing': '処理中',
  'sidebar.background.preview': '背景プレビュー',
  'sidebar.tokens.surfaceTitle': 'Starlit サーフェス',
  'sidebar.tokens.surface': 'サーフェス',
  'sidebar.tokens.muted': '補助',
  'sidebar.tokens.chromeTitle': 'Starlit カラートークン',
  'sidebar.tokens.accent': 'アクセント',
  'sidebar.tokens.accentText': 'アクセント上のテキスト',
  'sidebar.tokens.border': 'ボーダー',
  'sidebar.tokens.bookmarkTitle': 'ブックマーク配色',
  'sidebar.colorSwatch': 'カラースウォッチ',

  // OptionsSidebar - Container section
  'sidebar.container.title': 'タイトル',
  'sidebar.container.text': 'テキスト',
  'sidebar.container.size': 'サイズ',
  'sidebar.container.hover': 'ホバー',
  'sidebar.container.border': 'ボーダー',
  'sidebar.container.borderColor': 'ボーダー色',
  'sidebar.container.borderWidth': '太さ',
  'sidebar.container.subtitle': 'サブタイトル',
  'sidebar.container.containerBox': 'コンテナボックス',
  'sidebar.container.borderRadius': '角丸',
  'sidebar.container.preview': 'コンテナプレビュー',
  'sidebar.container.mockupTitle': 'タイトル',
  'sidebar.container.mockupSubtitle': 'サブタイトル / パス',

  // OptionsSidebar - Bookmark section
  'sidebar.bookmark.horizontalIcon': 'アイコンを横に使用',
  'sidebar.bookmark.scale': 'スケール (em)',
  'sidebar.bookmark.horizontalSize': '横サイズ',
  'sidebar.bookmark.verticalSize': '縦サイズ',
  'sidebar.bookmark.iconSize': 'アイコンサイズ',
  'sidebar.bookmark.borderRadius': '角丸',
  'sidebar.bookmark.iconBorderRadius': 'アイコン角丸',
  'sidebar.bookmark.boxColor': 'ボックス色',
  'sidebar.bookmark.text': 'テキスト',
  'sidebar.bookmark.hoverBackground': 'ホバー背景',
  'sidebar.bookmark.hoverText': 'ホバーテキスト',
  'sidebar.bookmark.preview': 'ブックマークプレビュー',
  'sidebar.bookmark.mockupName': 'ブックマーク',

  // OptionsSidebar - Folder section
  'sidebar.folder.horizontalIcon': 'アイコンを横に使用',
  'sidebar.folder.background': '背景',
  'sidebar.folder.iconBackground': 'アイコン背景',
  'sidebar.folder.iconColor': 'アイコン色',
  'sidebar.folder.text': 'テキスト',
  'sidebar.folder.border': 'ボーダー',
  'sidebar.folder.preview': 'フォルダプレビュー',
  'sidebar.folder.mockupName': 'フォルダ',

  // OptionsSidebar - Layout section
  'sidebar.layout.expandBookmarks': 'ブックマークを展開',
  'sidebar.layout.horizontalIcon': 'アイコンを横に使用',
  'sidebar.layout.expandLayout': '展開レイアウト',
  'sidebar.layout.scrollLayout': 'スクロールレイアウト',
  'sidebar.layout.cardColumns': 'カード横数',
  'sidebar.layout.horizontalSize': '横サイズ',
  'sidebar.layout.cardInnerColumns': 'カード内横数',
  'sidebar.layout.horizontalColumnCount': '横列数',
  'sidebar.layout.cardGap': 'カード間隔',
  'sidebar.layout.bookmarkGap': 'ブックマーク間隔',
  'sidebar.layout.count': '個数',
  'sidebar.layout.columnCount': '横数',
  'sidebar.layout.rowCount': '縦数',
  'sidebar.layout.gap': '間隔',
  'sidebar.layout.positionMargin': '位置 + 余白',
  'sidebar.layout.preview': '配置プレビュー',
  'sidebar.preview.note':
    '実際のブックマーク renderer を読み取り専用の縮小表示で使用します。',

  // OptionsSidebar - CSS section
  'sidebar.css.title': 'カスタムCSS',
  'sidebar.css.placeholder':
    '/* 最優先で適用されるカスタムCSS */\n.my-class-* {\n  color: red;\n}',

  // OptionsSidebar - General section
  'sidebar.general.language': '言語',
  'sidebar.general.openInNewTab': 'デフォルトで新しいタブで開く',
  'sidebar.general.exportImport': 'エクスポート / インポート',
  'sidebar.general.export': 'エクスポート',
  'sidebar.general.import': 'インポート',
  'sidebar.general.reset': 'リセット',
  'sidebar.general.resetTheme': 'デフォルトテーマにリセット',
  'sidebar.general.resetAll': '全体リセット',
  'sidebar.general.credits': 'クレジット',
  'sidebar.general.credits.dev': '開発 & デザイン',
  'sidebar.general.credits.planning': '企画 & QA',
  'sidebar.general.credits.github': 'GitHub',
  'sidebar.general.credits.readme': 'README',
  'sidebar.general.credits.postype': 'Postype',
  'sidebar.general.credits.bugReport': 'バグ報告',
  'sidebar.general.credits.homepage': 'ホームページ',
  'sidebar.general.credits.buyMeACoffee': 'Buy me a coffee',

  // OptionsSidebar - Footer / Confirm
  'sidebar.cancel': 'キャンセル',
  'sidebar.save': '保存',
  'sidebar.confirm.unsavedChanges':
    '保存されていない変更があります。閉じますか？',
  'sidebar.confirm.yes': 'はい',
  'sidebar.confirm.no': 'いいえ',

  // BookmarkTreeSelector
  'groups.rootGroup': 'ルートグループ',
  'groups.allTopLevel': 'すべて（最上位）',
  'groups.hide': '非表示',
  'groups.show': '表示',
  'groups.dragToReorder': 'ドラッグして順序を変更',

  // PopupApp
  'popup.active': '有効',
  'popup.inactive': '無効',
  'popup.deactivate': '無効にする',
  'popup.activate': '有効にする',
  'popup.description': '現在のタブでStarlitの機能を使用できます。',
  'popup.settings': '設定',

  // ConfirmDialog
  'confirmDialog.confirm': '確認',
  'confirmDialog.cancel': 'キャンセル',

  // Tree
  'tree.collapse': '折りたたむ',
  'tree.expand': '展開',
  'tree.hide': '非表示',
  'tree.show': '表示',
  'tree.dragToReorder': 'ドラッグして順序を変更',

  // Modal
  'modal.close': '閉じる',

  // PositionGrid
  'positionGrid.group': '位置グリッド',
  'positionGrid.margin.top': '上余白',
  'positionGrid.margin.bottom': '下余白',
  'positionGrid.margin.left': '左余白',
  'positionGrid.margin.right': '右余白',

  // Content script
  'content.activated': 'Starlit 有効',
};

export default ja;
