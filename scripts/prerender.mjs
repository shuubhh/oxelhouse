/**
 * Post-build prerender: renders each page of the app to static HTML and writes
 * it into dist/public/<route>/index.html (replacing the <!--root--> marker).
 *
 * Why: crawlers and slow connections get the complete page in the first HTML
 * response, and visitors see the real content on first paint. main.tsx then
 * hydrates the same markup, so there is no flash or content swap.
 *
 * Each sub-page also gets its own <title>, meta description and canonical URL
 * — one page per URL is what makes the multi-page structure useful for search.
 * Cloudflare static assets serve dist/public/<route>/index.html for /<route>
 * and keep the SPA fallback for everything else (no worker changes needed).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { createServer } from 'vite';

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://oxelhouse.com';

// Routes to prerender. Keep in sync with src/prerender-entry.tsx (PAGES)
// and App.tsx (Router). `head` overrides the home page's head tags.
const ROUTES = [
  { path: '/', head: null },
  {
    path: '/gallery',
    head: {
      title: 'Gallery — Oxel House, Siolim, North Goa',
      description: 'Photos from Oxel House: the private pool, tropical gardens, seven en-suite bedrooms, long lunches and slow mornings at our 7-bedroom villa in Siolim, North Goa.',
      ogTitle: 'Gallery — Oxel House, Siolim, North Goa',
    },
  },
  {
    path: '/explore',
    head: {
      title: 'Around the House — Things to Do in North Goa | Oxel House, Siolim',
      description: 'What to do near Oxel House: Anjuna and Morjim beaches, Chapora Fort, Assagao cafés, North Goa restaurants, markets and clubs — curated by the villa team in Siolim.',
      ogTitle: 'Around the House — Things to Do in North Goa | Oxel House',
    },
  },
];

// Minimal browser shims for SSR — the pages only touch window/location via
// wouter during render; everything interactive lives in effects (not run here).
globalThis.window ??= {
  location: { pathname: '/', search: '', hash: '' },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  addEventListener() {},
  removeEventListener() {},
  innerWidth: 1440,
  innerHeight: 900,
};
globalThis.navigator ??= { userAgent: 'prerender' };

// Never spawn prerender children from inside the prerender child, even if
// this script is run directly (the build plugin also passes this via env).
process.env.OXEL_PRERENDER_CHILD = '1';

console.time('prerender:boot');
const vite = await createServer({
  root: pkgRoot,
  configFile: path.resolve(pkgRoot, 'vite.config.ts'),
  // hmr: false stops Vite from opening its HMR WebSocket (port 24678), which
  // collided whenever more than one prerender process existed.
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});
console.timeEnd('prerender:boot');

try {
  const { render } = await vite.ssrLoadModule('/src/prerender-entry.tsx');
  console.log('prerender: modules loaded');

  const baseHtml = readFileSync(path.resolve(pkgRoot, 'dist/public/index.html'), 'utf8');
  if (!baseHtml.includes('<!--root-->')) {
    throw new Error('<!--root--> marker missing from built index.html');
  }

  for (const route of ROUTES) {
    const appHtml = render(route.path);

    // React emits a <link rel="preload" as="image"> for each <img> on the page
    // at the very start of the rendered markup. The browser hoists those into
    // <head>, so leaving them inside #root makes the client's first render
    // differ from this markup and hydration fails with React error #418. Move
    // them into the head: the early fetch is kept, and React reuses the
    // existing preload links instead of adding duplicates.
    const preloads = [];
    const pageHtml = appHtml.replace(/^(?:<link\b[^>]*>)+/, (links) => {
      preloads.push(...(links.match(/<link\b[^>]*>/g) ?? []));
      return '';
    });

    let html = baseHtml.replace('<!--root-->', () => pageHtml);
    if (preloads.length) {
      html = html.replace('</head>', () => `  ${preloads.join('\n  ')}\n  </head>`);
    }

    if (route.head) {
      const canonical = `${SITE_URL}${route.path}`;
      html = html
        .replace(/<title>.*?<\/title>/s, () => `<title>${route.head.title}</title>`)
        .replace(/<meta name="description" content=".*?" \/>/s, () => `<meta name="description" content="${route.head.description}" \/>`)
        .replace(/<link rel="canonical" href=".*?" \/>/s, () => `<link rel="canonical" href="${canonical}" \/>`)
        .replace(/<meta property="og:url" content=".*?" \/>/s, () => `<meta property="og:url" content="${canonical}" \/>`)
        .replace(/<meta property="og:title" content=".*?" \/>/s, () => `<meta property="og:title" content="${route.head.ogTitle}" \/>`);
    }

    const target = path.resolve(
      pkgRoot,
      'dist/public',
      route.path === '/' ? 'index.html' : `${route.path.replace(/^\//, '')}/index.html`,
    );
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, html);
    console.log(`prerender: ${route.path} → ${path.relative(path.resolve(pkgRoot, 'dist/public'), target)} (${appHtml.length.toLocaleString()} chars)`);
  }
  console.log(`prerender: ${ROUTES.length} pages injected`);
} finally {
  await vite.close();
}
