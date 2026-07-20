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

  // App
  'newtab.options': 'オプション',
  'newtab.empty': '利用できるブックマークグループがありません。',
  'contextMenu.label': 'ブックマーク操作',
  'contextMenu.changeIcon': 'アイコンを変更',
  'contextMenu.resetIcon': 'アイコンをリセット',
  'contextMenu.delete': 'ブックマークを削除',
  'contextMenu.deleteConfirmTitle': 'Chrome ブックマークからも削除しますか？',
  'contextMenu.deleteConfirmDescription':
    'このブックマークは Starlit と Chrome ブックマークの両方から削除されます。',
  'contextMenu.deleteConfirmAction': 'Chrome から削除',
  'contextMenu.deleteFailed':
    'Chrome ブックマークを削除できませんでした。もう一度お試しください。',

  // OptionsSidebar - Primary tabs
  'sidebar.tab.appearance': '外観',
  'sidebar.tab.layout': '配置',
  'sidebar.tab.css': 'CSS',
  'sidebar.tab.groups': 'ブックマークグループ',
  'sidebar.tab.general': '一般',
  'sidebar.tab.layers': 'レイヤー',
  'sidebar.support.title': 'Starlitを応援',
  'sidebar.support.description':
    'Starlitを気に入っていただけたら、これからの開発を応援してください。',
  'sidebar.support.fairy': 'Fairyで応援',

  // OptionsSidebar - Appearance sub tabs
  'sidebar.appearance.background': '背景',
  'sidebar.appearance.container': 'コンテナ',
  'sidebar.appearance.bookmark': 'ブックマーク',
  'sidebar.appearance.folder': 'フォルダ',

  // OptionsSidebar - Background section
  'sidebar.background.image': '背景メディア',
  'sidebar.background.source': '背景の取得方法',
  'sidebar.background.sourceDescription':
    'URLはデバイス間で同期されます。アップロードしたファイルはこのデバイスにのみ保存されます。',
  'sidebar.background.sourceUrl': 'URL',
  'sidebar.background.sourceFile': 'デバイスのファイル',
  'sidebar.background.url': '画像・動画URL',
  'sidebar.background.urlDescription':
    '公開されている画像、GIF、動画のURLを入力してください。保存するとURLがデバイス間で同期されます。',
  'sidebar.background.urlPlaceholder': 'URLを入力してください',
  'sidebar.background.fileUpload': 'ファイルアップロード',
  'sidebar.background.fileDescription':
    'ファイルを選択して保存すると、画像はWebP、GIFはWebMに変換され、動画は元の形式のまま保存されます。アップロードしたファイルはこのデバイスにのみ保存されます。',
  'sidebar.background.fileSelect': 'ファイルを選択',
  'sidebar.background.remove': '削除',
  'sidebar.background.current': '現在の背景',
  'sidebar.background.selected': '保存する背景',
  'sidebar.background.pendingRemoval': '保存すると現在の背景が削除されます。',
  'sidebar.background.imageType': '画像',
  'sidebar.background.video': '動画',
  'sidebar.background.box': '背景ボックス',
  'sidebar.background.color': '色',
  'sidebar.background.processing': '背景ファイルを処理・保存中',
  'sidebar.background.preview': '背景プレビュー',
  'sidebar.tokens.surfaceTitle': 'Starlit サーフェス',
  'sidebar.tokens.surface': 'サーフェス',
  'sidebar.tokens.muted': '補助',
  'sidebar.tokens.chromeTitle': 'Starlit カラートークン',
  'sidebar.tokens.accent': 'アクセント',
  'sidebar.tokens.accentText': 'アクセント上のテキスト',
  'sidebar.tokens.border': 'ボーダー',
  'sidebar.tokens.bookmarkTitle': 'ブックマーク配色',
  'sidebar.colorAlpha': '不透明度',
  'sidebar.colorSwatch': 'カラースウォッチ',

  // OptionsSidebar - Container section
  'sidebar.container.title': 'タイトル',
  'sidebar.container.titleBackground': 'タイトル背景',
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
  'sidebar.css.help':
    '公開 selector は #root [data-starlit-part="..."] 形式です。^= で part 一式を選択し、data-kind、data-layout、data-direction で状態を絞り込めます。',
  'sidebar.css.placeholder':
    '/* 公開 part: root, main, background-media, paged-groups,\n' +
    '   expanded-groups, group-rail, group-navigation, settings-trigger,\n' +
    '   bookmark-group, bookmark-group-header, bookmark-breadcrumb,\n' +
    '   bookmark-route, bookmark-grid, bookmark-tile, bookmark-tile-icon,\n' +
    '   bookmark-tile-favicon, bookmark-tile-marker, bookmark-tile-label,\n' +
    '   pagination, pagination-control, pagination-status */\n\n' +
    '/* 1つの part を選択。#root は class ベースの標準スタイルより優先します。 */\n' +
    '#root [data-starlit-part="bookmark-tile-label"] {\n' +
    '  font-weight: 700;\n' +
    '}\n\n' +
    '/* data-kind、data-layout、data-direction で状態を絞り込みます。 */\n' +
    '#root [data-starlit-part="bookmark-tile"][data-kind="folder"] {\n' +
    '  border-style: solid;\n' +
    '}\n\n' +
    '/* ^= は bookmark-tile と bookmark-tile-* をまとめて選択します。 */\n' +
    '#root [data-starlit-part^="bookmark-tile"] {\n' +
    '}',

  // OptionsSidebar - General section
  'sidebar.general.language': '言語',
  'sidebar.general.fontFamily': 'フォント',
  'sidebar.general.fontDescription':
    'IBM Plex Sans は選択した言語に合う書体を使用します。システムフォントはブラウザーと OS の設定に従います。',
  'sidebar.general.fontIbmPlexSans': 'IBM Plex Sans',
  'sidebar.general.fontSystem': 'システムフォント',
  'sidebar.general.openInNewTab': 'デフォルトで新しいタブで開く',
  'sidebar.general.guide': '使用ガイド',
  'sidebar.general.guideDescription':
    'ブックマーク、タブグループ、レイアウト、権限の使い方を別ページで確認できます。',
  'sidebar.general.openGuide': '使用ガイド全体を開く',
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

  // OptionsSidebar - Footer / Confirm
  'sidebar.cancel': 'キャンセル',
  'sidebar.save': '保存',
  'sidebar.confirm.unsavedChanges':
    '保存されていない変更があります。閉じますか？',
  'sidebar.confirm.yes': 'はい',
  'sidebar.confirm.no': 'いいえ',

  // Overlay image layers
  'layers.title': 'オーバーレイ画像レイヤー',
  'layers.description':
    '画像をブックマークの後ろまたは前に配置できます。上の行ほど手前に表示されます。',
  'layers.add': '画像を追加',
  'layers.processing': 'オーバーレイ画像を処理中',
  'layers.empty': 'オーバーレイ画像はまだ追加されていません。',
  'layers.bookmarks': 'ブックマーク',
  'layers.bookmarksDescription': 'ブックマーク画面全体',
  'layers.front': '前',
  'layers.back': '後ろ',
  'layers.frontToBackDescription':
    'レイヤーは前から後ろの順です。ブックマークを画像の間に移動して、どの画像を手前に表示するか決めます。',
  'layers.layerList': 'オーバーレイレイヤーの順序',
  'layers.moveForward': '前へ移動',
  'layers.moveBackward': '後ろへ移動',
  'layers.remove': '画像を削除',
  'layers.dragToReorder': 'ドラッグしてレイヤーを並べ替え',
  'layers.editPositions': '位置を編集',
  'layers.fileDescription':
    '画像はWebPに変換され、このデバイスにのみ保存されます。',
  'layers.editor.title': 'オーバーレイ位置を編集',
  'layers.editor.done': '設定に戻る',
  'layers.editor.image': '画像',
  'layers.editor.anchor': '基準点',
  'layers.editor.rotation': '回転',
  'layers.editor.zoom': '拡大・縮小',
  'layers.editor.empty': '位置を編集する前に画像を追加してください。',
  'layers.editor.resetPosition': '位置をリセット',
  'layers.editor.instructions':
    '画像をドラッグするか矢印キーで移動します。Shiftを押すと10pxずつ移動します。',
  'layers.editor.moveToolbar': 'ツールバーを移動',
  'layers.anchor.topLeft': '左上',
  'layers.anchor.topCenter': '上中央',
  'layers.anchor.topRight': '右上',
  'layers.anchor.centerLeft': '左中央',
  'layers.anchor.centerCenter': '中央',
  'layers.anchor.centerRight': '右中央',
  'layers.anchor.bottomLeft': '左下',
  'layers.anchor.bottomCenter': '下中央',
  'layers.anchor.bottomRight': '右下',

  // BookmarkTreeSelector
  'groups.rootGroup': 'ルートグループ',
  'groups.allTopLevel': 'すべて（最上位）',
  'groups.hide': '非表示',
  'groups.show': '表示',
  'groups.dragToReorder': 'ドラッグして順序を変更',
  'groups.connectionTitle': 'Chrome ブックマークを使用します',
  'groups.connectionDescription':
    'Chrome のブックマークフォルダを Starlit に表示します。Chrome での変更は、新しいタブを開き直すと反映されます。',
  'groups.localPreferences':
    'ルートグループ、非表示、並び順、アイコンの設定は Starlit にのみ反映されます。',
  'groups.openManager': 'Chrome ブックマークを開く',
  'groups.openManagerFailed':
    'Chrome ブックマークマネージャーを開けませんでした。もう一度お試しください。',
  'groups.guideSummary': '仕組みを見る',
  'groups.guideChrome':
    'Chrome でブックマークを追加したり、名前やフォルダを変更したりすると、次に新しいタブを開いたときに Starlit に反映されます。',
  'groups.guideStarlit':
    'グループの非表示、並べ替え、アイコンの変更は Chrome ブックマークには影響しません。',
  'groups.guideDelete':
    'Starlit でブックマークを削除すると、Chrome ブックマークからも削除されます。',

  // Chrome Tab Groups
  'tabGroups.openAction': 'このフォルダをタブグループとして開く',
  'tabGroups.activationFailed':
    'タブグループは開きましたが、最初のタブを有効にできませんでした。',
  'tabGroups.empty': 'このフォルダには直接開けるブックマークがありません。',
  'tabGroups.failed': 'タブグループを開けませんでした。',
  'tabGroups.noValidBookmarks': '対応する URL のブックマークがありません。',
  'tabGroups.openedSuffix': '件のブックマークをタブグループで開きました。',
  'tabGroups.skippedSuffix': '件は開けませんでした。',
  'tabGroups.opening': 'タブグループを開いています。',
  'tabGroups.permissionDenied': 'タブグループの権限が許可されませんでした。',
  'tabGroups.rollbackIncompleteSuffix':
    '件のタブが開いたままの可能性があります。',
  'tabGroups.openConfirm': 'タブグループを開く',
  'tabGroups.openConfirmTitle': 'ブックマークをタブグループで開きますか？',
  'tabGroups.singleTabCountSuffix': '件。',
  'tabGroups.tabCountSuffix': '件。',
  'tabGroups.openConfirmDescription':
    '同じ名前の新しいタブグループでブックマークを開きます。',

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
