import type { ReactElement } from 'react';
import { useId, useMemo } from 'react';
import {
  Action,
  Button,
  Dialog,
  FormField,
  Inline,
  Select,
  Stack,
  Text,
} from '@fleetia/lagrange';

import type { Locale } from '../../i18n';
import { useTranslation } from '../../i18n';
import type {
  BookmarkDestination,
  TabGroupImportResult,
} from '../../platform/tabGroups/importOpenTabGroups';
import * as sharedStyles from '../OptionsSidebar.css';
import { SettingsSection } from './controls';
import * as styles from './TabGroupImportSection.css';
import { useTabGroupImport } from './useTabGroupImport';

type TabGroupImportSectionProps = {
  defaultDestinationId?: string;
  guideHref?: string;
  onBookmarksImported?: () => Promise<void>;
};

type Copy = {
  cancel: string;
  close: string;
  connected: string;
  destination: string;
  disconnect: string;
  disconnectFailed: string;
  disconnected: string;
  empty: string;
  failed: string;
  guide: string;
  importAction: string;
  importDescription: string;
  importFailed: string;
  importTitle: string;
  importing: string;
  loading: string;
  omitted: string;
  permissionDenied: string;
  releaseAccess: string;
  releaseFailed: string;
  refreshFailed: string;
  result: string;
  rollbackFailed: string;
  selectedRequired: string;
  skipped: string;
  succeeded: string;
  tabCount: (count: number) => string;
  unavailable: string;
  untitled: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    cancel: 'Cancel',
    close: 'Done',
    connected: 'Tab group access is connected.',
    destination: 'Bookmark destination',
    disconnect: 'Disconnect',
    disconnectFailed: 'Could not disconnect tab group access.',
    disconnected: 'Tab group access is not connected.',
    empty: 'No open tab groups were found. Open a saved group in Chrome first.',
    failed: 'failed',
    guide: 'Open the tab group guide',
    importAction: 'Import selected groups',
    importDescription:
      'Copy currently open Chrome tab groups into bookmark folders. This is a one-time copy, not a live sync.',
    importFailed: 'The tab groups could not be imported.',
    importTitle: 'Import Chrome tab groups',
    importing: 'Importing tab groups…',
    loading: 'Loading open tab groups…',
    omitted: 'tabs omitted',
    permissionDenied: 'Tab and tab group access was not granted.',
    releaseAccess: 'Release tab access',
    releaseFailed:
      'Temporary tab access could not be released. Try releasing it again.',
    refreshFailed:
      'The bookmarks were imported, but Starlit could not refresh the list.',
    result: 'Import result',
    rollbackFailed: 'Cleanup was incomplete',
    selectedRequired: 'Select at least one tab group.',
    skipped: 'skipped',
    succeeded: 'imported',
    tabCount: (count) => `${count} tabs`,
    unavailable: 'Chrome tab group APIs are unavailable in this browser.',
    untitled: 'Untitled Tab Group',
  },
  ja: {
    cancel: 'キャンセル',
    close: '完了',
    connected: 'タブグループへのアクセスが接続されています。',
    destination: 'ブックマークの保存先',
    disconnect: '接続を解除',
    disconnectFailed: 'タブグループへのアクセスを解除できませんでした。',
    disconnected: 'タブグループへのアクセスは接続されていません。',
    empty:
      '開いているタブグループがありません。Chromeで保存済みグループを先に開いてください。',
    failed: '失敗',
    guide: 'タブグループのガイドを開く',
    importAction: '選択したグループを取り込む',
    importDescription:
      '現在開いているChromeタブグループをブックマークフォルダにコピーします。一度だけのコピーで、同期はされません。',
    importFailed: 'タブグループを取り込めませんでした。',
    importTitle: 'Chromeタブグループを取り込む',
    importing: 'タブグループを取り込み中…',
    loading: '開いているタブグループを読み込み中…',
    omitted: '件のタブを除外',
    permissionDenied: 'タブとタブグループへのアクセスが許可されませんでした。',
    releaseAccess: 'タブへのアクセスを解除',
    releaseFailed:
      '一時的なタブへのアクセスを解除できませんでした。もう一度お試しください。',
    refreshFailed:
      'ブックマークは取り込まれましたが、Starlitの一覧を更新できませんでした。',
    result: '取り込み結果',
    rollbackFailed: '後片付けが完了しませんでした',
    selectedRequired: 'タブグループを1つ以上選択してください。',
    skipped: 'スキップ',
    succeeded: '成功',
    tabCount: (count) => `${count}件のタブ`,
    unavailable: 'このブラウザではChromeタブグループAPIを利用できません。',
    untitled: '名称未設定のタブグループ',
  },
  ko: {
    cancel: '취소',
    close: '완료',
    connected: '탭 그룹 접근 권한이 연결되어 있습니다.',
    destination: '북마크 저장 위치',
    disconnect: '연결 해제',
    disconnectFailed: '탭 그룹 접근 권한을 해제하지 못했습니다.',
    disconnected: '탭 그룹 접근 권한이 연결되어 있지 않습니다.',
    empty:
      '현재 열려 있는 탭 그룹이 없습니다. Chrome에서 저장된 그룹을 먼저 열어주세요.',
    failed: '실패',
    guide: '탭 그룹 사용 가이드 열기',
    importAction: '선택한 그룹 가져오기',
    importDescription:
      '현재 열려 있는 Chrome 탭 그룹을 북마크 폴더로 복사합니다. 한 번만 복사되며 자동 동기화되지 않습니다.',
    importFailed: '탭 그룹을 가져오지 못했습니다.',
    importTitle: 'Chrome 탭 그룹 가져오기',
    importing: '탭 그룹을 가져오는 중…',
    loading: '열려 있는 탭 그룹을 불러오는 중…',
    omitted: '개 탭 제외',
    permissionDenied: '탭 및 탭 그룹 접근 권한이 허용되지 않았습니다.',
    releaseAccess: '탭 접근 권한 해제',
    releaseFailed:
      '임시 탭 접근 권한을 해제하지 못했습니다. 다시 시도해주세요.',
    refreshFailed:
      '북마크는 가져왔지만 Starlit 목록을 새로고침하지 못했습니다.',
    result: '가져오기 결과',
    rollbackFailed: '정리 작업 미완료',
    selectedRequired: '탭 그룹을 하나 이상 선택해주세요.',
    skipped: '건너뜀',
    succeeded: '가져옴',
    tabCount: (count) => `${count}개 탭`,
    unavailable: '이 브라우저에서는 Chrome 탭 그룹 API를 사용할 수 없습니다.',
    untitled: '이름 없는 탭 그룹',
  },
};

