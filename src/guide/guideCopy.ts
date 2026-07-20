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
      ],
      title: 'Chrome remains the source of truth',
    },
    dataOwnershipDescription:
      'Starlit combines Chrome-owned content with its own display preferences. Knowing the boundary helps you predict what syncs, what a reset removes, and where to edit an item.',
    dataOwnershipTitle: 'What belongs to Chrome and what belongs to Starlit?',
    detailsTitle: 'Questions and answers',
    factsTitle: 'Good to know',
    intro:
      'A practical reference for turning Chrome bookmarks into a focused new-tab workspace, moving between bookmark folders and live tab groups, and keeping your setup portable.',
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
      'The reference screenshots use the Korean product UI. Control positions and section layouts are the same in every language.',
    sections: {
      appearance: {
        callout: {
          body: "A background URL is saved with your settings and can follow Chrome Sync, but the resource is still requested from its provider. An uploaded file stays only in this extension profile's IndexedDB on this device.",
          title: 'URL and file backgrounds travel differently',
          tone: 'warning',
        },
        description:
          'Adjust the background, surfaces, bookmark tiles, folders, colors, and Custom CSS while keeping Chrome bookmark content unchanged.',
        details: [
          {
            body: 'Use a URL when you want the same address available through synced settings. Use File upload when the media should remain local. Export a backup if you need to move an uploaded file to another profile or extension ID.',
            title: 'Should I use a URL or upload a file?',
          },
          {
            body: 'Starlit removes unsafe rules and declarations before applying Custom CSS. Start with the public data-starlit-part selectors shown in the CSS panel and check the preview before saving.',
            title: 'Why did part of my Custom CSS disappear?',
          },
        ],
        facts: [
          'Image and video URLs are stored as background settings; Chrome loads the resource directly from the provider.',
          'Uploaded images and videos are processed locally and stored in IndexedDB, not uploaded to a Starlit server.',
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
            body: 'Choose URL or File upload for the background, then select an image or video. You can also clear the current background.',
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
          body: 'Layer order, newly added images, and position edits remain in the Settings draft until you choose Save. Cancelling discards the complete overlay draft.',
          title: 'Save the complete layer draft',
          tone: 'info',
        },
        description:
          'Place local images in front of or behind the bookmark workspace, then adjust each image without blocking normal bookmark use.',
        details: [
          {
            body: 'The Bookmarks row represents the complete bookmark workspace and cannot be removed. Images above it in the front-to-back list render over bookmarks; images below it render behind them.',
            title: 'What does the Bookmarks layer mean?',
          },
          {
            body: 'Each image keeps a pixel offset from one of nine viewport anchor points. Choose the nearest corner, edge, or center so the image stays attached to that reference when the viewport changes size.',
            title: 'Which anchor should I choose?',
          },
        ],
        facts: [
          'Fresh installs and profiles after Reset all start with the bundled Getting image above bookmarks at the bottom-right anchor. You can move, reorder, or remove it.',
          'Uploaded images are converted to WebP and stored in IndexedDB for the current extension profile. They are not sent to a Starlit server.',
          'Position editing supports dragging, arrow-key movement, rotation from -180° to 180°, and zoom from 10% to 400%. Hold Shift with an arrow key to move 10 pixels at a time.',
          'Images in front of bookmarks do not receive pointer events during normal use, so bookmark links remain clickable.',
        ],
        media: [],
        steps: [
          {
            body: 'Open Settings > Layers. The list is ordered from the front of the screen to the back.',
            title: 'Open the layer list',
          },
          {
            body: 'Choose Add images and select one or more image files. Each file becomes a separate layer in the draft.',
            title: 'Add overlay images',
          },
          {
            body: 'Drag rows or use the arrow controls to move images around the fixed Bookmarks row. Remove only the image layers you no longer need.',
            title: 'Arrange front and back',
          },
          {
            body: 'Choose Edit positions, select an image, then set its anchor, drag or nudge it into place, and adjust rotation and zoom. Return to Settings when finished.',
            title: 'Place each image',
          },
          {
            body: 'Choose Save in Settings to apply the layer order, image files, and positions together. Choose Cancel to discard the draft.',
            title: 'Save all overlay changes',
          },
        ],
        title: 'Overlay image layers',
      },
      'backup-permissions': {
        callout: {
          body: 'Export, import, reset, bookmark-manager, and tab-group actions run immediately; Cancel does not undo them. Regular form controls remain drafts until you choose Save.',
          title: 'Some Settings actions are immediate',
          tone: 'warning',
        },
        description:
          'Create a portable settings backup, understand Chrome permissions, and know exactly what each reset action can remove.',
        details: [
          {
            body: 'The JSON includes saved layout and display settings, group preferences, language, Custom CSS, custom favicons, background metadata and media, plus overlay layer metadata and image data. It does not copy Chrome bookmarks, Chrome tab groups, permissions, unsaved drafts, tutorial completion, or expanded-group state. Keep the file private because it can embed local media.',
            title: 'What is included in an export?',
          },
          {
            body: 'Starlit always needs storage and bookmarks to render the workspace. tabGroups is optional and remains connected for repeat actions until you disconnect it. tabs is requested only while an explicit import reads open-tab titles and URLs, then removed when the flow finishes or is cancelled.',
            title: 'Why does Starlit request these permissions?',
          },
        ],
        facts: [
          'A different Chrome profile or extension ID has a separate storage area, even on the same computer.',
          'Export and import can carry Starlit settings, custom favicons, uploaded background media, and overlay images across that boundary.',
          'Custom favicon overrides are merged during import. Destination overrides that are not present in the backup remain in place.',
          'Reset theme restores only the color theme. Reset all also removes Starlit preferences, caches, custom favicons, local background media, and overlay images. The bundled Getting image returns on the next load.',
          'Neither reset deletes Chrome bookmarks or imported bookmark folders. Reset all also leaves tutorial completion, expanded-group state, and the optional tabGroups connection in place.',
        ],
        media: [
          {
            alt: 'Starlit General settings showing language, font, guide, export, and import controls',
            caption:
              'Export, import, and reset live in General settings and take effect as immediate actions.',
            src: '/assets/guide/settings-general.jpg',
          },
        ],
        steps: [
          {
            body: 'Open Settings > General and choose Export. Keep the downloaded JSON somewhere you control.',
            title: 'Create a backup',
          },
          {
            body: 'In the destination Chrome profile or Starlit installation, choose Import and select that JSON. The page reloads after a successful restore.',
            title: 'Restore in the destination',
          },
          {
            body: 'Use the Bookmark groups panel to check tab-group access. Disconnect it there when you no longer want Starlit to retain the optional tabGroups permission.',
            title: 'Review optional access',
          },
          {
            body: 'Export first, then choose Reset theme or Reset all only after checking the scope. Reset actions apply immediately and reload the page.',
            title: 'Reset deliberately',
          },
        ],
        title: 'Backup, restore, permissions, and reset',
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
            body: 'Use the settings button in the lower-right corner to open General, Appearance, Layout, CSS, and Bookmark groups.',
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
            body: 'Check that the folder sits below the selected root and is marked visible in Bookmark groups. Then open a fresh new tab if the Chrome bookmark tree changed recently.',
            title: 'Why is a folder missing?',
          },
        ],
        facts: [
          'The Bookmark groups panel controls the root, visibility, and sibling order used by Starlit.',
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
            body: 'Open Layout and choose a compact paged view or an expanded scrolling view, along with bookmark expansion and icon direction.',
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
          body: 'Do not start with Reset all when data appears missing. Export from any installation that still has the expected setup, then check the Chrome profile, extension ID, permissions, and background source.',
          title: 'Protect the recoverable copy first',
          tone: 'warning',
        },
        description:
          'Diagnose missing bookmarks, tab groups, backgrounds, or settings by checking ownership and storage boundaries before resetting anything.',
        details: [
          {
            body: 'Normal updates to the same Store installation keep the same extension ID and preserve storage. A Store build, an unpacked build loaded from a different directory, or another Chrome profile can use separate storage. Export from the old installation and import into the new one.',
            title: 'Why did settings disappear after installing another build?',
          },
          {
            body: 'Open the saved group in Chrome, restart the importer, and approve the optional access if prompted. The list never includes a closed Saved Tab Group.',
            title: 'Why is a tab group still missing?',
          },
          {
            body: "Uploaded media belongs to one extension profile's IndexedDB. It does not arrive on another device through Chrome Sync unless you carry it in an export and import. A URL background can follow synced settings, but the provider must remain reachable.",
            title: 'Why is my background missing on another device?',
          },
        ],
        facts: [
          'A fresh new tab rereads Chrome bookmarks and resolves many stale-view cases.',
          'Same-ID extension updates preserve Starlit storage; different IDs and Chrome profiles do not share it automatically.',
          'Reset all clears Starlit-owned preferences and local media, not the Chrome bookmark tree.',
        ],
        media: [],
        steps: [
          {
            body: 'Name the missing item first: Chrome bookmark content, an open tab group, a Starlit preference, or locally uploaded background media.',
            title: 'Identify who owns the data',
          },
          {
            body: 'For bookmark changes, open a fresh new tab. For tab groups, open the group in Chrome and check the Bookmark groups connection state.',
            title: 'Refresh the right source',
          },
          {
            body: 'Confirm that you are using the expected Chrome profile and Starlit installation. Different extension IDs have separate sync, local, and IndexedDB storage.',
            title: 'Check the storage boundary',
          },
          {
            body: 'Export any recoverable setup. Only then try a targeted theme reset or Reset all, and use the homepage or issue tracker below if the symptom remains.',
            title: 'Back up before resetting',
          },
        ],
        title: 'Troubleshooting',
      },
    },
    starlitData: {
      items: [
        'Group visibility and order, bookmark root, layout, colors, typography, language, and Custom CSS',
        'Custom favicon overrides, caches, and expanded or collapsed group state',
        'Background and overlay metadata plus uploaded media stored locally in the extension profile',
      ],
      title: 'Starlit stores display preferences and device-scoped data',
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
      ],
      title: '原本は Chrome にあります',
    },
    dataOwnershipDescription:
      'Starlit は Chrome が所有する内容と、Starlit 独自の表示設定を組み合わせます。この境界を知ると、同期されるもの、リセットで消えるもの、編集すべき場所を判断できます。',
    dataOwnershipTitle: 'Chrome のデータと Starlit のデータ',
    detailsTitle: 'よくある質問',
    factsTitle: '知っておきたいこと',
    intro:
      'Chrome ブックマークを使いやすい新しいタブのワークスペースに変え、ブックマークフォルダーとライブタブグループを行き来し、設定を安全に持ち運ぶための実用ガイドです。',
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
      '参考スクリーンショットは韓国語版の画面です。操作位置と各セクションの配置は、どの言語でも共通です。',
    sections: {
      appearance: {
        callout: {
          body: '背景 URL は設定とともに保存され、Chrome Sync の対象になり得ますが、素材は提供元から読み込まれます。アップロードしたファイルは、この端末上にある現在の拡張機能プロフィールの IndexedDB にだけ保存されます。',
          title: 'URL とファイルでは引き継がれ方が異なります',
          tone: 'warning',
        },
        description:
          'Chrome ブックマークの内容を変えずに、背景、コンテナー、ブックマーク、フォルダー、色、Custom CSS を調整します。',
        details: [
          {
            body: '同期設定から同じアドレスを利用したい場合は URL、メディアをローカルだけに置きたい場合はファイルを選びます。別のプロフィールや拡張機能 ID へアップロードファイルを移すときは、エクスポートを使ってください。',
            title: 'URL とファイルアップロードのどちらを使うべきですか？',
          },
          {
            body: 'Starlit は適用前に危険なルールや宣言を取り除きます。CSS パネルに示される公開 data-starlit-part selector から始め、保存前にプレビューを確認してください。',
            title: 'Custom CSS の一部が消えたのはなぜですか？',
          },
        ],
        facts: [
          '画像・動画 URL は背景設定として保存され、Chrome が提供元から直接読み込みます。',
          'アップロードした画像・動画はローカルで処理され、IndexedDB に保存されます。Starlit のサーバーには送信されません。',
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
            body: '背景に URL またはファイルアップロードを選び、画像・動画を指定します。現在の背景を削除することもできます。',
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
          body: 'レイヤー順、新しく追加した画像、位置の編集は、［保存］を選ぶまで設定の下書きです。［キャンセル］すると、オーバーレイの下書き全体が破棄されます。',
          title: 'レイヤーの下書き全体を保存します',
          tone: 'info',
        },
        description:
          'ローカル画像をブックマーク画面の前後に配置し、通常のブックマーク操作を妨げずに画像ごとの位置を調整します。',
        details: [
          {
            body: '［ブックマーク］行はブックマーク画面全体を表し、削除できません。前から後ろへ並ぶ一覧で、その行より上の画像はブックマークの前、下の画像は後ろに表示されます。',
            title: 'ブックマークレイヤーとは何ですか？',
          },
          {
            body: '各画像は、画面上の 9 個の基準点のいずれかから pixel 単位の距離を保ちます。画面サイズが変わっても位置関係を保てるよう、最も近い角、辺、または中央を選びます。',
            title: 'どの基準点を選べばよいですか？',
          },
        ],
        facts: [
          '新規インストールまたは［すべてリセット］後のプロフィールには、右下を基準にした同梱の Getting 画像がブックマークの前に表示されます。他の画像と同じように移動、並べ替え、削除できます。',
          'アップロードした画像は WebP に変換され、現在の拡張機能プロフィールの IndexedDB に保存されます。Starlit のサーバーには送信されません。',
          '位置編集では、ドラッグ、方向キーでの移動、-180°〜180°の回転、10%〜400%の拡大・縮小ができます。Shift と方向キーを同時に押すと 10 pixel ずつ移動します。',
          'ブックマークの前にある画像は通常画面で pointer event を受け取らないため、ブックマークリンクをそのまま選べます。',
        ],
        media: [],
        steps: [
          {
            body: '設定の［レイヤー］を開きます。一覧は画面の前から後ろの順に並びます。',
            title: 'レイヤー一覧を開く',
          },
          {
            body: '［画像を追加］を選び、1 個以上の画像ファイルを指定します。各ファイルは下書き内の個別レイヤーになります。',
            title: 'オーバーレイ画像を追加する',
          },
          {
            body: '行をドラッグするか矢印ボタンを使い、固定された［ブックマーク］行を基準に画像を移動します。不要な画像レイヤーだけを削除できます。',
            title: '前後の順序を整える',
          },
          {
            body: '［位置を編集］を選び、画像を指定してから、基準点、位置、回転、拡大率を調整します。完了したら設定へ戻ります。',
            title: '画像ごとの位置を決める',
          },
          {
            body: '設定で［保存］を選ぶと、レイヤー順、画像ファイル、位置がまとめて反映されます。［キャンセル］では下書きを破棄します。',
            title: 'オーバーレイ変更を保存する',
          },
        ],
        title: 'オーバーレイ画像レイヤー',
      },
      'backup-permissions': {
        callout: {
          body: 'エクスポート、インポート、リセット、ブックマークマネージャー、タブグループの各操作はすぐに実行され、［キャンセル］では元に戻りません。通常のフォーム設定は［保存］するまで下書きです。',
          title: '設定にはすぐ実行される操作があります',
          tone: 'warning',
        },
        description:
          '持ち運べる設定バックアップを作成し、Chrome 権限と各リセットが削除する範囲を確認します。',
        details: [
          {
            body: 'JSON には保存済みのレイアウトと表示設定、グループ設定、言語、Custom CSS、カスタム favicon、背景情報とメディア、オーバーレイのレイヤー情報と画像データが含まれます。Chrome ブックマーク、Chrome タブグループ、権限、未保存の下書き、チュートリアル完了状態、グループの展開状態は含まれません。ローカルメディアを埋め込む場合があるため、ファイルは非公開で保管してください。',
            title: 'エクスポートには何が含まれますか？',
          },
          {
            body: 'ワークスペースの表示には storage と bookmarks が常に必要です。任意の tabGroups は、解除するまで繰り返し使える状態で保持されます。tabs は、明示的な取り込みで開いているタブのタイトルと URL を読む間だけ要求され、完了またはキャンセル後に解除されます。',
            title: 'それぞれの権限はなぜ必要ですか？',
          },
        ],
        facts: [
          '同じ端末でも、別の Chrome プロフィールや別の拡張機能 ID には独立した保存領域があります。',
          'エクスポートとインポートで、その境界を越えて Starlit 設定、カスタム favicon、アップロードした背景、オーバーレイ画像を移せます。',
          'インポート時、カスタム favicon は移行先の設定へ merge されます。バックアップにない移行先の favicon 設定はそのまま残ります。',
          '［テーマをリセット］は色テーマだけを戻します。［すべてリセット］は Starlit の設定、キャッシュ、カスタム favicon、ローカル背景、オーバーレイ画像も削除します。次の読み込み時には同梱の Getting 画像が復元されます。',
          'どちらのリセットも Chrome ブックマークや取り込んだフォルダーを削除しません。［すべてリセット］でも、チュートリアル完了状態、グループの展開状態、任意の tabGroups 接続は残ります。',
        ],
        media: [
          {
            alt: '言語、フォント、ガイド、エクスポート、インポートが表示された Starlit の一般設定',
            caption:
              'エクスポート、インポート、リセットは一般設定にあり、選ぶとすぐに実行されます。',
            src: '/assets/guide/settings-general.jpg',
          },
        ],
        steps: [
          {
            body: '設定の［一般］を開き、［エクスポート］を選びます。ダウンロードした JSON は自分で管理できる場所に保管してください。',
            title: 'バックアップを作成する',
          },
          {
            body: '移行先の Chrome プロフィールまたは Starlit で［インポート］を選び、その JSON を指定します。復元に成功するとページが再読み込みされます。',
            title: '移行先で復元する',
          },
          {
            body: '［ブックマークグループ］でタブグループへの接続状態を確認します。任意の tabGroups 権限を保持したくない場合は、そこで接続を解除します。',
            title: '任意の権限を確認する',
          },
          {
            body: '先にエクスポートし、範囲を確認してから［テーマをリセット］または［すべてリセット］を選びます。リセットはすぐに適用され、ページが再読み込みされます。',
            title: '意図してリセットする',
          },
        ],
        title: 'バックアップ・復元・権限・リセット',
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
            body: '右下の設定ボタンから［一般］［外観］［配置］［CSS］［ブックマークグループ］を開けます。',
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
            body: 'フォルダーが選択中のルート配下にあり、［ブックマークグループ］で表示対象になっているか確認します。Chrome のツリーを最近変えた場合は、新しいタブも開き直してください。',
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
            body: '［配置］を開き、コンパクトなページ表示またはスクロールする展開表示、ブックマーク展開、アイコンの向きを選びます。',
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
          body: 'データが見えないとき、最初に［すべてリセット］を実行しないでください。期待する設定が残る環境から先にエクスポートし、Chrome プロフィール、拡張機能 ID、権限、背景の入力元を確認します。',
          title: '復元できるコピーを先に守る',
          tone: 'warning',
        },
        description:
          'ブックマーク、タブグループ、背景、設定が見えないとき、リセット前にデータの所有者と保存領域の境界を確認します。',
        details: [
          {
            body: '同じ Store 版の通常更新は拡張機能 ID を維持し、保存領域も保持します。Store 版、unpacked 版、別の Chrome プロフィール、別ディレクトリから読み直した unpacked 版は、別の保存領域を使う場合があります。古い環境からエクスポートし、新しい環境へインポートしてください。',
            title:
              '別のビルドを入れたら設定が消えたように見えるのはなぜですか？',
          },
          {
            body: '保存済みグループを Chrome で開き、取り込み画面を開き直し、求められた任意権限を許可します。閉じた Saved Tab Group は一覧に表示されません。',
            title: 'タブグループがまだ見つからない場合は？',
          },
          {
            body: 'アップロードしたメディアは一つの拡張機能プロフィールの IndexedDB にあります。エクスポートとインポートを使わない限り、Chrome Sync で別端末には届きません。URL 背景は設定として同期できますが、提供元へ接続できる必要があります。',
            title: '別の端末で背景が表示されないのはなぜですか？',
          },
        ],
        facts: [
          '新しいタブを開き直すと Chrome ブックマークを再読み込みし、古い表示が原因の問題を解消できます。',
          '同じ ID の拡張機能更新は Starlit の保存領域を維持しますが、別 ID と別 Chrome プロフィールは自動共有しません。',
          '［すべてリセット］は Starlit の設定とローカルメディアを消しますが、Chrome ブックマークツリーは削除しません。',
        ],
        media: [],
        steps: [
          {
            body: '見えないものを特定します。Chrome ブックマークの内容、開いているタブグループ、Starlit の設定、ローカルでアップロードした背景のどれかを確認します。',
            title: 'データの所有者を特定する',
          },
          {
            body: 'ブックマーク変更なら新しいタブを開き直します。タブグループなら Chrome でグループを開き、ブックマークグループ設定の接続状態を確認します。',
            title: '正しい情報源を更新する',
          },
          {
            body: '想定した Chrome プロフィールと Starlit を使っているか確認します。別の拡張機能 ID は sync、local、IndexedDB を共有しません。',
            title: '保存領域の境界を確認する',
          },
          {
            body: '復元できる設定をエクスポートします。その後でテーマのみ、またはすべてをリセットし、解決しなければ下のホームページや issue tracker を利用してください。',
            title: 'リセット前にバックアップする',
          },
        ],
        title: 'トラブルシューティング',
      },
    },
    starlitData: {
      items: [
        'グループの表示と順序、ブックマークルート、レイアウト、色、フォント、言語、Custom CSS',
        'カスタム favicon、キャッシュ、グループの展開・折りたたみ状態',
        '背景とオーバーレイの情報、および拡張機能プロフィール内にローカル保存したメディア',
      ],
      title: 'Starlit は表示設定と端末ごとのデータを保存します',
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
      ],
      title: 'Chrome이 원본을 관리합니다',
    },
    dataOwnershipDescription:
      'Starlit은 Chrome이 관리하는 내용과 자체 화면 설정을 함께 사용합니다. 이 경계를 알면 무엇이 동기화되고, 초기화 때 무엇이 사라지며, 어디에서 항목을 편집해야 하는지 판단하기 쉽습니다.',
    dataOwnershipTitle: 'Chrome 데이터와 Starlit 데이터',
    detailsTitle: '자주 묻는 질문',
    factsTitle: '알아두면 좋은 점',
    intro:
      'Chrome 북마크를 집중하기 좋은 새 탭 작업 공간으로 만들고, 북마크 폴더와 live tab group을 오가며, 설정을 안전하게 옮기기 위한 실용 가이드입니다.',
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
    sections: {
      appearance: {
        callout: {
          body: '배경 URL은 설정과 함께 저장되어 Chrome Sync를 따라갈 수 있지만, 실제 파일은 제공처에서 불러옵니다. 업로드한 파일은 이 기기의 현재 확장 프로그램 profile에 있는 IndexedDB에만 저장됩니다.',
          title: 'URL과 업로드 파일은 이동 방식이 다릅니다',
          tone: 'warning',
        },
        description:
          'Chrome 북마크 내용은 바꾸지 않고 배경, 컨테이너, 북마크, 폴더, 색상, Custom CSS를 조정합니다.',
        details: [
          {
            body: '동기화된 설정에서 같은 주소를 쓰려면 URL을, 미디어를 로컬에만 두려면 파일 업로드를 사용하세요. 업로드한 파일을 다른 profile이나 extension ID로 옮겨야 한다면 내보내기와 가져오기를 사용해야 합니다.',
            title: 'URL과 파일 업로드 중 무엇을 선택할까요?',
          },
          {
            body: 'Starlit은 적용 전에 안전하지 않은 규칙과 선언을 제거합니다. CSS 화면에 안내된 공개 data-starlit-part selector부터 사용하고 저장 전에 미리보기를 확인하세요.',
            title: 'Custom CSS 일부가 사라진 이유는 무엇인가요?',
          },
        ],
        facts: [
          '이미지·동영상 URL은 배경 설정으로 저장되고 Chrome이 제공처에서 직접 불러옵니다.',
          '업로드한 이미지·동영상은 로컬에서 처리해 IndexedDB에 저장하며 Starlit 서버로 전송하지 않습니다.',
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
            body: '배경 가져오기 방식으로 URL 또는 파일 업로드를 고른 뒤 이미지·동영상을 지정합니다. 현재 배경을 제거할 수도 있습니다.',
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
          body: '레이어 순서, 새로 추가한 이미지, 위치 편집은 저장을 선택하기 전까지 설정 draft입니다. 취소하면 오버레이 draft 전체를 버립니다.',
          title: '레이어 draft 전체를 저장합니다',
          tone: 'info',
        },
        description:
          'Local 이미지를 북마크 화면 앞이나 뒤에 배치하고, 평소 북마크 사용을 막지 않으면서 이미지별 위치를 조정합니다.',
        details: [
          {
            body: '북마크 행은 전체 북마크 화면을 뜻하며 삭제할 수 없습니다. 앞에서 뒤 순서인 목록에서 북마크보다 위에 둔 이미지는 북마크 앞에, 아래에 둔 이미지는 뒤에 표시됩니다.',
            title: '북마크 레이어는 무엇인가요?',
          },
          {
            body: '각 이미지는 화면의 9개 기준점 중 하나에서 pixel 단위 거리를 유지합니다. 화면 크기가 달라져도 위치 관계를 유지하도록 가장 가까운 모서리, 변, 중앙을 고르세요.',
            title: '어떤 기준점을 선택해야 하나요?',
          },
        ],
        facts: [
          '새로 설치하거나 전체 초기화한 profile에는 오른쪽 아래를 기준으로 한 기본 Getting 이미지가 북마크 앞에 표시됩니다. 다른 이미지처럼 이동, 순서 변경, 삭제할 수 있습니다.',
          '업로드한 이미지는 WebP로 변환해 현재 extension profile의 IndexedDB에 저장하며 Starlit 서버로 전송하지 않습니다.',
          '위치 편집에서는 drag, 방향키 이동, -180°부터 180°까지 회전, 10%부터 400%까지 확대·축소를 지원합니다. Shift와 방향키를 함께 누르면 10px씩 이동합니다.',
          '북마크 앞에 둔 이미지도 평소 화면에서는 pointer event를 받지 않아 북마크 link를 그대로 선택할 수 있습니다.',
        ],
        media: [],
        steps: [
          {
            body: '설정 > 레이어를 엽니다. 목록은 화면의 앞에서 뒤 순서로 표시됩니다.',
            title: '레이어 목록 열기',
          },
          {
            body: '이미지 추가를 선택하고 이미지 파일을 하나 이상 고릅니다. 각 파일은 draft 안의 별도 레이어가 됩니다.',
            title: '오버레이 이미지 추가하기',
          },
          {
            body: '행을 drag하거나 화살표 control을 사용해 고정된 북마크 행을 기준으로 이미지를 옮깁니다. 필요 없는 이미지 레이어만 삭제할 수 있습니다.',
            title: '앞뒤 순서 정하기',
          },
          {
            body: '위치 편집을 선택하고 이미지를 고른 뒤 기준점, 위치, 회전, 확대 비율을 조정합니다. 마치면 설정으로 돌아갑니다.',
            title: '이미지별 위치 정하기',
          },
          {
            body: '설정에서 저장을 선택하면 레이어 순서, 이미지 파일, 위치를 함께 반영합니다. 취소를 선택하면 draft를 버립니다.',
            title: '오버레이 변경 저장하기',
          },
        ],
        title: '오버레이 이미지 레이어',
      },
      'backup-permissions': {
        callout: {
          body: '내보내기, 가져오기, 초기화, 북마크 관리자 열기, 탭 그룹 작업은 즉시 실행되며 취소로 되돌릴 수 없습니다. 일반 form 설정은 저장을 누르기 전까지 draft로 남습니다.',
          title: '설정 안에도 즉시 실행되는 작업이 있습니다',
          tone: 'warning',
        },
        description:
          '옮길 수 있는 설정 backup을 만들고, Chrome 권한과 각 초기화 작업이 지우는 범위를 확인합니다.',
        details: [
          {
            body: 'JSON에는 저장된 레이아웃과 화면 설정, 그룹 설정, 언어, Custom CSS, custom favicon, 배경 정보와 미디어, 오버레이 레이어 정보와 이미지 데이터가 포함됩니다. Chrome 북마크, Chrome 탭 그룹, 권한, 저장하지 않은 draft, tutorial 완료 상태, 그룹 펼침·접힘 상태는 포함되지 않습니다. Local media가 들어갈 수 있으므로 파일을 공개하지 마세요.',
            title: '내보내기 파일에는 무엇이 들어 있나요?',
          },
          {
            body: '작업 공간을 표시하려면 storage와 bookmarks 권한이 항상 필요합니다. 선택 권한인 tabGroups는 연결을 해제할 때까지 반복 작업에 사용할 수 있게 유지됩니다. tabs는 명시적인 가져오기에서 열린 탭의 제목과 URL을 읽는 동안만 요청하며 완료하거나 취소하면 회수합니다.',
            title: '각 Chrome 권한은 왜 필요한가요?',
          },
        ],
        facts: [
          '같은 컴퓨터에서도 Chrome profile이나 extension ID가 다르면 별도 저장 공간을 사용합니다.',
          '내보내기와 가져오기를 사용하면 그 경계를 넘어 Starlit 설정, custom favicon, 업로드한 배경, 오버레이 이미지를 옮길 수 있습니다.',
          '가져올 때 custom favicon 설정은 이동할 환경의 기존 설정과 merge됩니다. Backup에 없는 기존 favicon 설정은 그대로 남습니다.',
          '테마 초기화는 색상 테마만 되돌립니다. 전체 초기화는 Starlit 설정, cache, custom favicon, local background media, 오버레이 이미지도 지웁니다. 다음에 불러올 때 기본 Getting 이미지가 다시 표시됩니다.',
          '두 초기화 모두 Chrome 북마크와 가져온 폴더를 삭제하지 않습니다. 전체 초기화 후에도 tutorial 완료 상태, 그룹 펼침·접힘 상태, 선택 권한인 tabGroups 연결은 남습니다.',
        ],
        media: [
          {
            alt: '언어, 폰트, 사용 가이드, 내보내기와 가져오기가 보이는 Starlit 일반 설정',
            caption:
              '내보내기, 가져오기, 초기화는 일반 설정에 있으며 선택하면 즉시 실행됩니다.',
            src: '/assets/guide/settings-general.jpg',
          },
        ],
        steps: [
          {
            body: '설정 > 일반에서 내보내기를 선택합니다. 내려받은 JSON 파일은 직접 관리할 수 있는 곳에 보관하세요.',
            title: 'Backup 만들기',
          },
          {
            body: '이동할 Chrome profile 또는 Starlit 설치에서 가져오기를 선택하고 해당 JSON 파일을 엽니다. 복원에 성공하면 페이지를 다시 불러옵니다.',
            title: '이동할 환경에서 복원하기',
          },
          {
            body: '북마크 그룹 화면에서 탭 그룹 접근 연결 상태를 확인합니다. 선택 권한인 tabGroups를 더는 유지하지 않으려면 여기서 연결을 해제하세요.',
            title: '선택 권한 확인하기',
          },
          {
            body: '먼저 내보낸 뒤 범위를 확인하고 테마 초기화 또는 전체 초기화를 선택합니다. 초기화는 즉시 적용되고 페이지를 다시 불러옵니다.',
            title: '의도적으로 초기화하기',
          },
        ],
        title: 'Backup·복원·권한·초기화',
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
            body: '오른쪽 아래 설정 버튼에서 일반, 외형, 배치, CSS, 북마크 그룹 화면을 열 수 있습니다.',
            title: '설정 찾기',
          },
          {
            body: '일반 설정은 미리보기로 시도한 뒤 저장을 눌러 반영합니다. Draft를 버리려면 취소를 선택하세요.',
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
            body: '해당 폴더가 선택한 루트 아래에 있는지, 북마크 그룹 화면에서 표시하도록 설정했는지 확인하세요. 최근 Chrome 북마크 트리를 바꿨다면 새 탭도 다시 열어야 합니다.',
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
            body: '배치 화면에서 간결한 페이지형 또는 스크롤하는 펼치기형을 고르고 북마크 펼치기와 icon 방향을 정합니다.',
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
          body: '데이터가 사라진 것처럼 보일 때 전체 초기화부터 하지 마세요. 원하는 설정이 남아 있는 설치에서 먼저 내보낸 뒤 Chrome profile, extension ID, 권한, 배경 가져오기 방식을 확인하세요.',
          title: '복구 가능한 사본부터 지키세요',
          tone: 'warning',
        },
        description:
          '북마크, 탭 그룹, 배경, 설정이 보이지 않을 때 초기화보다 먼저 데이터 소유권과 저장 공간 경계를 확인합니다.',
        details: [
          {
            body: '같은 Store 설치의 정상 업데이트는 같은 extension ID를 유지하므로 저장 공간도 보존합니다. Store build, unpacked build, 다른 Chrome profile, 다른 경로에서 다시 불러온 unpacked build는 별도 저장 공간을 사용할 수 있습니다. 이전 설치에서 내보내고 새 설치에서 가져오세요.',
            title: '다른 build를 설치한 뒤 설정이 사라진 것처럼 보여요',
          },
          {
            body: '저장된 그룹을 Chrome에서 열고 가져오기 화면을 다시 시작한 뒤 요청되는 선택 권한을 허용하세요. 닫힌 Saved Tab Group은 목록에 표시되지 않습니다.',
            title: '탭 그룹이 계속 보이지 않아요',
          },
          {
            body: '업로드한 미디어는 한 extension profile의 IndexedDB에 있습니다. 내보내기와 가져오기로 옮기지 않으면 Chrome Sync를 통해 다른 기기에 나타나지 않습니다. URL 배경은 설정이 동기화될 수 있지만 제공처에 접속할 수 있어야 합니다.',
            title: '다른 기기에서 배경이 보이지 않아요',
          },
        ],
        facts: [
          '새 탭을 다시 열면 Chrome 북마크를 새로 읽으므로 오래된 화면 snapshot 문제를 해결할 수 있습니다.',
          '같은 ID의 extension update는 Starlit 저장 공간을 유지하지만 다른 ID와 Chrome profile은 자동으로 공유하지 않습니다.',
          '전체 초기화는 Starlit 설정과 local media를 지우지만 Chrome 북마크 트리는 삭제하지 않습니다.',
        ],
        media: [],
        steps: [
          {
            body: '무엇이 보이지 않는지 먼저 구분합니다. Chrome 북마크 내용, 열린 탭 그룹, Starlit 화면 설정, local background media 중 어디에 해당하는지 확인하세요.',
            title: '데이터 소유자 확인하기',
          },
          {
            body: '북마크 변경은 새 탭을 다시 엽니다. 탭 그룹은 Chrome에서 해당 그룹을 열고 북마크 그룹 화면의 연결 상태를 확인합니다.',
            title: '올바른 원본 새로 읽기',
          },
          {
            body: '예상한 Chrome profile과 Starlit 설치를 사용 중인지 확인합니다. extension ID가 다르면 sync, local, IndexedDB 저장 공간도 나뉩니다.',
            title: '저장 공간 경계 확인하기',
          },
          {
            body: '복구 가능한 설정을 내보냅니다. 그다음 테마 또는 전체 초기화를 시도하고, 계속 문제가 있으면 아래 홈페이지나 issue tracker를 이용하세요.',
            title: '초기화 전에 backup하기',
          },
        ],
        title: '문제 해결',
      },
    },
    starlitData: {
      items: [
        '그룹 표시와 순서, 북마크 루트, 레이아웃, 색상, 글꼴, 언어, Custom CSS',
        'Custom favicon, cache, 그룹의 펼침·접힘 상태',
        '배경과 오버레이 정보, extension profile에 local로 저장한 media',
      ],
      title: 'Starlit은 화면 설정과 기기별 데이터를 저장합니다',
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
