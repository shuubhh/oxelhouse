/**
 * The one list of gallery photos, shared by every consumer:
 * - the interactive deck on the home page (`src/components/photo-table.tsx`)
 * - the /gallery collage (`src/pages/gallery.tsx`)
 *
 * Photos live in `public/gallery/`. The FILE NAME (minus extension) becomes the
 * handwritten caption, so `07-the-verandah.jpg` shows "the verandah". Numeric
 * prefixes ("01-…", "02-…") control story order and are stripped from captions.
 * Drop files in and they appear everywhere — no code edits needed.
 */
export interface GalleryPhoto {
  src: string;
  caption: string;
}

function toPhoto([path, _]: [string, unknown]): GalleryPhoto {
  const file = path.split('/').pop() ?? '';
  const dot = file.lastIndexOf('.');
  const name = dot > 0 ? file.slice(0, dot) : file;
  const caption = name
    .replace(/^\d+-/, '')
    .replaceAll('-', ' ')
    .replaceAll('_', ' ');
  // The src is the served URL, derived from the file name — NOT the glob's ?url
  // value, which the prerenderer and some dev servers report as an absolute/path
  // that Cloudflare workers never serve (e.g. /public/gallery/...). public/gallery/
  // files are served as /gallery/<file> on this site, so that's what we ship.
  return { src: `/gallery/${file}`, caption };
}

export const GALLERY_PHOTOS: GalleryPhoto[] = Object.entries(
  import.meta.glob('/public/gallery/*.{jpg,jpeg,png,webp,avif}', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
)
  .map(toPhoto)
  // Numeric sort so "02-the-pool" follows "01-the-blue-room" regardless of when
  // the files were added.
  .sort((a, b) => a.src.localeCompare(b.src, undefined, { numeric: true }));
