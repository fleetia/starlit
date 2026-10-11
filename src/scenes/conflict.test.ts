import { describe, expect, it } from 'vitest';

import { createSceneConflictPreviews, planSceneConflicts } from './conflict';
import { createSceneFixture } from './testFixtures';

describe('scene conflict planning', () => {
  it('previews id and name collisions independently', () => {
    const existingScenes = [
      createSceneFixture({ id: 'same-id', name: 'Focus' }),
      createSceneFixture({ id: 'same-name', name: 'Focus' }),
    ];
    const incomingScenes = [
      createSceneFixture({ id: 'same-id', name: 'Focus' }),
    ];

    expect(createSceneConflictPreviews(existingScenes, incomingScenes)).toEqual(
      [
        {
          conflictingSceneId: 'same-id',
          incomingSceneId: 'same-id',
          sameNameSceneIds: ['same-id', 'same-name'],
        },
      ],
    );
  });

  it('plans add-copy, replace, and skip without mutating source scenes', () => {
    const existingScenes = [
      createSceneFixture({ createdAt: 10, id: 'replace-target' }),
    ];
    const incomingScenes = [
      createSceneFixture({ id: 'incoming-add', name: 'Add' }),
      createSceneFixture({ id: 'incoming-replace', name: 'Replacement' }),
      createSceneFixture({ id: 'incoming-skip', name: 'Skip' }),
    ];
    const originalIncoming = structuredClone(incomingScenes);

    const plan = planSceneConflicts(
      existingScenes,
      incomingScenes,
      [
        { action: 'add-copy', incomingSceneId: 'incoming-add' },
        {
          action: 'replace',
          incomingSceneId: 'incoming-replace',
          targetSceneId: 'replace-target',
        },
        { action: 'skip', incomingSceneId: 'incoming-skip' },
      ],
      { createId: () => 'new-copy', now: 500 },
    );

    expect(plan.additions[0]?.scene).toMatchObject({
      createdAt: 500,
      id: 'new-copy',
      name: 'Add',
      updatedAt: 500,
    });
    expect(plan.replacements[0]).toMatchObject({
      incomingSceneId: 'incoming-replace',
      scene: {
        createdAt: 10,
        id: 'replace-target',
        name: 'Replacement',
        updatedAt: 500,
      },
      targetSceneId: 'replace-target',
    });
    expect(plan.skippedSceneIds).toEqual(['incoming-skip']);
    expect(incomingScenes).toEqual(originalIncoming);
  });

  it('requires a decision for every incoming scene', () => {
    expect(() =>
      planSceneConflicts([], [createSceneFixture()], [], {
        createId: () => 'copy',
        now: 500,
      }),
    ).toThrow('Import decision is required');
  });

  it('rejects two replacements targeting the same existing scene', () => {
    const incomingScenes = [
      createSceneFixture({ id: 'incoming-1' }),
      createSceneFixture({ id: 'incoming-2' }),
    ];

    expect(() =>
      planSceneConflicts(
        [createSceneFixture({ id: 'target' })],
        incomingScenes,
        [
          {
            action: 'replace',
            incomingSceneId: 'incoming-1',
            targetSceneId: 'target',
          },
          {
            action: 'replace',
            incomingSceneId: 'incoming-2',
            targetSceneId: 'target',
          },
        ],
        { createId: () => 'copy', now: 500 },
      ),
    ).toThrow('cannot be replaced more than once');
  });
});
