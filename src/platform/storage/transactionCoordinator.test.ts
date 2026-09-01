import { describe, expect, it, vi } from 'vitest';

import {
  createSelfRestoringTransactionStep,
  runStorageTransaction,
} from './transactionCoordinator';

describe('runStorageTransaction', () => {
  it('restores a step that mutates before rejecting', async () => {
    let value = 'before';
    const applyError = new Error('write failed after mutation');
    const step = createSelfRestoringTransactionStep(
      'local state',
      async () => {
        value = 'after';
        throw applyError;
      },
      async () => {
        value = 'before';
      },
    );

    await expect(step.apply()).rejects.toBe(applyError);
    expect(value).toBe('before');
  });

  it('surfaces both failures when a rejected write cannot restore itself', async () => {
    const applyError = new Error('write failed');
    const rollbackError = new Error('restore failed');
    const step = createSelfRestoringTransactionStep(
      'local state',
      async () => {
        throw applyError;
      },
      async () => {
        throw rollbackError;
      },
    );

    const failure = await step.apply().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors).toEqual([
      applyError,
      rollbackError,
    ]);
  });

  it('writes the commit marker after every data step', async () => {
    const events: string[] = [];

    await runStorageTransaction({
      commit: async () => {
        events.push('version');
      },
      steps: [
        {
          apply: async () => {
            events.push('asset');
          },
          name: 'asset',
          rollback: vi.fn(),
        },
        {
          apply: async () => {
            events.push('settings');
          },
          name: 'settings',
          rollback: vi.fn(),
        },
      ],
    });

    expect(events).toEqual(['asset', 'settings', 'version']);
  });

  it('rolls applied steps back in reverse order', async () => {
    const events: string[] = [];

    await expect(
      runStorageTransaction({
        commit: vi.fn(),
        steps: [
          {
            apply: async () => {
              events.push('apply:sync');
            },
            name: 'sync',
            rollback: async () => {
              events.push('rollback:sync');
            },
          },
          {
            apply: async () => {
              events.push('apply:local');
            },
            name: 'local',
            rollback: async () => {
              events.push('rollback:local');
            },
          },
          {
            apply: async () => {
              throw new Error('idb failed');
            },
            name: 'idb',
            rollback: vi.fn(),
          },
        ],
      }),
    ).rejects.toThrow('idb failed');

    expect(events).toEqual([
      'apply:sync',
      'apply:local',
      'rollback:local',
      'rollback:sync',
    ]);
  });

  it('surfaces both the transaction and rollback failures', async () => {
    const rollbackError = new Error('rollback failed');

    await expect(
      runStorageTransaction({
        commit: async () => {
          throw new Error('commit failed');
        },
        steps: [
          {
            apply: vi.fn(async () => undefined),
            name: 'scene',
            rollback: async () => {
              throw rollbackError;
            },
          },
        ],
      }),
    ).rejects.toBeInstanceOf(AggregateError);
  });
});