function getResultSummary(result: TabGroupImportResult, copy: Copy): string {
  const parts = [
    `${result.importedCount} ${copy.succeeded}`,
    `${result.failedCount} ${copy.failed}`,
    `${result.skippedCount} ${copy.skipped}`,
  ];

  if (result.omittedTabCount > 0) {
    parts.push(`${result.omittedTabCount} ${copy.omitted}`);
  }

  return parts.join(' · ');
}

function getDestinationLabel(destination: BookmarkDestination): string {
  return destination.path.join(' / ') || destination.title;
}

function getDestinationLabels(
  destinations: BookmarkDestination[],
): Map<string, string> {
  const labelCounts = destinations.reduce<Map<string, number>>(
    (counts, destination) => {
      const label = getDestinationLabel(destination);
      counts.set(label, (counts.get(label) ?? 0) + 1);
      return counts;
    },
    new Map(),
  );

  return new Map(
    destinations.map((destination) => {
      const label = getDestinationLabel(destination);
      return [
        destination.id,
        labelCounts.get(label) === 1 ? label : `${label} [${destination.id}]`,
      ];
    }),
  );
}

function getGroupResultLabel(
  group: TabGroupImportResult['groups'][number],
  copy: Copy,
): string {
  if (group.rollbackFailed) {
    return `${copy.failed} · ${copy.rollbackFailed}`;
  }

  switch (group.status) {
    case 'imported':
      return copy.succeeded;
    case 'failed':
      return copy.failed;
    case 'skipped':
      return copy.skipped;
  }
}

