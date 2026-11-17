import { useCallback, useEffect, useRef, useState } from 'react';

import { GALLERY_PHOTOS } from '@/photo-list';

/* ---------------------------------------------------------------------------
 * Oxel House Photo Collage — wall-calendar page turns
 *
 * A long scrolling wall of tiles. Each tile is a photo that turns like a
 * calendar page: hinged along its top edge, lifting up and folding over, with
 * the next photo already mounted underneath so the reveal is progressive and
 * the hand-over is invisible.
 *
 * Interactions:
 *   - Scroll, then stop ............ every tile that is on screen at that
 *                                    moment turns over (lightly staggered)
 *   - Tap / Click any photo ........ immediately turn that photo
 *   - Expand icon / Double click ... open full-size lightbox viewer
 *
 * Nothing turns while the page is moving, and tiles off screen never animate.
 * --------------------------------------------------------------------------- */

const PHOTOS = GALLERY_PHOTOS;
// Multiple of 7: the CSS lays tiles out in repeating blocks of 7, so this
// keeps the last block complete (no gaps at the bottom of the wall).
const TILE_COUNT = 49;
const FLIP_DURATION_MS = 980; // keep in sync with --collage-turn-ms in index.css
const SETTLE_CLEAR_MS = 90; // must outlast the guarded class-swap frame(s), cleared by timer not rAF
const SCROLL_IDLE_MS = 260; // scroll counts as "stopped" after this much stillness
const STAGGER_MS = 90; // delay between neighbouring tiles when a batch turns
const MIN_VISIBLE_FRACTION = 0.5; // a tile must be at least half on screen to turn
const INITIAL_KICK_MS = 900; // first batch after the page loads
const EAGER_TILES = 6; // only the first screenful loads eagerly

interface TileState {
  photo: number;
  incoming: number | null;
  turning: boolean;
  settling: boolean;
  flipCount: number;
}

function initialTiles(): TileState[] {
  return Array.from({ length: TILE_COUNT }, (_, i) => ({
    photo: i % Math.max(PHOTOS.length, 1),
    incoming: null,
    turning: false,
    settling: false,
    flipCount: 0,
  }));
}

function captionOf(index: number): string {
  return PHOTOS[index]?.caption ?? '';
}

function srcOf(index: number): string {
  return PHOTOS[index]?.src ?? '';
}

