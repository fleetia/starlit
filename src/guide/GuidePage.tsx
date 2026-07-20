import { useEffect, type ReactElement } from 'react';
import { Heading, Text, ThemeRoot } from '@fleetia/lagrange';

import type { Locale } from '../i18n';
import * as styles from './GuidePage.css';
import { getGuideCopy } from './guideCopy';
import {
  createGuideHref,
  GUIDE_SECTIONS,
  type GuideSection,
} from './guideRoute';

type GuidePageProps = {
  locale: Locale;
  section?: GuideSection;
};

const LANGUAGE_LABELS: Record<Locale, string> = {
  en: 'English',
  ja: '日本語',
  ko: '한국어',
};

const SUPPORT_LINKS = {
  homepage: 'https://star-light.space',
  issues: 'https://github.com/fleetia/starlit/issues',
} as const;

function getSectionNumber(index: number): string {
  return String(index + 1).padStart(2, '0');
}

export function GuidePage({ locale, section }: GuidePageProps): ReactElement {
  const copy = getGuideCopy(locale);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = copy.title;
  }, [copy.title, locale]);

  useEffect(() => {
    if (!section) {
      return;
    }

    const heading = document.getElementById(section);
    heading?.scrollIntoView?.({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }, [section]);

  return (
    <ThemeRoot className={styles.root} data-starlit-part="guide-root">
      <div className={styles.shell}>
        <header className={styles.masthead}>
          <div className={styles.topBar}>
            <a className={styles.brand} href={createGuideHref(locale)}>
              <span aria-hidden="true" className={styles.brandMark}>
                ✦
              </span>
              Starlit
            </a>
            <nav aria-label={copy.language} className={styles.languageNav}>
              {(['ko', 'en', 'ja'] as const).map((language) => (
                <a
                  aria-current={language === locale ? 'page' : undefined}
                  className={styles.languageLink}
                  href={createGuideHref(language, section)}
                  key={language}
                >
                  {LANGUAGE_LABELS[language]}
                </a>
              ))}
            </nav>
          </div>

          <div className={styles.hero}>
            <div className={styles.heroCopy}>
              <Text className={styles.badge} variant="data" weight="strong">
                {copy.badge}
              </Text>
              <Heading className={styles.heroTitle} level={1} variant="display">
                {copy.title}
              </Heading>
              <Text as="p" className={styles.heroIntro}>
                {copy.intro}
              </Text>
            </div>

            <aside className={styles.quickStart}>
              <h2 className={styles.quickStartTitle}>
                {copy.quickStart.title}
              </h2>
              <p className={styles.quickStartDescription}>
                {copy.quickStart.description}
              </p>
              <ol className={styles.quickStartList}>
                {copy.quickStart.steps.map((step, index) => (
                  <li className={styles.quickStartItem} key={step.title}>
                    <span
                      aria-hidden="true"
                      className={styles.quickStartNumber}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <strong>{step.title}</strong>
                      <p className={styles.quickStartItemBody}>{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </header>

        <div className={styles.layout}>
          <nav aria-label={copy.navigation} className={styles.contents}>
            <p className={styles.contentsTitle}>{copy.navigation}</p>
            <ol className={styles.contentsList}>
              {GUIDE_SECTIONS.map((sectionId, index) => (
                <li key={sectionId}>
                  <a
                    className={styles.contentsLink}
                    href={createGuideHref(locale, sectionId)}
                  >
                    <span aria-hidden="true" className={styles.contentsNumber}>
                      {getSectionNumber(index)}
                    </span>
                    {copy.sections[sectionId].title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <main className={styles.main} id="guide-content">
            {copy.screenshotNote ? (
              <p className={styles.screenshotNote}>{copy.screenshotNote}</p>
            ) : null}
            <section
              aria-labelledby="data-ownership"
              className={styles.dataOwnership}
            >
              <div className={styles.overviewHeader}>
                <Heading id="data-ownership" level={2} variant="section">
                  {copy.dataOwnershipTitle}
                </Heading>
                <Text as="p" className={styles.overviewDescription}>
                  {copy.dataOwnershipDescription}
                </Text>
              </div>
              <div className={styles.dataGrid}>
                {[copy.chromeData, copy.starlitData].map((data) => (
                  <article className={styles.dataCard} key={data.title}>
                    <h3 className={styles.dataCardTitle}>{data.title}</h3>
                    <ul className={styles.dataCardList}>
                      {data.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <div className={styles.sections}>
              {GUIDE_SECTIONS.map((sectionId, index) => {
                const sectionCopy = copy.sections[sectionId];

                return (
                  <section
                    aria-labelledby={sectionId}
                    className={styles.section}
                    data-guide-section={sectionId}
                    key={sectionId}
                  >
                    <header className={styles.sectionHeader}>
                      <p className={styles.sectionKicker}>
                        {copy.sectionKicker} {getSectionNumber(index)}
                      </p>
                      <Heading
                        className={styles.sectionHeading}
                        id={sectionId}
                        level={2}
                        tabIndex={-1}
                        variant="section"
                      >
                        {sectionCopy.title}
                      </Heading>
                      <Text as="p" className={styles.sectionDescription}>
                        {sectionCopy.description}
                      </Text>
                    </header>

                    {sectionCopy.media.length > 0 ? (
                      <div className={styles.mediaGallery}>
                        {sectionCopy.media.map((media) => (
                          <figure className={styles.figure} key={media.src}>
                            <div className={styles.imageFrame}>
                              <a
                                className={styles.imageLink}
                                href={media.src}
                                rel="noopener noreferrer"
                                target="_blank"
                              >
                                <img
                                  alt={media.alt}
                                  className={styles.image}
                                  decoding="async"
                                  loading={
                                    sectionId === 'getting-started'
                                      ? 'eager'
                                      : 'lazy'
                                  }
                                  src={media.src}
                                />
                              </a>
                            </div>
                            <figcaption className={styles.caption}>
                              {media.caption}
                            </figcaption>
                          </figure>
                        ))}
                      </div>
                    ) : null}

                    <div className={styles.articleGrid}>
                      <div>
                        <h3 className={styles.minorHeading}>
                          {copy.stepsTitle}
                        </h3>
                        <ol className={styles.stepList}>
                          {sectionCopy.steps.map((step, stepIndex) => (
                            <li className={styles.step} key={step.title}>
                              <span
                                aria-hidden="true"
                                className={styles.stepNumber}
                              >
                                {stepIndex + 1}
                              </span>
                              <div>
                                <h4 className={styles.stepTitle}>
                                  {step.title}
                                </h4>
                                <p className={styles.stepBody}>{step.body}</p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <aside className={styles.factsPanel}>
                        <h3 className={styles.minorHeading}>
                          {copy.factsTitle}
                        </h3>
                        <ul className={styles.factsList}>
                          {sectionCopy.facts.map((fact) => (
                            <li key={fact}>{fact}</li>
                          ))}
                        </ul>
                      </aside>
                    </div>

                    {sectionCopy.callout ? (
                      <aside
                        aria-label={sectionCopy.callout.title}
                        className={styles.callout}
                        data-tone={sectionCopy.callout.tone}
                      >
                        <strong>{sectionCopy.callout.title}</strong>
                        <p className={styles.calloutBody}>
                          {sectionCopy.callout.body}
                        </p>
                      </aside>
                    ) : null}

                    {sectionCopy.details.length > 0 ? (
                      <div className={styles.detailsGroup}>
                        <h3 className={styles.minorHeading}>
                          {copy.detailsTitle}
                        </h3>
                        {sectionCopy.details.map((detail) => (
                          <details className={styles.detail} key={detail.title}>
                            <summary className={styles.detailSummary}>
                              {detail.title}
                            </summary>
                            <p className={styles.detailBody}>{detail.body}</p>
                          </details>
                        ))}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>

            <footer className={styles.support}>
              <div>
                <h2 className={styles.supportTitle}>{copy.support.title}</h2>
                <p className={styles.supportDescription}>
                  {copy.support.description}
                </p>
              </div>
              <div className={styles.supportLinks}>
                <a
                  className={styles.supportLink}
                  href={SUPPORT_LINKS.homepage}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {copy.support.homepage}
                  <span aria-hidden="true">↗</span>
                </a>
                <a
                  className={styles.supportLink}
                  href={SUPPORT_LINKS.issues}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {copy.support.issues}
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
            </footer>
          </main>
        </div>
      </div>
    </ThemeRoot>
  );
}
