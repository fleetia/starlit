import { createRoot } from 'react-dom/client';
import '@fleetia/lagrange/styles.css';
import licenses from 'virtual:starlit-licenses';

import { normalizeGuideLocale } from '../guide/guideRoute';
import { LicensesPage } from './LicensesPage';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Licenses root container not found');
}
const locale = normalizeGuideLocale(
  new URLSearchParams(window.location.search).get('locale'),
);
createRoot(container).render(
  <LicensesPage locale={locale} licenses={licenses} />,
);
