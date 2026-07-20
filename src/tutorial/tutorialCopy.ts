import type { Locale } from '../i18n';

export type TutorialStep = {
  description: string;
  title: string;
};

export type TutorialCopy = {
  back: string;
  close: string;
  error: string;
  finish: string;
  guide: string;
  next: string;
  skip: string;
  step: (current: number, total: number) => string;
  steps: [TutorialStep, TutorialStep, TutorialStep, TutorialStep];
  tabGroupsGuide: string;
};

const COPY: Record<Locale, TutorialCopy> = {
  en: {
    back: 'Back',
    close: 'Close tutorial',
    error: 'Could not save your tutorial progress. Please try again.',
    finish: 'Finish',
    guide: 'Open the full guide',
    next: 'Next',
    skip: 'Skip',
    step: (current, total) => `Step ${current} of ${total}`,
    steps: [
      {
        description:
          'Starlit uses your existing Chrome bookmarks as its source. Changes to bookmarks stay in Chrome.',
        title: 'Your bookmarks, already here',
      },
      {
        description:
          'Open folders to browse. Click the current folder title to open its direct bookmarks as a live Chrome tab group. Starlit asks for confirmation every time before opening a non-empty folder.',
        title: 'Browse folders and reopen a group',
      },
      {
        description:
          'Use Settings to choose visible groups, adjust the layout, and personalize the background and appearance.',
        title: 'Make the new tab yours',
      },
      {
        description:
          'You can copy an open Chrome tab group into bookmarks from Settings. This is a one-time copy, not live sync. Save a newly opened live group from Chrome when you want to keep it.',
        title: 'Import open tab groups',
      },
    ],
    tabGroupsGuide: 'Read about Chrome tab groups',
  },
  ja: {
    back: '戻る',
    close: 'チュートリアルを閉じる',
    error: '進行状況を保存できませんでした。もう一度お試しください。',
    finish: '完了',
    guide: 'ガイド全体を開く',
    next: '次へ',
    skip: 'スキップ',
    step: (current, total) => `${total}ステップ中${current}`,
    steps: [
      {
        description:
          'Starlit は既存の Chrome ブックマークをそのまま使用します。ブックマークの変更は Chrome に保存されます。',
        title: 'ブックマークはすでに準備済みです',
      },
      {
        description:
          'フォルダーを開いて移動します。現在のフォルダー名をクリックすると、直下のブックマークを同じ名前の Chrome タブグループで開きます。ブックマークがあるフォルダーは、開く前に毎回確認します。',
        title: 'フォルダーを移動してグループを開く',
      },
      {
        description:
          '設定では、表示するグループ、レイアウト、背景、外観を変更できます。',
        title: '新しいタブを自分好みに',
      },
      {
        description:
          '設定から、開いている Chrome タブグループをブックマークへコピーできます。これは一度限りのコピーで、自動同期ではありません。作成したライブグループを残す場合は Chrome で保存してください。',
        title: '開いているタブグループを取り込む',
      },
    ],
    tabGroupsGuide: 'Chrome タブグループのガイドを読む',
  },
  ko: {
    back: '이전',
    close: '튜토리얼 닫기',
    error: '튜토리얼 진행 상태를 저장하지 못했습니다. 다시 시도해 주세요.',
    finish: '완료',
    guide: '전체 사용 가이드 열기',
    next: '다음',
    skip: '건너뛰기',
    step: (current, total) => `${total}단계 중 ${current}단계`,
    steps: [
      {
        description:
          'Starlit은 기존 Chrome 북마크를 그대로 사용합니다. 북마크 변경 내용은 Chrome에 저장됩니다.',
        title: '이미 준비된 내 북마크',
      },
      {
        description:
          '폴더를 열어 이동하세요. 현재 폴더 제목을 클릭하면 바로 아래 북마크를 같은 이름의 Chrome 탭 그룹으로 엽니다. 북마크가 있는 폴더는 열기 전에 매번 확인합니다.',
        title: '폴더를 탐색하고 그룹으로 열기',
      },
      {
        description:
          '설정에서 표시할 그룹을 고르고, 레이아웃과 배경, 화면 모양을 내 취향에 맞게 바꿀 수 있습니다.',
        title: '새 탭을 내 방식으로 꾸미기',
      },
      {
        description:
          '설정에서 열려 있는 Chrome 탭 그룹을 북마크로 가져올 수 있습니다. 한 번 복사하는 기능이며 자동 동기화되지는 않습니다. 새로 연 live group을 계속 보관하려면 Chrome에서 저장하세요.',
        title: '열린 탭 그룹 가져오기',
      },
    ],
    tabGroupsGuide: 'Chrome 탭 그룹 가이드 읽기',
  },
};

export function getTutorialCopy(locale: Locale): TutorialCopy {
  return COPY[locale];
}