export default function PhotoFlippingCollage() {
  const photoCount = PHOTOS.length;

  const [tiles, setTiles] = useState<TileState[]>(initialTiles);
  const [viewer, setViewer] = useState<number | null>(null);

  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;

  const tileEls = useRef<(HTMLElement | null)[]>([]);
  const seenPhotos = useRef<Set<number>>(new Set(tiles.map((t) => t.photo)));
  const reserved = useRef<Set<number>>(new Set());
  const commitTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const settleTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const staggerTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const startingTiles = useRef<Set<number>>(new Set()); // turns waiting on image decode
  const mounted = useRef(true);

  /* Pick the next photo that isn't currently displayed on another tile */
  const pickNextPhoto = useCallback((currentPhoto: number, tileIdx: number): number => {
    const total = PHOTOS.length;
    if (total === 0) return 0;

    const currentlyUsed = new Set<number>(reserved.current);
    tilesRef.current.forEach((t, i) => {
      if (i === tileIdx) return;
      currentlyUsed.add(t.photo);
      if (t.incoming !== null) currentlyUsed.add(t.incoming);
    });

    // Exclude currentPhoto itself so a turn can never reveal the photo already showing.
    const ring = Array.from({ length: total - 1 }, (_, k) => (currentPhoto + 1 + k) % total);

    // Prefer photos never seen yet
    const unseen = ring.find((idx) => !seenPhotos.current.has(idx) && !currentlyUsed.has(idx));
    if (unseen !== undefined) return unseen;

    // Otherwise any currently unused photo
    const free = ring.find((idx) => !currentlyUsed.has(idx));
    return free !== undefined ? free : ring[0];
  }, []);

  /* Complete the turn: adopt incoming photo and reset flip */
  const commitTile = useCallback((tileIdx: number) => {
    const timer = commitTimers.current.get(tileIdx);
    if (timer) {
      clearTimeout(timer);
      commitTimers.current.delete(tileIdx);
    }

    const currentTile = tilesRef.current[tileIdx];
    if (!currentTile || currentTile.incoming === null) return;

    const newPhoto = currentTile.incoming;
    reserved.current.delete(newPhoto);
    seenPhotos.current.add(newPhoto);

    setTiles((prev) => {
      const copy = prev.slice();
      const t = copy[tileIdx];
      if (!t || t.incoming === null) return prev;
      copy[tileIdx] = {
        photo: t.incoming,
        incoming: null,
        turning: false,
        settling: true,
        flipCount: t.flipCount + 1,
      };
      return copy;
    });

    // The settling render disables transitions/animations via CSS so the
    // class-swap reset is instant and flicker-free; drop the flag via timer —
    // requestAnimationFrame can stay suspended indefinitely in occluded or
    // throttled renders, which would leave is-settling stuck forever and
    // silently kill every later flip on that tile.
    const pending = settleTimers.current.get(tileIdx);
    if (pending) clearTimeout(pending);
    settleTimers.current.set(
      tileIdx,
      setTimeout(() => {
        settleTimers.current.delete(tileIdx);
        setTiles((prev) => {
          const t = prev[tileIdx];
          if (!t || !t.settling) return prev;
          const copy = prev.slice();
          copy[tileIdx] = { ...t, settling: false };
          return copy;
        });
      }, SETTLE_CLEAR_MS),
    );
  }, []);

  /* Turn a single tile like a wall-calendar page */
  const turnTile = useCallback(
    (tileIdx: number) => {
      if (photoCount < 2) return;
      const tile = tilesRef.current[tileIdx];
      if (!tile || tile.turning || tile.incoming !== null) return; // already mid-turn
      if (startingTiles.current.has(tileIdx)) return; // waiting on decode

      startingTiles.current.add(tileIdx);
      const nextPhoto = pickNextPhoto(tile.photo, tileIdx);
      reserved.current.add(nextPhoto);

      // Fully decode the photo that will be revealed BEFORE the page lifts, so
      // the underlay is never blank/half-painted in the first frames of the turn.
      const pre = new Image();
      pre.src = srcOf(nextPhoto);
      const decoded: Promise<unknown> =
        typeof pre.decode === 'function' ? pre.decode().catch(() => undefined) : Promise.resolve();
      // Cap the wait so a slow network never leaves a tap feeling dead.
      const waitCap = new Promise<void>((resolve) => setTimeout(resolve, 1500));
      const ready = Promise.race([decoded, waitCap]);

      ready.then(() => {
        startingTiles.current.delete(tileIdx);
        if (!mounted.current) return;

        setTiles((prev) => {
          const copy = prev.slice();
          const t = copy[tileIdx];
          if (!t || t.turning) return prev;
          copy[tileIdx] = {
            ...t,
            incoming: nextPhoto,
            turning: true,
            // A stale settle guard (e.g. rAF-suspended render) would suppress
            // this turn's animation entirely — clear it as part of starting.
            settling: false,
          };
          return copy;
        });

        // Safety net only; the CSS animationend normally commits first.
        commitTimers.current.set(
          tileIdx,
          setTimeout(() => commitTile(tileIdx), FLIP_DURATION_MS + 60),
        );
      });
    },
    [commitTile, photoCount, pickNextPhoto],
  );

  const cancelPendingStagger = useCallback(() => {
    staggerTimers.current.forEach((id) => clearTimeout(id));
    staggerTimers.current = [];
  }, []);

  /* Turn every tile that is (mostly) on screen right now, in reading order */
  const turnVisibleTiles = useCallback(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    cancelPendingStagger();

    const viewportH = window.innerHeight;
    const visible: number[] = [];
    tileEls.current.forEach((el, idx) => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.height <= 0) return;
      const shown = Math.min(rect.bottom, viewportH) - Math.max(rect.top, 0);
      if (shown / rect.height >= MIN_VISIBLE_FRACTION) visible.push(idx);
    });

    visible.forEach((idx, n) => {
      staggerTimers.current.push(setTimeout(() => turnTile(idx), n * STAGGER_MS));
    });
  }, [cancelPendingStagger, turnTile]);

  /* Scroll, then stop: the tiles on screen at that moment turn over.
     While the page is moving nothing new starts (and any batch still waiting
     in its stagger is cancelled), so the wall never animates under a thumb. */
  useEffect(() => {
    let lastY = window.scrollY;
    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      const currentY = window.scrollY;
      if (Math.abs(currentY - lastY) < 3) return;
      lastY = currentY;

      cancelPendingStagger();
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleTimer = null;
        turnVisibleTiles();
      }, SCROLL_IDLE_MS);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Greet the visitor with a first batch shortly after the page opens
    // (cancelled automatically if they start scrolling right away).
    idleTimer = setTimeout(() => {
      idleTimer = null;
      turnVisibleTiles();
    }, INITIAL_KICK_MS);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, [cancelPendingStagger, turnVisibleTiles]);

  /* Clean up timers on unmount */
  useEffect(() => {
    mounted.current = true;
    const timers = commitTimers.current;
    const settles = settleTimers.current;
    return () => {
      mounted.current = false;
      timers.forEach((id) => clearTimeout(id));
      timers.clear();
      settles.forEach((id) => clearTimeout(id));
      settles.clear();
      staggerTimers.current.forEach((id) => clearTimeout(id));
      staggerTimers.current = [];
    };
  }, []);

  /* Viewer controls */
  const closeViewer = useCallback(() => setViewer(null), []);
  const stepViewer = useCallback(
    (delta: number) => {
      setViewer((curr) =>
        curr == null ? null : (curr + delta + Math.max(photoCount, 1)) % Math.max(photoCount, 1),
      );
    },
    [photoCount],
  );

  useEffect(() => {
    if (viewer == null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeViewer();
      else if (event.key === 'ArrowLeft') stepViewer(-1);
      else if (event.key === 'ArrowRight') stepViewer(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer, closeViewer, stepViewer]);

  return (
    <>
      <div className="gallery-collage-wrap">
        <div
          className="gallery-collage"
          role="list"
          aria-label="Oxel House photo album — scroll and pause to turn the photos, or tap any photo to turn it"
        >
          {tiles.map((tile, idx) => {
            // The underlay only needs an <img> while a page is turning (and
            // through the settle). With 49 tiles, mounting 49 extra images
            // up front would double the page's image load for nothing.
            const underlayPhoto = tile.incoming ?? tile.photo;
            const showUnderlay = tile.incoming !== null || tile.settling;

            return (
              <article
                key={idx}
                ref={(el) => {
                  tileEls.current[idx] = el;
                }}
                className={`collage-tile${tile.turning ? ' is-turning' : ''}${tile.settling ? ' is-settling' : ''}`}
                role="listitem"
                tabIndex={0}
                aria-label={`Photo ${idx + 1}: ${captionOf(tile.photo)}. Tap to turn, or expand to view full size.`}
                onClick={() => turnTile(idx)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    turnTile(idx);
                  }
                }}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  setViewer(tile.photo);
                }}
              >
                {/* Underlay: the incoming photo, mounted beneath the page so the
                    reveal is progressive; stays visible through the settle so
                    the hand-over swap is invisible. Its ::after casts the
                    turning page's shadow. */}
                <div className="collage-underlay" aria-hidden="true">
                  {showUnderlay && (
                    <>
                      <img
                        className="collage-img"
                        src={srcOf(underlayPhoto)}
                        alt=""
                        draggable={false}
                        decoding="async"
                      />
                      <div className="collage-caption-pill">
                        <span>{captionOf(underlayPhoto)}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* 3D Page — hinged at the top edge, lifts and folds over. */}
                <div
                  className={`collage-card-inner${tile.turning ? ' is-flipped' : ''}`}
                  onAnimationEnd={(event) => {
                    if (event.target === event.currentTarget && event.animationName === 'collage-page-turn') {
                      commitTile(idx);
                    }
                  }}
                >
                  {/* Front face: Current photo */}
                  <div className="collage-face collage-face-front">
                    <img
                      className="collage-img"
                      src={srcOf(tile.photo)}
                      alt={captionOf(tile.photo)}
                      draggable={false}
                      decoding="async"
                      loading={idx < EAGER_TILES ? 'eager' : 'lazy'}
                    />
                    <div className="collage-caption-pill">
                      <span>{captionOf(tile.photo)}</span>
                    </div>
                    <div className="collage-face-sheen" aria-hidden="true" />
                  </div>

                  {/* Back face: the blank reverse of the sheet, like a real wall
                      calendar. The incoming photo lives in the underlay. */}
                  <div className="collage-face collage-face-back" aria-hidden="true" />
                </div>

                {/* Tap to expand full screen */}
                <button
                  type="button"
                  className="collage-expand-btn"
                  aria-label={`Open ${captionOf(tile.photo)} full size`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setViewer(tile.photo);
                  }}
                  onDoubleClick={(event) => event.stopPropagation()}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                </button>
              </article>
            );
          })}
        </div>
      </div>

      {/* Full-screen lightbox viewer */}
      <div
        className="gallery-viewer"
        aria-modal="true"
        aria-label="Photo viewer"
        hidden={viewer == null}
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeViewer();
        }}
      >
        <div className="gallery-viewer-figure">
          {viewer != null && (
            <img className="gallery-viewer-img" src={srcOf(viewer)} alt={captionOf(viewer)} />
          )}
        </div>
        <div className="gallery-viewer-bar">
          <button
            className="gallery-viewer-btn"
            type="button"
            onClick={() => stepViewer(-1)}
            aria-label="Previous photo"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <p className="gallery-viewer-caption">
            <span>{viewer != null ? captionOf(viewer) : ''}</span>
            <small>{viewer != null ? `${viewer + 1} of ${photoCount}` : ''}</small>
          </p>
          <button
            className="gallery-viewer-btn"
            type="button"
            onClick={() => stepViewer(1)}
            aria-label="Next photo"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <button
          className="gallery-viewer-close"
          type="button"
          onClick={closeViewer}
          aria-label="Close viewer"
        >
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </>
  );
}
