import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { I18nProvider } from './I18nProvider';

describe('I18nProvider', () => {
  it('keeps the document language in sync with the active locale', async () => {
    const { rerender } = render(
      <I18nProvider locale="ja">
        <span>content</span>
      </I18nProvider>,
    );

    await waitFor(() => expect(document.documentElement.lang).toBe('ja'));

    rerender(
      <I18nProvider locale="en">
        <span>content</span>
      </I18nProvider>,
    );

    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
  });
});
