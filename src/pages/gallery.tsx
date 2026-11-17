import PhotoFlippingCollage from '@/components/photo-flipping-collage';
import { SiteShell } from '@/components/site-shell';

/**
 * /gallery — the Oxel House album as a dynamic photo collage.
 *
 * Centered hero heading and an interactive editorial collage.
 * A long wall of tiles. Scroll, then pause: every photo on screen at that
 * moment turns over like a calendar page. Tap any photo to turn it, or tap
 * the expand icon to view full size.
 */
export default function Gallery() {
  return (
    <SiteShell>
      <div className="gallery-page">
        <header className="gallery-hero">
          <div className="gallery-hero-inner">
            <p className="gallery-eyebrow">Siolim · North Goa</p>
            <h1 className="gallery-title">Oxel House,<br /><em>in pictures.</em></h1>
            <p className="gallery-subtitle">Scroll and pause — the photographs in view turn over. Tap any one to turn it, or expand to view full size.</p>
          </div>
        </header>
        <PhotoFlippingCollage />
      </div>
    </SiteShell>
  );
}