export function TabGroupImportSection({
  defaultDestinationId,
  guideHref,
  onBookmarksImported,
}: TabGroupImportSectionProps): ReactElement {
  const { locale } = useTranslation();
  const copy = COPY[locale];
  const descriptionId = `starlit-tab-group-import-${useId()}`;
  const {
    destinations,
    destinationId,
    groups,
    handleCloseImporter,
    handleDialogOpenChange,
    handleDisconnect,
    handleGroupToggle,
    handleImport,
    handleOpenImporter,
    hasReleaseFailure,
    isConnected,
    isDialogOpen,
    isImporting,
    isLoading,
    releaseTemporaryAccess,
    result,
    selectedGroupIds,
    setDestinationId,
    status,
  } = useTabGroupImport({
    copy,
    defaultDestinationId,
    onBookmarksImported,
  });
  const destinationLabels = useMemo(
    () => getDestinationLabels(destinations),
    [destinations],
  );

  return (
    <>
      <SettingsSection
        description={copy.importDescription}
        title={copy.importTitle}
      >
        <Stack gap="sm">
          <Inline className={styles.actions} gap="sm" wrap>
            <Button
              disabled={isLoading || hasReleaseFailure}
              onClick={() => void handleOpenImporter()}
              variant="secondary"
            >
              {isLoading ? copy.loading : copy.importTitle}
            </Button>
            {isConnected ? (
              <Action
                disabled={isLoading || isDialogOpen}
                onClick={() => void handleDisconnect()}
                size="compact"
                variant="quiet"
              >
                {copy.disconnect}
              </Action>
            ) : null}
            {guideHref ? (
              <a
                className={sharedStyles.link}
                href={guideHref}
                rel="noopener noreferrer"
                target="_blank"
              >
                {copy.guide}
              </a>
            ) : null}
          </Inline>
          <Text as="p" tone="muted" variant="caption">
            {isConnected ? copy.connected : copy.disconnected}
          </Text>
          {status ? (
            <Text
              aria-live="polite"
              as="p"
              className={styles.status}
              tone="critical"
              variant="caption"
            >
              {status}
            </Text>
          ) : null}
          {hasReleaseFailure ? (
            <Inline gap="sm" wrap>
              <Text as="p" tone="critical" variant="caption">
                {copy.releaseFailed}
              </Text>
              <Action
                onClick={() => void releaseTemporaryAccess()}
                size="compact"
              >
                {copy.releaseAccess}
              </Action>
            </Inline>
          ) : null}
        </Stack>
      </SettingsSection>
      <Dialog
        aria-describedby={descriptionId}
        closeLabel={copy.cancel}
        footer={
          result ? (
            <Button onClick={() => void handleCloseImporter()}>
              {copy.close}
            </Button>
          ) : (
            <Inline gap="sm" justify="end">
              <Button
                disabled={isImporting}
                onClick={() => void handleCloseImporter()}
                variant="secondary"
              >
                {copy.cancel}
              </Button>
              <Button
                disabled={
                  isImporting || selectedGroupIds.size === 0 || !destinationId
                }
                onClick={() => void handleImport()}
              >
                {isImporting ? copy.importing : copy.importAction}
              </Button>
            </Inline>
          )
        }
        isOpen={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        size="medium"
        title={copy.importTitle}
      >
        <Stack gap="md">
          <Text as="p" id={descriptionId} variant="caption">
            {copy.importDescription}
          </Text>
          {groups.length > 0 ? (
            <ul className={styles.groupList}>
              {groups.map((group) => {
                const checkboxId = `starlit-tab-group-${group.id}`;

                return (
                  <li className={styles.groupRow} key={group.id}>
                    <input
                      checked={selectedGroupIds.has(group.id)}
                      className={styles.checkbox}
                      disabled={isImporting || Boolean(result)}
                      id={checkboxId}
                      onChange={(event) =>
                        handleGroupToggle(group.id, event.currentTarget.checked)
                      }
                      type="checkbox"
                    />
                    <label className={styles.groupTitle} htmlFor={checkboxId}>
                      <Text truncate variant="label" weight="strong">
                        {group.title}
                      </Text>
                    </label>
                    <Text tone="muted" variant="caption">
                      {copy.tabCount(group.tabCount)}
                    </Text>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Text as="p" tone="muted" variant="caption">
              {copy.empty}
            </Text>
          )}
          <FormField label={copy.destination}>
            <Select
              disabled={isImporting || Boolean(result)}
              onChange={(event) => setDestinationId(event.currentTarget.value)}
              value={destinationId}
            >
              {destinations.map((destination) => (
                <option
                  disabled={!destination.isWritable}
                  key={destination.id}
                  value={destination.id}
                >
                  {destinationLabels.get(destination.id)}
                </option>
              ))}
            </Select>
          </FormField>
          {result ? (
            <Stack gap="xs">
              <Text as="p" tone="positive" variant="label" weight="strong">
                {copy.result}: {getResultSummary(result, copy)}
              </Text>
              <ul className={styles.resultList}>
                {result.groups.map((group) => (
                  <li key={group.groupId}>
                    <Text
                      as="small"
                      tone={group.status === 'failed' ? 'critical' : 'muted'}
                      variant="caption"
                    >
                      {group.folderTitle ?? group.title} —{' '}
                      {getGroupResultLabel(group, copy)}
                    </Text>
                  </li>
                ))}
              </ul>
            </Stack>
          ) : null}
          {status ? (
            <Text aria-live="polite" as="p" tone="critical" variant="caption">
              {status}
            </Text>
          ) : null}
          {hasReleaseFailure ? (
            <Text as="p" tone="critical" variant="caption">
              {copy.releaseFailed}
            </Text>
          ) : null}
        </Stack>
      </Dialog>
    </>
  );
}
