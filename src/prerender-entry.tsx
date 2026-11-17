import { createElement, type ReactElement } from 'react';
import { renderToString } from 'react-dom/server';

import { ErrorBoundary } from './components/error-boundary';
import { Toaster } from './components/ui/toaster';
import { TooltipProvider } from './components/ui/tooltip';
import Explore from './pages/explore';
import Gallery from './pages/gallery';
import { Home } from './App';

/**
 * Build-time entry: renders a page to static HTML for one route so
 * dist/public/<route>/index.html ships complete markup. The browser paints it
 * instantly and the client hydrates (main.tsx → App's wouter Switch renders
 * the same component by URL) — one source of truth, no flash, no swap.
 *
 * Pages to keep in sync with scripts/prerender.mjs and App.tsx's Router.
 */
const PAGES: Record<string, () => ReactElement> = {
  '/': () => <Home />,
  '/gallery': () => <Gallery />,
  '/explore': () => <Explore />,
};

export function render(pagePath: string): string {
  const page = PAGES[pagePath];
  if (!page) throw new Error(`prerender-entry: unknown route "${pagePath}"`);
  // renderToString, not renderToStaticMarkup: static markup drops the <!-- -->
  // separators React needs between adjacent text nodes (e.g. " Up to {21}
  // guests"), which makes those nodes impossible to hydrate — React then
  // throws a hydration mismatch and redraws the whole page on the client.
  return renderToString(
    <TooltipProvider>
      <ErrorBoundary>
        {page()}
      </ErrorBoundary>
      <Toaster />
    </TooltipProvider>,
  );
}
