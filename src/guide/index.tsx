import { createRoot } from 'react-dom/client';
import '@fleetia/lagrange/styles.css';

import { GuidePage } from './GuidePage';
import { getGuideRoute } from './guideRoute';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Guide root container not found');
}

const route = getGuideRoute(window.location.search, window.location.hash);
createRoot(container).render(
  <GuidePage locale={route.locale} section={route.section} />,
);
