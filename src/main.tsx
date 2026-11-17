import { createRoot, hydrateRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

// The page HTML is pre-rendered at build time (scripts/prerender.mjs), so we
// hydrate: React adopts the existing markup instead of wiping and redrawing it.
// No flash, no content swap on load.
//
// `vite dev` serves the raw index.html, whose #root is empty — hydrating that
// makes React report a mismatch against no markup at all. So hydrate only when
// the build actually left prerendered markup inside #root, and otherwise mount
// normally, which is what the dev server needs.
const container = document.getElementById('root')!;
const app = (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
const options = {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error: unknown, errorInfo: { componentStack?: string }) => {
    console.error(error, errorInfo.componentStack);
  },
};

if (container.firstElementChild) {
  hydrateRoot(container, app, options);
} else {
  createRoot(container, options).render(app);
}
