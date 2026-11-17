# Oxel House Goa

Marketing site for Oxel House, a private 7-bedroom villa with a pool in Siolim, North Goa.
Live at **[oxelhouse.com](https://oxelhouse.com)**.

Three prerendered pages — `/` (the villa, gallery deck, amenities, enquiry form), `/gallery`
(photo mosaic) and `/explore` (things to do nearby). There is no backend and no database:
the enquiry form builds a WhatsApp deep link in the browser.

Stack: Vite 7 + React 19 + Tailwind 4 + wouter, prerendered to static HTML at build time and
hydrated in the browser, served from Cloudflare Workers static assets with a health-only Worker.
Requires Node 24.

## Install & run

```bash
pnpm install          # or: npm install
pnpm dev              # Vite dev server on :3000
pnpm typecheck        # tsc --noEmit
```

## Build

```bash
pnpm build            # vite build -> dist/public (+ prerendered HTML for all three routes)
```

`vite build` writes hashed assets and an `index.html` containing a `<!--root-->` marker, then the
`oxel-prerender` plugin (see `vite.config.ts`) runs `scripts/prerender.mjs`, which renders each
route to its own `dist/public/<route>/index.html` with per-page title, description and canonical.

## Deploy

Cloudflare Worker `oxel-house-villa`, uploading `dist/public` as assets plus `worker/index.ts`.
The custom domain `oxelhouse.com` is attached in the Cloudflare dashboard.

```bash
pnpm build
CLOUDFLARE_ACCOUNT_ID=<account-id> npx wrangler deploy
# or simply:
CLOUDFLARE_ACCOUNT_ID=<account-id> pnpm deploy
```

`wrangler.jsonc` holds the Worker name, the assets directory, `html_handling: "drop-trailing-slash"`
and `run_worker_first: ["/api/*"]`. No secrets or environment variables are needed.

## Where things live

| Path | What |
| --- | --- |
| `src/App.tsx` | Routes, the home page sections and the enquiry form logic |
| `src/pages/` | `gallery.tsx`, `explore.tsx`, `not-found.tsx` |
| `src/components/stay-calendar.tsx` | Check-in / check-out range picker (two-month popover, 2-night minimum) |
| `src/components/guests-wheel.tsx` | Guest-count drum picker inside the enquiry form |
| `src/components/photo-table.tsx`, `photo-flipping-collage.tsx` | Home polaroid deck and gallery mosaic |
| `src/components/site-shell.tsx` | Shared nav, footer, floating WhatsApp button |
| `src/site-info.ts` | Public constants: WhatsApp number, `MAX_GUESTS`, maps and listing URLs |
| `src/index.css` | All site styles, in commented blocks |
| `src/prerender-entry.tsx`, `scripts/prerender.mjs` | Build-time rendering of each route to static HTML |
| `worker/index.ts` | Worker entry — serves `GET /api/healthz` only |
| `public/` | Photos (`public/gallery/`), favicons, `robots.txt`, `sitemap.xml` |

Gallery captions come from filenames in `public/gallery/` (see `src/photo-list.ts`), so new photos
need no code change. Site copy and the WhatsApp number live in `src/site-info.ts` and `src/App.tsx`.

## Notes for changes

- Adding a route means three edits: the `Router` in `src/App.tsx`, `PAGES` in
  `src/prerender-entry.tsx`, and `ROUTES` in `scripts/prerender.mjs`.
- Prerendered pages must hydrate cleanly: no `useId()` in prerendered components, and
  `renderToString` (not `renderToStaticMarkup`) in `src/prerender-entry.tsx`.
- Booking rules (two-night minimum, no past dates) live in `src/components/stay-calendar.tsx`
  and are re-checked in `submitInquiry` in `src/App.tsx`.
