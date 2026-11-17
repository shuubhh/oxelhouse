import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Layers, Shuffle } from 'lucide-react';

import { GALLERY_PHOTOS } from '@/photo-list';

/* ---------------------------------------------------------------------------
 * Photo dump — an interactive table of draggable polaroid-style photos.
 * Ported from the provided standalone HTML, restyled to the Oxel House palette.
 *
 * TO REPLACE THE PHOTOS: drop your files into public/gallery/ and list them
 * below. Filenames must match the `src` paths (e.g. '/gallery/photo-10.jpg').
 * Captions render in a handwritten font on each polaroid. If a file is
 * missing, a painted placeholder scene is shown instead — handy while the
 * professional shoot is pending.
 * ------------------------------------------------------------------------- */
const PHOTOS = GALLERY_PHOTOS;

type Mode = 'scatter' | 'stack' | 'deck';

interface CardState {
  el: HTMLDivElement;
  img: HTMLImageElement;
  cap: string;
  x: number; y: number; r: number; sc: number;
  vx: number; vy: number; vr: number;
  drag: boolean;
  i: number;
}

/* Painted fallback scenes, used only while a photo file is missing. */
const SCENES = [
  ['#8fc3cf', '#3c8fa3', '#e9d8a6'], ['#f2c38b', '#b8683f', '#6f7d4f'], ['#cfe0d6', '#7fa38d', '#f6e7c1'],
  ['#a9c79a', '#3f6b45', '#dfe8c9'], ['#e8ddd0', '#a8502f', '#f4efe6'], ['#f5b26b', '#d4693a', '#3b4f45'],
  ['#d7c9b1', '#8a6a4a', '#203b30'], ['#9a8fb7', '#e79a6c', '#2d3a4a'], ['#b9d4a8', '#2f5d3f', '#f1e7b8'],
  ['#9fb7a4', '#4e6f5d', '#c5d2c6'], ['#9ed0dc', '#2f7d91', '#f3e1b0'], ['#e7b999', '#9a4f36', '#f2e3d0'],
  ['#c9b8d8', '#6a5a8a', '#f3e6c9'], ['#a8c8d8', '#3a6a8a', '#e8f0d8'], ['#d8c8a8', '#8a6a3a', '#f0e8d0'],
];

function placeholder(i: number): string {
  const c = document.createElement('canvas');
  c.width = c.height = 360;
  const g = c.getContext('2d');
  if (!g) return '';
  const [sky, mid, sun] = SCENES[i % SCENES.length];
  g.fillStyle = sky; g.fillRect(0, 0, 360, 360);
  g.fillStyle = sun;
  g.beginPath(); g.arc(90 + (i * 53) % 180, 110 + (i * 29) % 60, 42, 0, Math.PI * 2); g.fill();
  g.fillStyle = mid;
  g.beginPath(); g.moveTo(0, 230 + (i % 3) * 12);
  for (let x = 0; x <= 360; x += 40) g.lineTo(x, 225 + Math.sin((x + i * 40) / 55) * 14 + (i % 3) * 12);
  g.lineTo(360, 360); g.lineTo(0, 360); g.closePath(); g.fill();
  g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(0, 300, 360, 60);
  return c.toDataURL('image/png');
}

const DECK_SCALE = 1.45;
const TILTS = [-1.5, 2.5, -3, 1.5, -2];

