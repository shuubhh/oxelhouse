import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Renders the app to static HTML after each build (see scripts/prerender.mjs)
// so index.html ships the full page — crawlers and first paint see everything.
async function prerenderPlugin() {
  return {
    name: 'oxel-prerender',
    closeBundle: async () => {
      // SKIP_PRERENDER=1 disables prerendering entirely. OXEL_PRERENDER_CHILD=1
      // marks the prerender subprocess (which loads this same config file), so
      // it can never re-spawn itself — without this it forks an infinite loop.
      if (process.env.SKIP_PRERENDER === '1' || process.env.OXEL_PRERENDER_CHILD === '1') return;
      await import('node:child_process').then(({ execFileSync }) => {
        execFileSync(process.execPath, ['--max-old-space-size=4096', 'scripts/prerender.mjs'], {
          cwd: import.meta.dirname,
          stdio: 'inherit',
          // Flag the child so the plugin above is a no-op inside it.
          env: { ...process.env, OXEL_PRERENDER_CHILD: '1' },
        });
      });
    },
  };
}

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// Falls back to a sane default so `vite build` works outside Replit
// (e.g. local shells or Cloudflare builds where PORT is unset or 0).
const rawPort = process.env.PORT;
const port = rawPort && Number(rawPort) > 0 ? Number(rawPort) : 3000;

const basePath = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    await prerenderPlugin(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
