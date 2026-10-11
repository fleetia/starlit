import { describe, expect, it } from 'vitest';

import type { Locale } from '../i18n';
import { getGuideCopy } from './guideCopy';

type GuideIaExpectation = {
  appearanceRoute: string;
  bookmarkGroupsRoute: string;
  calendarAddFlow: string;
  calendarFeedTerm: string;
  clockAddFlow: string;
  emptyCanvasRoute: string;
  imageAddFlow: string;
  legacyContentRoute: string;
  layoutRoute: string;
  locale: Locale;
  portableRoute: string;
  previousPortableRoute: string;
  sceneRoute: string;
  screenPositionTerm: string;
  tabs: string;
  widgetsRoute: string;
};

const GUIDE_IA_EXPECTATIONS: GuideIaExpectation[] = [
  {
    appearanceRoute: 'Settings > Appearance',
    bookmarkGroupsRoute: 'Settings > Bookmark groups',
    calendarAddFlow: 'Add widget, then Calendar',
    calendarFeedTerm: 'feed URL',
    clockAddFlow: 'Add widget, then choose Clock',
    emptyCanvasRoute: 'right-click an empty area',
    imageAddFlow: 'Add widget, then Image',
    legacyContentRoute: 'Settings > Content',
    layoutRoute: 'Settings > Layout',
    locale: 'en',
    portableRoute: 'Settings > Portable profile',
    previousPortableRoute: 'Settings > General > Portable profile',
    sceneRoute: 'Settings > Scene',
    screenPositionTerm: 'screen-relative position',
    tabs: 'General, Appearance, Widgets, Layout, CSS, Bookmark groups, Scene, and Portable profile',
    widgetsRoute: 'Settings > Widgets',
  },
  {
    appearanceRoute: '設定の［外観］',
    bookmarkGroupsRoute: '設定の［ブックマークグループ］',
    calendarAddFlow: '［ウィジェットを追加］、［Calendar］',
    calendarFeedTerm: 'Feed URL',
    clockAddFlow: '［ウィジェットを追加］、［時計］',
    emptyCanvasRoute: '何もない場所を右クリック',
    imageAddFlow: '［ウィジェットを追加］、［画像］',
    legacyContentRoute: '設定の［コンテンツ］',
    layoutRoute: '設定の［配置］',
    locale: 'ja',
    portableRoute: '設定の［Portable profile］',
    previousPortableRoute: '設定の［一般］>［Portable profile］',
    sceneRoute: '設定の［Scene］',
    screenPositionTerm: '画面基準位置',
    tabs: '［一般］［外観］［ウィジェット］［配置］［CSS］［ブックマークグループ］［Scene］［Portable profile］',
    widgetsRoute: '設定の［ウィジェット］',
  },
  {
    appearanceRoute: '설정 > 외형',
    bookmarkGroupsRoute: '설정 > 북마크 그룹',
    calendarAddFlow: '위젯 추가, Calendar',
    calendarFeedTerm: 'feed URL',
    clockAddFlow: '위젯 추가, 시계',
    emptyCanvasRoute: '빈 공간을 우클릭',
    imageAddFlow: '위젯 추가, 이미지',
    legacyContentRoute: '설정 > 콘텐츠',
    layoutRoute: '설정 > 배치',
    locale: 'ko',
    portableRoute: '설정 > Portable profile',
    previousPortableRoute: '설정 > 일반 > Portable profile',
    sceneRoute: '설정 > Scene',
    screenPositionTerm: '화면 기준 위치',
    tabs: '일반, 외형, 위젯, 배치, CSS, 북마크 그룹, Scene, Portable profile',
    widgetsRoute: '설정 > 위젯',
  },
];

describe('getGuideCopy', () => {
  it.each(GUIDE_IA_EXPECTATIONS)(
    'keeps $locale instructions aligned with the restored Settings IA',
    ({
      appearanceRoute,
      bookmarkGroupsRoute,
      calendarAddFlow,
      calendarFeedTerm,
      clockAddFlow,
      emptyCanvasRoute,
      imageAddFlow,
      legacyContentRoute,
      layoutRoute,
      locale,
      portableRoute,
      previousPortableRoute,
      sceneRoute,
      screenPositionTerm,
      tabs,
      widgetsRoute,
    }) => {
      const copy = getGuideCopy(locale);
      const sceneCopy = copy.sections.scenes;
      const layoutCopy = copy.sections['group-layout'];
      const imageWidgetsCopy = copy.sections['overlay-images'];
      const widgetsCopy = copy.sections['widgets-calendar'];
      const fullCopy = JSON.stringify(copy);

      expect(copy.sections['getting-started'].steps[2]?.body).toContain(tabs);
      expect(copy.sections['getting-started'].steps[2]?.body).toContain(
        emptyCanvasRoute,
      );
      expect(sceneCopy.steps[2]?.body).toContain(sceneRoute);
      expect(sceneCopy.steps[2]?.body).not.toMatch(
        /lower-right|右下|오른쪽 아래/iu,
      );
      expect(imageWidgetsCopy.steps[0]?.body).toContain(widgetsRoute);
      expect(imageWidgetsCopy.steps[1]?.body).toContain(imageAddFlow);
      expect(widgetsCopy.steps[0]?.body).toContain(clockAddFlow);
      expect(widgetsCopy.steps[1]?.body).toContain(calendarAddFlow);
      expect(layoutCopy.steps[0]?.body).toContain(bookmarkGroupsRoute);
      expect(layoutCopy.steps[2]?.body).toContain(layoutRoute);
      expect(layoutCopy.steps[2]?.body).not.toContain(appearanceRoute);
      expect(copy.sections['tab-groups'].steps[1]?.body).toContain(
        bookmarkGroupsRoute,
      );
      expect(sceneCopy.details.map(({ body }) => body).join(' ')).toContain(
        'Custom CSS',
      );
      expect(copy.starlitData.items.join(' ')).not.toContain('Custom CSS');
      expect(fullCopy).toContain(screenPositionTerm);
      expect(fullCopy).toContain(calendarFeedTerm);
      expect(fullCopy).toContain(portableRoute);
      expect(fullCopy).not.toContain(previousPortableRoute);
      expect(fullCopy).not.toMatch(
        /\b(?:anchor|layer)\b|アンカー|レイヤー|기준점|레이어/iu,
      );
      expect(fullCopy).not.toContain(legacyContentRoute);
    },
  );
});
