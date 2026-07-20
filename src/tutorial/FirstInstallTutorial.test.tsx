import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FirstInstallTutorial } from './FirstInstallTutorial';

const storageMocks = vi.hoisted(() => ({
  get: vi.fn<(key: string) => Promise<unknown>>(),
  set: vi.fn<(items: Record<string, unknown>) => Promise<void>>(),
}));

vi.mock('../platform/storage/storage', () => ({
  default: {
    local: {
      get: storageMocks.get,
      set: storageMocks.set,
    },
  },
}));

beforeEach((): void => {
  storageMocks.get.mockResolvedValue('pending');
  storageMocks.set.mockResolvedValue(undefined);
});

describe('FirstInstallTutorial', () => {
  it('waits for app readiness and ignores profiles without a pending marker', async () => {
    const { unmount } = render(
      <FirstInstallTutorial isAppReady={false} locale="ko" />,
    );

    await waitFor(() => expect(storageMocks.get).toHaveBeenCalledOnce());
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();

    storageMocks.get.mockResolvedValue(undefined);
    render(<FirstInstallTutorial isAppReady locale="ko" />);
    await waitFor(() => expect(storageMocks.get).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('moves through four steps and links to localized guide sections', async () => {
    render(<FirstInstallTutorial isAppReady locale="en" />);
    await screen.findByText('Step 1 of 4');
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Skip' }),
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Step 4 of 4')).toBeTruthy();
    const baseHref = chrome.runtime.getURL
      ? chrome.runtime.getURL('guide.html')
      : '/guide.html';
    expect(
      screen
        .getByRole('link', { name: 'Read about Chrome tab groups' })
        .getAttribute('href'),
    ).toBe(`${baseHref}?locale=en#tab-groups`);

    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(storageMocks.set).toHaveBeenCalledWith({
      tutorialStatus: 'completed',
    });
  });

  it('keeps the tutorial open and reports a persistence failure', async () => {
    storageMocks.set.mockRejectedValue(new Error('write failed'));
    render(<FirstInstallTutorial isAppReady locale="ko" />);
    await screen.findByText('4단계 중 1단계');

    fireEvent.click(screen.getByRole('button', { name: '건너뛰기' }));

    expect(
      await screen.findByText(
        '튜토리얼 진행 상태를 저장하지 못했습니다. 다시 시도해 주세요.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('persists completion when the close control dismisses the tutorial', async () => {
    render(<FirstInstallTutorial isAppReady locale="ja" />);
    await screen.findByText('4ステップ中1');

    fireEvent.click(
      screen.getByRole('button', { name: 'チュートリアルを閉じる' }),
    );

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(storageMocks.set).toHaveBeenCalledWith({
      tutorialStatus: 'completed',
    });
  });
});
