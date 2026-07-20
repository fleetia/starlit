import { useRef, useState, type ReactElement } from 'react';
import { Button, Dialog, Inline, Stack, Text } from '@fleetia/lagrange';

import { createGuideHref } from '../guide/guideRoute';
import type { Locale } from '../i18n';
import * as styles from './Tutorial.css';
import { getTutorialCopy } from './tutorialCopy';
import { useTutorialStatus } from './useTutorialStatus';

type FirstInstallTutorialProps = {
  isAppReady: boolean;
  locale: Locale;
};

const STEP_COUNT = 4;

export function FirstInstallTutorial({
  isAppReady,
  locale,
}: FirstInstallTutorialProps): ReactElement | null {
  const { complete, isLoaded, status } = useTutorialStatus();
  const [stepIndex, setStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);
  const copy = getTutorialCopy(locale);
  const step = copy.steps[stepIndex];
  const isLastStep = stepIndex === STEP_COUNT - 1;
  const isOpen = isAppReady && isLoaded && status === 'pending';

  if (!step || !isOpen) {
    return null;
  }

  async function dismiss(): Promise<void> {
    if (isSaving) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await complete();
    } catch {
      setError(copy.error);
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      closeLabel={copy.close}
      footer={
        <Inline gap="sm" justify="between">
          <Button
            ref={initialFocusRef}
            disabled={isSaving}
            onClick={() => void dismiss()}
            variant="quiet"
          >
            {copy.skip}
          </Button>
          <Inline gap="sm">
            {stepIndex > 0 ? (
              <Button
                disabled={isSaving}
                onClick={() => setStepIndex((current) => current - 1)}
                variant="secondary"
              >
                {copy.back}
              </Button>
            ) : null}
            <Button
              isPending={isSaving}
              onClick={() => {
                if (isLastStep) {
                  void dismiss();
                  return;
                }

                setError(null);
                setStepIndex((current) => current + 1);
              }}
            >
              {isLastStep ? copy.finish : copy.next}
            </Button>
          </Inline>
        </Inline>
      }
      initialFocusRef={initialFocusRef}
      isOpen
      onOpenChange={(nextIsOpen) => {
        if (!nextIsOpen) {
          void dismiss();
        }
      }}
      size="medium"
      title={step.title}
    >
      <Stack className={styles.content} gap="md">
        <Text className={styles.step} variant="data">
          {copy.step(stepIndex + 1, STEP_COUNT)}
        </Text>
        <Text as="p">{step.description}</Text>
        {isLastStep ? (
          <nav aria-label={copy.guide} className={styles.guideLinks}>
            <a
              className={styles.guideLink}
              href={createGuideHref(locale, 'getting-started')}
              rel="noopener noreferrer"
              target="_blank"
            >
              {copy.guide}
            </a>
            <a
              className={styles.guideLink}
              href={createGuideHref(locale, 'tab-groups')}
              rel="noopener noreferrer"
              target="_blank"
            >
              {copy.tabGroupsGuide}
            </a>
          </nav>
        ) : null}
        {error ? (
          <Text aria-live="polite" as="p" tone="critical">
            {error}
          </Text>
        ) : null}
      </Stack>
    </Dialog>
  );
}