export default function PhotoTable() {
  const tableRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const viewImgRef = useRef<HTMLImageElement>(null);
  const viewCapRef = useRef<HTMLParagraphElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const stackRef = useRef<HTMLButtonElement>(null);
  const scatterRef = useRef<HTMLButtonElement>(null);
  const deckRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const table = tableRef.current!;
    const view = viewRef.current!;
    const viewImg = viewImgRef.current!;
    const viewCap = viewCapRef.current!;
    const hint = hintRef.current!;
    const count = countRef.current!;
    const prevBtn = prevRef.current!;
    const nextBtn = nextRef.current!;
    const closeBtn = closeRef.current!;
    const stackBtn = stackRef.current!;
    const scatterBtn = scatterRef.current!;
    const deckBtn = deckRef.current!;
    if (!table || !view || !viewImg || !viewCap || !hint || !count || !prevBtn || !nextBtn || !closeBtn || !stackBtn || !scatterBtn || !deckBtn) return;

    const modeBtns: Record<Mode, HTMLButtonElement> = { stack: stackBtn, scatter: scatterBtn, deck: deckBtn };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let z = 1;
    let mode: Mode = 'scatter';
    let order: number[] = [];
    let lastSeen: HTMLElement | null = null;
    let raf = 0;
    let animTimer: ReturnType<typeof setTimeout> | undefined;
    const moved = new Set<number>();
    const cards: CardState[] = [];

    const cardWidth = () => {
      const w = table.clientWidth;
      return w < 480 ? 128 : w < 800 ? 160 : 190;
    };
    const bounds = () => {
      const cw = cardWidth();
      return { W: table.clientWidth, H: table.clientHeight, cw, ch: cw * 1.3 };
    };
    const draw = (s: CardState) => {
      s.el.style.transform = `translate3d(${s.x}px,${s.y}px,0) rotate(${s.r}deg) scale(${s.sc})`;
    };

    PHOTOS.forEach((p, i) => {
      const el = document.createElement('div');
      el.className = 'pol';
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Photo: ${p.caption}. Press Enter to view`);
      const img = document.createElement('img');
      img.className = 'ph';
      img.alt = p.caption;
      img.draggable = false;
      const fallback = placeholder(i);
      img.addEventListener('error', () => { img.src = fallback; }, { once: true });
      img.src = p.src;
      const cap = document.createElement('span');
      cap.className = 'cap';
      cap.textContent = p.caption;
      el.append(img, cap);
      table.insertBefore(el, view);
      const s: CardState = { el, img, cap: p.caption, x: 0, y: 0, r: 0, sc: 1, vx: 0, vy: 0, vr: 0, drag: false, i };
      cards.push(s);
      bind(s);
    });
    order = cards.map((_, i) => i);

    function sizeCards() {
      const w = cardWidth();
      cards.forEach((s) => s.el.style.setProperty('--w', `${w}px`));
    }
    function animate(list: CardState[]) {
      if (reduce) return;
      list.forEach((s) => { s.el.classList.remove('fly'); s.el.classList.add('anim'); });
      clearTimeout(animTimer);
      animTimer = setTimeout(() => cards.forEach((s) => s.el.classList.remove('anim')), 600);
    }
    function setMode(m: Mode) {
      mode = m;
      (Object.keys(modeBtns) as Mode[]).forEach((k) => modeBtns[k].setAttribute('aria-pressed', String(k === m)));
      table.classList.toggle('deck', m === 'deck');
      prevBtn.hidden = nextBtn.hidden = m !== 'deck';
      hint.hidden = false;
      hint.textContent = m === 'deck' ? 'Swipe the top photo left or right' : 'Drag the top photo to see what\u2019s underneath';
    }
    function scatter() {
      setMode('scatter');
      const { W, H, cw, ch } = bounds();
      animate(cards);
      cards.forEach((s) => {
        s.x = (W - cw) / 2 + (Math.random() - .5) * Math.max(W - cw - 40, 0) * .8;
        s.y = (H - ch) / 2 + (Math.random() - .5) * Math.max(H - ch - 40, 0) * .7;
        s.r = (Math.random() - .5) * 36;
        s.sc = 1; s.vx = s.vy = s.vr = 0;
        draw(s);
      });
      cards.slice().sort(() => Math.random() - .5).forEach((s) => { s.el.style.zIndex = String(z++); });
      moved.clear();
      updateCount();
    }
    function tidy() {
      setMode('stack');
      const { W, H, cw, ch } = bounds();
      animate(cards);
      cards.forEach((s) => {
        s.x = (W - cw) / 2 + (Math.random() - .5) * 14;
        s.y = (H - ch) / 2 + (Math.random() - .5) * 14;
        s.r = (Math.random() - .5) * 10;
        s.sc = 1; s.vx = s.vy = s.vr = 0;
        s.el.style.zIndex = String(z++);
        draw(s);
      });
      moved.clear();
      updateCount();
    }
    function deckTop(): CardState {
      return cards[order[0]];
    }
    function layoutDeck(skipEl?: CardState) {
      const { W, H, cw, ch } = bounds();
      const sc = Math.min(DECK_SCALE, (H - 70) / (ch * 1.05));
      const cx = (W - cw) / 2;
      const cy = (H - ch) / 2 - 8;
      order.forEach((ci, k) => {
        const s = cards[ci];
        const d = Math.min(k, 4);
        s.el.classList.toggle('top', k === 0);
        s.el.tabIndex = k === 0 ? 0 : -1;
        s.el.style.zIndex = String(1000 - k);
        if (s === skipEl) return;
        s.x = cx + d * 3; s.y = cy - d * 14; s.sc = sc * (1 - d * .04); s.r = TILTS[d];
        s.vx = s.vy = s.vr = 0;
        draw(s);
      });
      updateCount();
    }
    function deck() {
      if (mode !== 'deck') {
        const top = cards.slice().sort((a, b) => (+b.el.style.zIndex) - (+a.el.style.zIndex));
        order = top.map((s) => s.i);
      }
      setMode('deck');
      animate(cards);
      layoutDeck();
    }
    function next(dir?: number) {
      if (mode !== 'deck') return;
      const s = deckTop();
      const { W } = bounds();
      const d = dir || -1;
      if (reduce) { order.push(order.shift()!); layoutDeck(); hint.hidden = true; return; }
      s.el.classList.remove('anim');
      s.el.classList.add('fly');
      s.x += d * W * .75; s.y += 30; s.r = d * 28;
      draw(s);
      order.push(order.shift()!);
      hint.hidden = true;
      setTimeout(() => {
        if (mode !== 'deck') return;
        s.el.classList.remove('fly');
        animate(cards);
        layoutDeck();
      }, 300);
      layoutDeck(s);
    }
    function prev() {
      if (mode !== 'deck') return;
      order.unshift(order.pop()!);
      const s = deckTop();
      const { W } = bounds();
      s.el.classList.remove('anim', 'fly');
      s.x = -W * .6; s.r = -24;
      draw(s);
      s.el.getBoundingClientRect(); // flush styles before re-animating
      animate(cards);
      layoutDeck();
      hint.hidden = true;
    }
    function updateCount() {
      count.textContent = mode === 'deck'
        ? `${deckTop().i + 1} of ${cards.length}`
        : `${moved.size} of ${cards.length} photos picked up`;
    }
    function open(s: CardState) {
      viewImg.src = s.img.src;
      viewImg.alt = s.cap;
      viewCap.textContent = s.cap;
      lastSeen = s.el;
      view.hidden = false;
      closeBtn.focus();
    }
    function close() {
      view.hidden = true;
      if (lastSeen) lastSeen.focus();
    }

    function bind(s: CardState) {
      let ox = 0, oy = 0, lx = 0, ly = 0, lt = 0, sx = 0, sy = 0, px = 0, py = 0;
      let pid: number | null = null;
      s.el.addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.button !== undefined && e.button !== 0) return;
        if (mode === 'deck' && s !== deckTop()) return;
        pid = e.pointerId;
        s.el.setPointerCapture(pid);
        s.drag = true;
        s.el.classList.remove('anim', 'fly');
        s.el.classList.add('lift');
        if (mode !== 'deck') s.el.style.zIndex = String(z++);
        const b = table.getBoundingClientRect();
        ox = e.clientX - b.left - s.x; oy = e.clientY - b.top - s.y;
        px = s.x; py = s.y;
        lx = sx = e.clientX; ly = sy = e.clientY; lt = performance.now();
        s.vx = s.vy = s.vr = 0;
      });
      s.el.addEventListener('pointermove', (e: PointerEvent) => {
        if (!s.drag || e.pointerId !== pid) return;
        const b = table.getBoundingClientRect();
        const now = performance.now();
        const dt = Math.max(now - lt, 1);
        s.vx = (e.clientX - lx) / dt * 16;
        s.vy = (e.clientY - ly) / dt * 16;
        s.vr = s.vx * .25;
        lx = e.clientX; ly = e.clientY; lt = now;
        s.x = e.clientX - b.left - ox;
        s.y = e.clientY - b.top - oy;
        if (mode === 'deck') {
          s.y = py + (s.y - py) * .35;
          s.r = TILTS[0] + (s.x - px) * .06;
        }
        draw(s);
      });
      const end = (e: PointerEvent) => {
        if (!s.drag) return;
        s.drag = false;
        s.el.classList.remove('lift');
        const dist = Math.hypot(e.clientX - sx, e.clientY - sy);
        if (dist < 6) {
          s.vx = s.vy = s.vr = 0;
          if (mode === 'deck') layoutDeck();
          open(s);
          return;
        }
        if (performance.now() - lt > 80) { s.vx = s.vy = s.vr = 0; }
        if (mode === 'deck') {
          const dx = s.x - px;
          s.vx = s.vy = s.vr = 0;
          if (Math.abs(dx) > bounds().W * .15 || (Math.abs(e.clientX - lx) > 0 && Math.abs(dx) > 40 && performance.now() - lt < 80)) {
            next(dx < 0 ? -1 : 1);
          } else {
            animate([s]);
            layoutDeck();
          }
          return;
        }
        if (mode === 'stack') setMode('scatter');
        if (reduce) { s.vx = s.vy = s.vr = 0; }
        moved.add(s.i);
        updateCount();
        hint.hidden = true;
      };
      s.el.addEventListener('pointerup', end);
      s.el.addEventListener('pointercancel', () => {
        s.drag = false;
        s.el.classList.remove('lift');
        if (mode === 'deck') { animate([s]); layoutDeck(); }
      });
      s.el.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(s);
        } else if (mode === 'deck' && e.key === 'ArrowRight') {
          e.preventDefault();
          next(-1);
          setTimeout(() => deckTop().el.focus(), 320);
        } else if (mode === 'deck' && e.key === 'ArrowLeft') {
          e.preventDefault();
          prev();
          deckTop().el.focus();
        }
      });
    }

    function tick() {
      if (mode !== 'deck') {
        const { W, H, cw, ch } = bounds();
        const pad = cw * .3;
        cards.forEach((s) => {
          if (s.drag) return;
          if (Math.abs(s.vx) + Math.abs(s.vy) + Math.abs(s.vr) < .05) return;
          s.x += s.vx; s.y += s.vy; s.r += s.vr;
          s.vx *= .94; s.vy *= .94; s.vr *= .9;
          if (s.x < -pad) { s.x = -pad; s.vx = Math.abs(s.vx) * .45; }
          if (s.x > W - cw + pad) { s.x = W - cw + pad; s.vx = -Math.abs(s.vx) * .45; }
          if (s.y < -pad) { s.y = -pad; s.vy = Math.abs(s.vy) * .45; }
          if (s.y > H - ch + pad) { s.y = H - ch + pad; s.vy = -Math.abs(s.vy) * .45; }
          draw(s);
        });
      }
      raf = requestAnimationFrame(tick);
    }

    const onDocKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !view.hidden) close();
    };
    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        sizeCards();
        if (mode === 'deck') layoutDeck();
        else if (mode === 'stack') tidy();
        else scatter();
      }, 150);
    };

    scatterBtn.addEventListener('click', scatter);
    stackBtn.addEventListener('click', tidy);
    deckBtn.addEventListener('click', deck);
    nextBtn.addEventListener('click', () => next(-1));
    prevBtn.addEventListener('click', prev);
    closeBtn.addEventListener('click', close);
    view.addEventListener('click', (e: MouseEvent) => { if (e.target === view) close(); });
    document.addEventListener('keydown', onDocKey);
    window.addEventListener('resize', onResize);

    sizeCards();
    cards.forEach((s) => {
      const { W, H, cw, ch } = bounds();
      s.x = (W - cw) / 2; s.y = (H - ch) / 2; s.r = 0; s.sc = 1;
      draw(s);
    });
    requestAnimationFrame(() => requestAnimationFrame(scatter));
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(animTimer);
      clearTimeout(resizeTimer);
      document.removeEventListener('keydown', onDocKey);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <>
      <div className="photo-table" ref={tableRef}>
        <p className="photo-hint" ref={hintRef}>Drag the top photo to see what&rsquo;s underneath</p>
        <div className="photo-view" ref={viewRef} role="dialog" aria-modal="true" aria-label="Photo" hidden>
          <figure className="pol-big">
            <img ref={viewImgRef} alt="" />
            <p ref={viewCapRef} />
          </figure>
          <button className="photo-close" ref={closeRef} aria-label="Close photo" type="button">&times;</button>
        </div>
      </div>
      <div className="photo-bar">
        <div className="photo-left">
          <button className="photo-arrow" ref={prevRef} aria-label="Previous photo" type="button" hidden><ArrowLeft /></button>
          <span className="photo-count" ref={countRef} aria-live="polite" />
          <button className="photo-arrow" ref={nextRef} aria-label="Next photo" type="button" hidden><ArrowRight /></button>
        </div>
        <div className="photo-btns">
          <button className="photo-btn" ref={stackRef} aria-pressed="false" type="button"><Layers />Stack</button>
          <button className="photo-btn" ref={scatterRef} aria-pressed="true" type="button"><Shuffle />Scatter</button>
          <button className="photo-btn" ref={deckRef} aria-pressed="false" type="button"><BookOpen />Flip through</button>
        </div>
      </div>
    </>
  );
}
