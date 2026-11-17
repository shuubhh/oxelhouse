import PhotoFlippingCollage from '@/components/photo-flipping-collage';
import { SiteShell } from '@/components/site-shell';

/**
 * /gallery — the Oxel House album as a dynamic photo collage.
 *
 * Centered hero heading and an interactive editorial collage.
 * Tap any photo to turn it, or tap the expand icon to view full size.
 * The collage turns itself until the visitor scrolls, and promptly
 * resumes once scrolling stops.
 */
export default function Gallery() {
  return (
    <SiteShell>
      <div className="gallery-page">
        <header className="gallery-hero">
          <div className="gallery-hero-inner">
            <p className="gallery-eyebrow">Siolim · North Goa</p>
            <h1 className="gallery-title">Oxel House,<br /><em>in pictures.</em></h1>
            <p className="gallery-subtitle">Tap any photograph to turn it, or expand to view full size.</p>
          </div>
        </header>
        <PhotoFlippingCollage />
      </div>
    </SiteShell>
  );
}
