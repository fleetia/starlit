import type { ReactElement } from 'react';
import { Action, Stack, Text } from '@fleetia/lagrange';

import { BookmarkTreeSelector } from '../../bookmarks/BookmarkTreeSelector';
import type { Bookmark, GroupPreference } from '../../bookmarks/types';
import { useTranslation } from '../../i18n';
import * as styles from '../OptionsSidebar.css';
import { SettingsSection } from './controls';
import { TabGroupImportSection } from './TabGroupImportSection';

type GroupsPanelProps = {
  guideHref?: string;
  groupPreferences: GroupPreference[];
  onBookmarksImported?: () => Promise<void>;
  onOpenBookmarkManager: () => Promise<void>;
  onSelectRoot: (path: string[], rootId?: string) => void;
  onSiblingReorder: (parentKey: string, titles: string[]) => void;
  onToggleVisibility: (key: string) => void;
  orderedTree: Bookmark[];
  rootId?: string;
  rootPath: string[];
  siblingOrder: Record<string, string[]>;
};

export function GroupsPanel({
  guideHref,
  groupPreferences,
  onBookmarksImported,
  onOpenBookmarkManager,
  onSelectRoot,
  onSiblingReorder,
  onToggleVisibility,
  orderedTree,
  rootId,
  rootPath,
  siblingOrder,
}: GroupsPanelProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Stack gap="lg">
      <SettingsSection
        aside={
          <Action onClick={() => void onOpenBookmarkManager()} size="compact">
            {t('groups.openManager')}
          </Action>
        }
        description={
          <>
            {t('groups.connectionDescription')}
            <br />
            {t('groups.localPreferences')}
          </>
        }
        title={t('groups.connectionTitle')}
      >
        <details
          className={styles.bookmarkGuide}
          data-starlit-part="bookmark-connection-guide"
        >
          <summary className={styles.bookmarkGuideSummary}>
            {t('groups.guideSummary')}
          </summary>
          <Stack className={styles.bookmarkGuideContent} gap="xs">
            <Text as="p" variant="caption">
              {t('groups.guideChrome')}
            </Text>
            <Text as="p" variant="caption">
              {t('groups.guideStarlit')}
            </Text>
            <Text as="p" tone="critical" variant="caption">
              {t('groups.guideDelete')}
            </Text>
          </Stack>
        </details>
      </SettingsSection>
      <TabGroupImportSection
        defaultDestinationId={rootId}
        guideHref={guideHref}
        onBookmarksImported={onBookmarksImported}
      />
      <BookmarkTreeSelector
        bookmarks={orderedTree}
        groupPreferences={groupPreferences}
        onSelectRoot={onSelectRoot}
        onSiblingReorder={onSiblingReorder}
        onToggleVisibility={onToggleVisibility}
        rootId={rootId}
        rootPath={rootPath}
        siblingOrder={siblingOrder}
      />
    </Stack>
  );
}
