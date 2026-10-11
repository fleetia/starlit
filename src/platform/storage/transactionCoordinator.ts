export type TransactionStep = {
  apply: () => Promise<void>;
  name: string;
  rollback: () => Promise<void>;
};

export type StorageTransaction = {
  commit: () => Promise<void>;
  steps: readonly TransactionStep[];
};

function createStepAndRollbackError(
  name: string,
  applyError: unknown,
  rollbackError: unknown,
): AggregateError {
  return new AggregateError(
    [applyError, rollbackError],
    `${name} failed and could not be restored.`,
    { cause: applyError },
  );
}

export function createSelfRestoringTransactionStep(
  name: string,
  apply: () => Promise<void>,
  rollback: () => Promise<void>,
): TransactionStep {
  return {
    apply: async (): Promise<void> => {
      try {
        await apply();
      } catch (applyError) {
        try {
          await rollback();
        } catch (rollbackError) {
          throw createStepAndRollbackError(name, applyError, rollbackError);
        }
        throw applyError;
      }
    },
    name,
    rollback,
  };
}

export async function runStorageTransaction({
  commit,
  steps,
}: StorageTransaction): Promise<void> {
  const appliedSteps: TransactionStep[] = [];

  try {
    for (const step of steps) {
      await step.apply();
      appliedSteps.push(step);
    }

    await commit();
  } catch (transactionError) {
    const rollbackErrors: unknown[] = [];

    for (const step of appliedSteps.reverse()) {
      try {
        await step.rollback();
      } catch (rollbackError) {
        rollbackErrors.push(
          new Error(`Rollback failed: ${step.name}`, { cause: rollbackError }),
        );
      }
    }

    if (rollbackErrors.length > 0) {
      const failure = new AggregateError(
        [transactionError, ...rollbackErrors],
        'Storage transaction and rollback failed',
      );
      failure.cause = transactionError;
      throw failure;
    }

    throw transactionError;
  }
}
