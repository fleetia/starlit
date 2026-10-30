import { useEffect, type ReactElement } from 'react';
import { Heading, Text, ThemeRoot } from '@fleetia/lagrange';

import { version } from '../../manifest.json';
import type { Locale } from '../i18n';
import type { LicenseEntry } from './types';
import * as styles from './LicensesPage.css';

const COPY = {
  ko: {
    title: '오픈소스 라이선스',
    description: 'Starlit에 사용된 라이브러리와 폰트의 라이선스입니다.',
    original: '라이선스 원문',
    website: '웹사이트',
    source: '소스 코드',
  },
  en: {
    title: 'Open-source licenses',
    description: 'Licenses for the libraries and fonts used in Starlit.',
    original: 'License text',
    website: 'Website',
    source: 'Source code',
  },
  ja: {
    title: 'オープンソースライセンス',
    description: 'Starlitで使用しているライブラリとフォントのライセンスです。',
    original: 'ライセンス全文',
    website: 'ウェブサイト',
    source: 'ソースコード',
  },
};

type LicensesPageProps = { locale: Locale; licenses: readonly LicenseEntry[] };

export function LicensesPage({
  locale,
  licenses,
}: LicensesPageProps): ReactElement {
  const copy = COPY[locale];
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `Starlit · ${copy.title}`;
  }, [copy.title, locale]);

  return (
    <ThemeRoot className={styles.root}>
      <main className={styles.main}>
        <header className={styles.header}>
          <Text as="p" tone="muted">
            Starlit {version}
          </Text>
          <Heading level={1} variant="display">
            {copy.title}
          </Heading>
          <Text as="p">{copy.description}</Text>
          <div className={styles.links}>
            <a
              className={styles.link}
              href="https://github.com/fleetia/starlit"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub ↗
            </a>
            <a
              className={styles.link}
              href="https://star-light.space"
              rel="noopener noreferrer"
              target="_blank"
            >
              {copy.website} ↗
            </a>
          </div>
        </header>
        {licenses.map((entry) => (
          <section
            className={styles.entry}
            key={`${entry.name}@${entry.version ?? ''}`}
          >
            <Heading level={2} variant="subsection">
              {entry.name}
            </Heading>
            <Text as="p" tone="muted">
              {[entry.version, entry.license].filter(Boolean).join(' · ')}
            </Text>
            {entry.repositoryUrl || entry.homepageUrl ? (
              <div className={styles.links}>
                {entry.repositoryUrl ? (
                  <a
                    className={styles.link}
                    href={entry.repositoryUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {entry.repositoryUrl.startsWith('https://github.com/')
                      ? 'GitHub'
                      : copy.source}{' '}
                    ↗
                  </a>
                ) : null}
                {entry.homepageUrl ? (
                  <a
                    className={styles.link}
                    href={entry.homepageUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {copy.website} ↗
                  </a>
                ) : null}
              </div>
            ) : null}
            <details className={styles.details}>
              <summary className={styles.summary}>{copy.original}</summary>
              {entry.notices.map((notice) => (
                <pre className={styles.notice} key={notice.name}>
                  {notice.text}
                </pre>
              ))}
            </details>
          </section>
        ))}
      </main>
    </ThemeRoot>
  );
}
