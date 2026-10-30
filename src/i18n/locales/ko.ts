import type { Translations } from '../types';

const ko: Translations = {
  // IconButton
  'iconButton.add': '추가',

  // NavigationButton
  'navigation.previous': '이전',
  'navigation.next': '다음',
  'navigation.path': '경로',

  // CardPagination
  'pagination.previousPage': '이전 페이지',
  'pagination.nextPage': '다음 페이지',
  'pagination.pages': '페이지',

  // App
  'newtab.options': '옵션',
  'newtab.empty': '사용할 수 있는 북마크 그룹이 없습니다.',
  'newtab.scene': '현재 Scene',
  'background.motion.play': '배경 움직임 재생',
  'background.motion.pause': '배경 움직임 일시 정지',
  'contextMenu.label': '북마크 작업',
  'contextMenu.changeIcon': '아이콘 변경',
  'contextMenu.resetIcon': '아이콘 초기화',
  'contextMenu.delete': '북마크 삭제',
  'contextMenu.deleteConfirmTitle': 'Chrome 북마크에서도 삭제할까요?',
  'contextMenu.deleteConfirmDescription':
    '이 북마크는 Starlit과 Chrome 북마크 목록에서 모두 삭제됩니다.',
  'contextMenu.deleteConfirmAction': 'Chrome 북마크에서 삭제',
  'contextMenu.deleteFailed':
    'Chrome 북마크를 삭제하지 못했습니다. 다시 시도해 주세요.',

  'sidebar.general.about': 'Starlit 정보',
  'sidebar.general.licenses': '오픈소스 라이선스',

  // OptionsSidebar - Primary tabs
  'sidebar.tab.appearance': '외형',
  'sidebar.tab.layout': '배치',
  'sidebar.tab.css': 'CSS',
  'sidebar.tab.groups': '북마크 그룹',
  'sidebar.tab.general': '일반',
  'sidebar.tab.scene': 'Scene',
  'sidebar.tab.widgets': '위젯',
  'sidebar.support.title': 'Starlit 후원하기',
  'sidebar.support.description': '마음에 들었다면 후원해주세요.',
  'sidebar.support.fairy': 'Fairy에서 후원',

  // OptionsSidebar - Appearance sub tabs
  'sidebar.appearance.background': '배경',
  'sidebar.appearance.container': '컨테이너',
  'sidebar.appearance.bookmark': '북마크',
  'sidebar.appearance.folder': '폴더',

  // OptionsSidebar - Background section
  'sidebar.background.image': '배경 미디어',
  'sidebar.background.source': '배경 가져오기 방식',
  'sidebar.background.sourceDescription':
    'URL은 모든 기기에서 같은 주소를 불러오고, 업로드 파일은 이 기기에만 저장됩니다.',
  'sidebar.background.sourceUrl': 'URL',
  'sidebar.background.sourceFile': '기기 파일',
  'sidebar.background.url': '이미지·동영상 URL',
  'sidebar.background.urlDescription':
    '공개된 이미지, GIF 또는 동영상 주소를 입력하세요. 입력한 주소는 저장할 때 기기 간 동기화됩니다.',
  'sidebar.background.urlPlaceholder': 'URL을 입력하세요',
  'sidebar.background.fileUpload': '파일 업로드',
  'sidebar.background.fileDescription':
    '파일을 선택한 뒤 저장하면 이미지는 WebP, GIF는 WebM으로 변환하고 동영상은 원본 그대로 저장합니다. 업로드 파일은 이 기기에만 저장됩니다.',
  'sidebar.background.fileSelect': '파일 선택',
  'sidebar.background.remove': '제거',
  'sidebar.background.current': '현재 배경',
  'sidebar.background.selected': '저장할 배경',
  'sidebar.background.pendingRemoval': '저장하면 현재 배경을 제거합니다.',
  'sidebar.background.imageType': '이미지',
  'sidebar.background.video': '동영상',
  'sidebar.background.box': '배경 박스',
  'sidebar.background.color': '색상',
  'sidebar.background.processing': '배경 파일 처리·저장 중',
  'sidebar.background.preview': '배경 미리보기',
  'sidebar.tokens.surfaceTitle': 'Starlit 표면',
  'sidebar.tokens.surface': '표면',
  'sidebar.tokens.muted': '보조',
  'sidebar.tokens.chromeTitle': 'Starlit 색상 체계',
  'sidebar.tokens.accent': '강조',
  'sidebar.tokens.accentText': '강조 위 텍스트',
  'sidebar.tokens.border': '테두리',
  'sidebar.tokens.bookmarkTitle': '북마크 색상',
  'sidebar.colorAlpha': '불투명도',
  'sidebar.colorSwatch': '색상 견본',

  // OptionsSidebar - Container section
  'sidebar.container.title': '제목',
  'sidebar.container.titleBackground': '제목 배경',
  'sidebar.container.text': '텍스트',
  'sidebar.container.size': '크기',
  'sidebar.container.hover': '호버',
  'sidebar.container.border': '테두리',
  'sidebar.container.borderColor': '테두리 색상',
  'sidebar.container.borderWidth': '두께',
  'sidebar.container.subtitle': '부제목',
  'sidebar.container.containerBox': '컨테이너 박스',
  'sidebar.container.borderRadius': '모서리 둥글기',
  'sidebar.container.preview': '컨테이너 미리보기',
  'sidebar.container.mockupTitle': '제목',
  'sidebar.container.mockupSubtitle': '부제목 / 경로',

  // OptionsSidebar - Bookmark section
  'sidebar.bookmark.horizontalIcon': '아이콘을 가로로 사용',
  'sidebar.bookmark.scale': '스케일 (em)',
  'sidebar.bookmark.horizontalSize': '가로 사이즈',
  'sidebar.bookmark.verticalSize': '세로 사이즈',
  'sidebar.bookmark.iconSize': '아이콘 크기',
  'sidebar.bookmark.borderRadius': '둥글기',
  'sidebar.bookmark.iconBorderRadius': '아이콘 둥글기',
  'sidebar.bookmark.boxColor': '박스 색상',
  'sidebar.bookmark.borderColor': '카드 테두리 색상',
  'sidebar.bookmark.text': '텍스트',
  'sidebar.bookmark.hoverBackground': '호버 배경',
  'sidebar.bookmark.hoverText': '호버 텍스트',
  'sidebar.bookmark.preview': '북마크 미리보기',
  'sidebar.bookmark.mockupName': '북마크',

  // OptionsSidebar - Folder section
  'sidebar.folder.horizontalIcon': '아이콘을 가로로 사용',
  'sidebar.folder.background': '배경',
  'sidebar.folder.iconBackground': '아이콘 배경',
  'sidebar.folder.iconColor': '아이콘 색상',
  'sidebar.folder.text': '텍스트',
  'sidebar.folder.border': '테두리',
  'sidebar.folder.preview': '폴더 미리보기',
  'sidebar.folder.mockupName': '폴더',

  // OptionsSidebar - Layout section
  'sidebar.layout.expandBookmarks': '북마크를 펼치기',
  'sidebar.layout.horizontalIcon': '아이콘을 가로로 사용',
  'sidebar.layout.expandLayout': '펼치기 레이아웃',
  'sidebar.layout.scrollLayout': '스크롤 레이아웃',
  'sidebar.layout.cardColumns': '카드 가로 개수',
  'sidebar.layout.horizontalSize': '가로사이즈',
  'sidebar.layout.cardInnerColumns': '카드 내 가로 개수',
  'sidebar.layout.horizontalColumnCount': '가로 열 개수',
  'sidebar.layout.cardGap': '카드 간격',
  'sidebar.layout.bookmarkGap': '북마크 간격',
  'sidebar.layout.count': '개수',
  'sidebar.layout.columnCount': '가로 개수',
  'sidebar.layout.rowCount': '세로 개수',
  'sidebar.layout.gap': '간격',
  'sidebar.layout.positionMargin': '위치 + 여백',
  'sidebar.layout.preview': '배치 미리보기',
  'sidebar.preview.note':
    '실제 북마크 renderer를 읽기 전용 축소 화면으로 표시합니다.',

  // OptionsSidebar - CSS section
  'sidebar.css.title': '커스텀 CSS',
  'sidebar.css.help':
    '공개 selector는 #root [data-starlit-part="..."] 형식입니다. ^=로 part 계열을 선택하고 data-kind, data-layout, data-direction으로 상태를 좁힐 수 있습니다.',
  'sidebar.css.placeholder':
    '/* 공개 part: root, main, background-media, paged-groups,\n' +
    '   expanded-groups, group-rail, group-navigation, settings-trigger,\n' +
    '   bookmark-group, bookmark-group-header, bookmark-breadcrumb,\n' +
    '   bookmark-route, bookmark-grid, bookmark-tile, bookmark-tile-icon,\n' +
    '   bookmark-tile-favicon, bookmark-tile-marker, bookmark-tile-label,\n' +
    '   pagination, pagination-control, pagination-status */\n\n' +
    '/* 하나의 part 선택. #root는 class 기반 기본 스타일보다 우선합니다. */\n' +
    '#root [data-starlit-part="bookmark-tile-label"] {\n' +
    '  font-weight: 700;\n' +
    '}\n\n' +
    '/* data-kind, data-layout, data-direction으로 상태를 좁힙니다. */\n' +
    '#root [data-starlit-part="bookmark-tile"][data-kind="folder"] {\n' +
    '  border-style: solid;\n' +
    '}\n\n' +
    '/* ^=는 bookmark-tile과 bookmark-tile-* 계열을 함께 선택합니다. */\n' +
    '#root [data-starlit-part^="bookmark-tile"] {\n' +
    '}',

  // OptionsSidebar - General section
  'sidebar.general.language': '언어',
  'sidebar.general.fontFamily': '폰트',
  'sidebar.general.fontDescription':
    'IBM Plex Sans는 선택한 언어에 맞는 글꼴을 사용합니다. 시스템 폰트는 브라우저와 운영체제 설정을 따릅니다.',
  'sidebar.general.fontIbmPlexSans': 'IBM Plex Sans',
  'sidebar.general.fontSystem': '시스템 폰트',
  'sidebar.general.openInNewTab': '기본적으로 새 탭에서 열기',
  'sidebar.general.guide': '사용 가이드',
  'sidebar.general.guideDescription':
    '북마크, 탭 그룹, 레이아웃, 권한 사용법을 별도 페이지에서 확인하세요.',
  'sidebar.general.openGuide': '전체 사용 가이드 열기',
  'sidebar.general.exportImport': '내보내기 / 가져오기',
  'sidebar.general.export': '내보내기',
  'sidebar.general.import': '가져오기',
  'sidebar.general.reset': '초기화',
  'sidebar.general.resetTheme': '기본 테마로 초기화',
  'sidebar.general.resetAll': '전체 초기화',
  'sidebar.general.resetAllConfirmTitle': 'Starlit 데이터를 전체 초기화할까요?',
  'sidebar.general.resetAllConfirmDescription':
    'Starlit 설정, Scene, cache, custom favicon, tutorial·화면 상태, local media를 영구 삭제합니다. Chrome 북마크, Scene 폴더, 허용한 선택 권한은 남습니다.',
  'sidebar.general.resetAllConfirmAction': '영구 초기화',
  'sidebar.general.credits': '크레딧',
  'sidebar.general.credits.dev': '개발 & 디자인',
  'sidebar.general.credits.planning': '기획 & QA',
  'sidebar.general.credits.github': 'GitHub',
  'sidebar.general.credits.readme': 'README',
  'sidebar.general.credits.postype': 'Postype',
  'sidebar.general.credits.bugReport': '버그 제보',
  'sidebar.general.credits.homepage': '홈페이지',

  // OptionsSidebar - Footer / Confirm
  'sidebar.cancel': '취소',
  'sidebar.save': '저장',
  'sidebar.confirm.unsavedChanges':
    '저장하지 않은 변경사항이 있습니다. 닫을까요?',
  'sidebar.confirm.yes': '예',
  'sidebar.confirm.no': '아니오',

  // Canvas layers
  'layers.title': '캔버스 순서',
  'layers.description':
    '이미지, 캘린더, 시계와 북마크의 순서를 정합니다. 위쪽 행일수록 화면 앞에 표시됩니다.',
  'layers.add': '이미지 추가',
  'layers.processing': '이미지 위젯 처리 중',
  'layers.empty': '추가된 위젯이 없습니다.',
  'layers.bookmarks': '북마크',
  'layers.bookmarksDescription': '전체 북마크 화면',
  'layers.front': '앞',
  'layers.back': '뒤',
  'layers.frontToBackDescription':
    '캔버스 항목은 앞에서 뒤 순서입니다. 항목을 옮겨 북마크의 위나 아래에 무엇을 표시할지 정하세요.',
  'layers.layerList': '캔버스 항목 순서',
  'layers.moveForward': '앞으로 이동',
  'layers.moveBackward': '뒤로 이동',
  'layers.remove': '이미지 삭제',
  'layers.dragToReorder': '드래그하여 캔버스 항목 순서 변경',
  'layers.editPositions': '위치 편집',
  'layers.fileDescription':
    '정적 이미지는 WebP로, GIF는 WebM으로 변환합니다. 동영상과 업로드 파일은 현재 기기에만 저장됩니다.',
  'layers.editor.title': '캔버스 항목 편집',
  'layers.editor.done': '설정으로 돌아가기',
  'layers.editor.image': '이미지',
  'layers.editor.item': '캔버스 항목',
  'layers.editor.noItemSelected': '선택된 캔버스 항목 없음',
  'layers.editor.selectedCount': '개 선택됨',
  'layers.editor.selectedActions': '선택한 이미지 작업',
  'layers.editor.noSelection': '선택된 이미지가 없습니다.',
  'layers.editor.anchor': '화면 기준 위치',
  'layers.editor.rotation': '회전',
  'layers.editor.zoom': '확대/축소',
  'layers.editor.empty': '편집할 이미지, 캘린더 또는 시계를 먼저 추가하세요.',
  'layers.editor.resetPosition': '위치 초기화',
  'layers.editor.instructions':
    '캔버스 항목을 선택하거나 드래그해 이동하세요. 방향키로도 이동할 수 있고, Shift를 누르면 10px씩 이동합니다.',
  'layers.editor.moveToolbar': '도구 모음 이동',
  'layers.editor.viewportPreview': '화면 기준 위치 미리보기',
  'layers.editor.viewportSize': '미리보기 화면 크기',
  'layers.editor.viewportWide': '넓은 화면',
  'layers.editor.viewportNarrow': '좁은 화면',
  'layers.anchor.topLeft': '좌상단',
  'layers.anchor.topCenter': '상단 중앙',
  'layers.anchor.topRight': '우상단',
  'layers.anchor.centerLeft': '좌측 중앙',
  'layers.anchor.centerCenter': '중앙',
  'layers.anchor.centerRight': '우측 중앙',
  'layers.anchor.bottomLeft': '좌하단',
  'layers.anchor.bottomCenter': '하단 중앙',
  'layers.anchor.bottomRight': '우하단',
  'layers.action.hide': '숨기기',
  'layers.action.show': '보이기',
  'layers.action.edit': '편집',
  'layers.action.lock': '잠그기',
  'layers.action.unlock': '잠금 해제',
  'layers.action.duplicate': '복제',
  'layers.action.replace': '교체',
  'layers.action.menu': '이미지 위젯 작업',
  'layers.action.more': '더 많은 작업',
  'layers.action.play': '이번 세션에서 재생',
  'layers.action.pause': '이번 세션에서 일시 정지',
  'layers.action.bringToFront': '맨 앞으로',
  'layers.action.sendToBack': '맨 뒤로',
  'layers.action.group': '그룹으로 묶기',
  'layers.action.ungroup': '그룹 해제',
  'layers.playbackRate': '재생 속도',
  'layers.playbackActiveTab': '활성 탭에서만 재생',
  'layers.playbackAlways': '항상 재생',
  'layers.screenPosition': '화면 기준 위치',
  'layers.error': '이미지 위젯 작업을 완료하지 못했습니다.',

  // Widgets
  'widgets.sceneRequired':
    '캘린더나 시계 위젯을 추가하려면 현재 구성을 먼저 Scene으로 저장하세요.',
  'widgets.description':
    '새 탭에 이미지, 캘린더, 시계를 필요한 만큼 추가합니다.',
  'widgets.image': '이미지',
  'widgets.chooseTitle': '추가할 위젯 선택',
  'widgets.clock': '시계',
  'widgets.clockDescription':
    '시계마다 디지털·아날로그 형식과 시간대를 따로 설정합니다.',
  'widgets.calendar': '캘린더',
  'widgets.calendarDescription':
    'iCalendar URL을 구독해 앞으로 7일의 일정을 표시합니다.',
  'widgets.add': '위젯 추가',
  'widgets.remove': '위젯 제거',
  'widgets.configure': '위젯 설정',
  'widgets.appearance': '시계 모양',
  'widgets.digital': '디지털',
  'widgets.analog': '아날로그',
  'widgets.format': '시간 표시 형식',
  'widgets.formatDescription':
    'HH, H, hh, h, mm, m, ss, s, a 토큰을 사용할 수 있습니다.',
  'widgets.invalidFormat': '올바른 시간 표시 형식을 입력하세요.',
  'widgets.timeZone': '시간대',
  'widgets.timeZoneDescription':
    '비워 두면 현재 시간대를 사용합니다. 예: Asia/Seoul',
  'widgets.invalidTimeZone': '올바른 IANA 시간대를 입력하세요.',
  'widgets.showSecondHand': '초침 표시',
  'widgets.feedUrl': '캘린더 URL',
  'widgets.feedUrlDescription':
    'HTTPS 또는 webcal iCalendar 구독 URL을 지원하며 URL은 이 기기에만 저장됩니다.',
  'widgets.invalidFeedUrl': '올바른 HTTPS 또는 webcal URL을 입력하세요.',
  'widgets.subscribe': '접근 허용 및 구독',
  'widgets.maxEvents': '최대 일정 수',
  'widgets.showAllDay': '종일 일정 표시',
  'widgets.offsetX': '가로 간격',
  'widgets.offsetY': '세로 간격',
  'widgets.width': '너비',
  'widgets.height': '높이',
  'widgets.calendarConsent':
    '입력한 URL의 정확한 origin에만 접근 권한을 요청하며 일정 데이터는 Starlit 서버로 전송하지 않습니다.',
  'widgets.configureInSettings':
    '이 위젯 설정에서 캘린더 URL을 구성하거나 구독하세요.',
  'widgets.refresh': '새로고침',
  'widgets.empty': '표시할 일정이 없습니다.',
  'widgets.loading': '일정을 불러오는 중입니다.',
  'widgets.error': '일정을 불러오지 못했습니다.',

  // Command palette
  'palette.title': 'Starlit 검색',
  'palette.inputLabel': '북마크, 그룹, Scene 또는 설정 검색',
  'palette.placeholder': '검색어를 입력하세요',
  'palette.empty': '일치하는 항목이 없습니다.',
  'palette.error': '명령을 완료하지 못했습니다.',
  'palette.hint': '↑↓ 이동 · Enter 실행 · Esc 닫기',
  'palette.category.bookmark': '북마크',
  'palette.category.group': '그룹',
  'palette.category.scene': 'Scene',
  'palette.category.settings': '설정',

  // Scene
  'scene.currentSetup': '현재 구성',
  'scene.none': '저장된 Scene 없음',
  'scene.create': '현재 구성을 Scene으로 저장',
  'scene.saveAsNew': '새 Scene으로 저장',
  'scene.name': 'Scene 이름',
  'scene.previewTitle': 'Chrome 북마크를 복사할까요?',
  'scene.previewDescription':
    '기존 북마크는 그대로 두고 Starlit Scenes 아래에 전용 폴더를 만듭니다.',
  'scene.previewCounts': '복사할 폴더와 URL',
  'scene.folders': '폴더',
  'scene.urls': 'URL',
  'scene.active': '현재 Scene',
  'scene.destination': '전용 폴더를 만들 위치',
  'scene.otherBookmarks': '기타 북마크',
  'scene.confirmCreate': '확인하고 Scene 만들기',
  'scene.applyPreviewTitle': 'Scene을 적용할까요?',
  'scene.applyPreviewDescription':
    '외형, 배치, 위젯과 북마크 폴더가 이 Scene 구성으로 바뀝니다.',
  'scene.confirmApply': 'Scene 적용',
  'scene.switch': 'Scene 적용',
  'scene.delete': 'Scene 삭제',
  'scene.deleteFolder': 'Chrome 전용 폴더도 삭제',
  'scene.keepFolder': 'Chrome 폴더는 보존',
  'scene.deleteMediaNotice':
    '이 Scene에서만 사용하는 로컬 미디어는 삭제합니다. 다른 Scene에서도 사용하는 미디어는 보존합니다.',
  'scene.relink': '다시 연결',
  'scene.relinkAsset': '대체 미디어',
  'scene.relinkFolder': '대체 북마크 폴더',
  'scene.restore': '복구 스냅샷으로 복원',
  'scene.missingResources':
    '북마크 폴더나 미디어가 없어 이 Scene을 적용할 수 없습니다.',
  'scene.nameRequired': 'Scene 이름을 입력하세요.',
  'scene.error': 'Scene 작업을 완료하지 못했습니다.',

  // Portable profile
  'portable.title': 'Portable profile',
  'portable.scenes': 'Scene과 외형·배치',
  'portable.sceneScopeNote':
    '북마크 URL을 빼면 새 Scene이나 복사본은 Relink가 필요하고 기기별 그룹 표시 여부와 순서를 복원할 수 없습니다. Custom favicon은 제외합니다.',
  'portable.globalScopeNote':
    '언어와 북마크 열기 preference는 항상 포함합니다.',
  'portable.bookmarks': 'Chrome 북마크 URL',
  'portable.media': '업로드한 미디어',
  'portable.sensitiveWarning':
    'URL이나 미디어에는 개인 정보가 포함될 수 있습니다. 파일을 공유하기 전에 내용을 확인하세요.',
  'portable.preview': '가져오기 미리보기',
  'portable.changedSections': '변경되는 영역',
  'portable.addCopy': '복사본으로 추가',
  'portable.replace': 'Scene 교체',
  'portable.skip': '건너뛰기',
  'portable.skipAllNote':
    '건너뛴 Scene은 바뀌지 않습니다. 위에 표시된 global 언어와 북마크 열기 preference는 그대로 가져옵니다.',
  'portable.error': 'Portable Profile 작업을 완료하지 못했습니다.',

  // BookmarkTreeSelector
  'groups.rootGroup': '루트 그룹',
  'groups.allTopLevel': '전체 (최상위)',
  'groups.hide': '숨기기',
  'groups.show': '보이기',
  'groups.dragToReorder': '드래그하여 순서 변경',
  'groups.connectionTitle': 'Chrome 북마크를 사용합니다',
  'groups.connectionDescription':
    'Chrome 북마크 폴더를 불러와 Starlit에 표시합니다. Chrome에서 변경한 북마크는 새 탭을 다시 열면 반영됩니다.',
  'groups.localPreferences':
    '루트 그룹, 숨김, 순서, 아이콘 설정은 Starlit 화면에만 적용됩니다.',
  'groups.openManager': 'Chrome 북마크 열기',
  'groups.openManagerFailed':
    'Chrome 북마크 관리자를 열지 못했습니다. 다시 시도해 주세요.',
  'groups.guideSummary': '동작 방식 보기',
  'groups.guideChrome':
    'Chrome에서 북마크를 추가하거나 이름과 폴더를 변경하면 새 탭을 열 때 Starlit에 반영됩니다.',
  'groups.guideStarlit':
    '그룹 숨김과 순서, 아이콘 변경은 Chrome 북마크를 바꾸지 않습니다.',
  'groups.guideDelete':
    'Starlit에서 북마크를 삭제하면 Chrome 북마크에서도 삭제됩니다.',

  // Chrome Tab Groups
  'tabGroups.openAction': '이 폴더의 북마크를 탭 그룹으로 열기',
  'tabGroups.activationFailed':
    '탭 그룹은 열렸지만 첫 번째 탭을 활성화하지 못했습니다.',
  'tabGroups.empty': '이 폴더에는 바로 열 수 있는 북마크가 없습니다.',
  'tabGroups.failed': '탭 그룹을 열지 못했습니다.',
  'tabGroups.noValidBookmarks': '지원되는 URL을 가진 북마크가 없습니다.',
  'tabGroups.openedSuffix': '개의 북마크를 탭 그룹으로 열었습니다.',
  'tabGroups.skippedSuffix': '개는 열지 못했습니다.',
  'tabGroups.opening': '탭 그룹을 여는 중입니다.',
  'tabGroups.permissionDenied': '탭 그룹 권한이 허용되지 않았습니다.',
  'tabGroups.rollbackIncompleteSuffix': '개의 탭이 닫히지 않았을 수 있습니다.',
  'tabGroups.openConfirm': '탭 그룹 열기',
  'tabGroups.openConfirmTitle': '북마크를 탭 그룹으로 여시겠어요?',
  'tabGroups.singleTabCountSuffix': '개',
  'tabGroups.tabCountSuffix': '개',
  'tabGroups.openConfirmDescription':
    '북마크를 같은 이름의 새 탭 그룹으로 엽니다.',

  // PopupApp
  'popup.active': '활성화됨',
  'popup.inactive': '비활성화됨',
  'popup.deactivate': '비활성화',
  'popup.activate': '활성화',
  'popup.description': '현재 탭에서 Starlit 기능을 사용할 수 있습니다.',
  'popup.settings': '설정',

  // ConfirmDialog
  'confirmDialog.confirm': '확인',
  'confirmDialog.cancel': '취소',

  // Tree
  'tree.collapse': '접기',
  'tree.expand': '펼치기',
  'tree.hide': '숨기기',
  'tree.show': '보이기',
  'tree.dragToReorder': '드래그하여 순서 변경',

  // Modal
  'modal.close': '닫기',

  // PositionGrid
  'positionGrid.group': '위치 그리드',
  'positionGrid.margin.top': '위쪽 여백',
  'positionGrid.margin.bottom': '아래쪽 여백',
  'positionGrid.margin.left': '왼쪽 여백',
  'positionGrid.margin.right': '오른쪽 여백',

  // Content script
  'content.activated': 'Starlit 활성화됨',
};

export default ko;
