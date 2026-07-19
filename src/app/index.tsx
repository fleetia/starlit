/* eslint-disable react-refresh/only-export-components */
import { createRoot, type Root as ReactRoot } from 'react-dom/client';
import '@fleetia/lagrange/styles.css';

import { useLocale } from '../hooks/useLocale';
import { I18nProvider } from '../i18n';
import { runStorageMigration } from '../platform/storage/migrateStorage';
import { App } from './App';
import './app.css';

type RootContainer = HTMLElement & {
  starlitRoot?: ReactRoot;
};

function Root(): React.ReactElement | null {
  const { locale, setLocale, isLoaded } = useLocale();

  if (!isLoaded) {
    return null;
  }

  return (
    <I18nProvider locale={locale}>
      <App locale={locale} onLocaleChange={setLocale} />
    </I18nProvider>
  );
}

async function initializeApp(): Promise<void> {
  await runStorageMigration();

  const container = document.getElementById('root') as RootContainer | null;
  if (!container) {
    throw new Error('Root container not found');
  }

  const root = container.starlitRoot ?? createRoot(container);
  container.starlitRoot = root;
  root.render(<Root />);
}

void initializeApp().catch((error: unknown) => {
  if (typeof globalThis.reportError === 'function') {
    globalThis.reportError(error);
    return;
  }

  throw error;
});
