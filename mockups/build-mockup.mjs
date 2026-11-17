/**
 * Builds mockups/collage-options.html — four candidate collage layouts for
 * /gallery, rendered with the real photos embedded as data URIs so the file
 * is fully self-contained (register_preview can serve it without a server).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.resolve(import.meta.dirname);

const NAMES = [
  '01-the-pool', '02-long-lunches', '03-unhurried-mornings', '04-the-garden',
  '05-seven-rooms', '06-golden-hour', '07-the-verandah', '08-Siolim-evenings',
];

const photos = NAMES.map((name) => {
  const file = readFileSync(path.join(root, 'public', 'gallery', `${name}.jpg`));
  return { name, caption: name.replace(/^\d+-/, '').replaceAll('-', ' '), data: `data:image/jpeg;base64,${file.toString('base64')}` };
});

const vars = `--cream:#fdf6e9;--paper:#fbf7ee;--ink:#2c3a33;--green:#203b30;--line:#e3dbc9;--terra:#e5a185;--table:#e0d8c6;`

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>/gallery collage options — Oxel House</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Reenie+Beanie&display=swap" rel="stylesheet">
<style>
  ${vars}
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--cream); color: var(--ink); font-family: 'DM Sans', sans-serif; }
  .option { padding: 48px 40px 72px; border-bottom: 3px dashed rgba(32,59,48,.25); }
  .opt-label { font-family: 'Fraunces', serif; font-weight: 500; letter-spacing: -.03em; font-size: 2rem; color: var(--green); margin: 0 0 4px; }
  .opt-desc { margin: 0 0 28px; max-width: 62ch; font-size: .95rem; line-height: 1.55; color: #55645c; }
  .opt-tag { display: inline-block; font-size: .72rem; letter-spacing: .18em; text-transform: uppercase; color: var(--green); border: 1px solid var(--line); background: #fff; border-radius: 999px; padding: 5px 12px; margin-bottom: 12px; }
  img { display: block; }

  /* ---- Option A : justified rows ---- */
  .jrow { display: flex; gap: 12px; height: 260px; margin-bottom: 12px; }
  .jrow img { height: 100%; width: auto; flex: 1 1 auto; min-width: 0; object-fit: cover; border-radius: 3px; }
  .jrow.wide img { }

  /* ---- Option B : editorial mosaic ---- */
  .mosaic { display: grid; grid-template-columns: repeat(6, 1fr); grid-template-rows: repeat(3, 190px); gap: 14px; }
  .mosaic figure { position: relative; margin: 0; border-radius: 4px; background: var(--paper); box-shadow: 0 14px 30px -18px rgba(44,50,38,.45); }
  .mosaic img { width: 100%; height: 100%; object-fit: cover; border-radius: 4px; }
  .mosaic .m-hero { grid-column: 1 / span 4; grid-row: 1 / span 3; }
  .mosaic .m-tall { grid-column: 5 / span 2; grid-row: 1 / span 2; }
  .mosaic .m-cell { grid-column: span 1; }
  .mosaic .m-cell2 { grid-column: 5 / span 1; grid-row: 3; }
  .mosaic .m-cell3 { grid-column: 6 / span 1; grid-row: 3; }
  .cap-plate { position: absolute; left: 14px; bottom: 14px; background: rgba(253,246,233,.92); border: 1px solid var(--line); border-radius: 3px; padding: 4px 10px 2px; font-family: 'Reenie Beanie', cursive; font-size: 1.5rem; line-height: 1; color: var(--ink); }

  /* ---- Option C : scrapbook tableau (static cousin of the deck) ---- */
  .scrap { position: relative; height: 640px; background: var(--table); border: 1px solid #d2caba; border-radius: 4px; overflow: hidden; }
  .polaroid { position: absolute; width: 210px; padding: 10px 10px 44px; background: var(--paper); border: 1px solid var(--line); box-shadow: 0 2px 3px rgba(44,50,38,.18), 0 10px 24px -12px rgba(44,50,38,.18); transition: transform .25s ease, box-shadow .25s ease; cursor: default; }
  .polaroid:hover { transform: rotate(0deg) scale(1.08) !important; z-index: 30 !important; box-shadow: 0 18px 40px -14px rgba(44,50,38,.5); }
  .polaroid img { width: 100%; aspect-ratio: 1; object-fit: cover; }
  .polaroid .pcap { position: absolute; left: 0; right: 0; bottom: 8px; text-align: center; font-family: 'Reenie Beanie', cursive; font-size: 1.55rem; line-height: 1; color: var(--ink); }

  /* ---- Option D : masonry columns ---- */
  .masonry { columns: 3 260px; column-gap: 14px; }
  .masonry figure { margin: 0 0 14px; break-inside: avoid; background: var(--paper); border: 1px solid var(--line); padding: 8px 8px 30px; box-shadow: 0 12px 26px -16px rgba(44,50,38,.4); }
  .masonry img { width: 100%; object-fit: cover; }
  .masonry .pcap { font-family: 'Reenie Beanie', cursive; font-size: 1.45rem; color: var(--ink); text-align: center; margin-top: 6px; }
  .r34 { aspect-ratio: 3 / 4; } .r43 { aspect-ratio: 4 / 3; } .r11 { aspect-ratio: 1; } .r23 { aspect-ratio: 2 / 3; }
</style>
</head>
<body>

<!-- ========== OPTION A ========== -->
<section class="option">
  <div class="opt-tag">Option A</div>
  <h2 class="opt-label">Justified rows</h2>
  <p class="opt-desc">Flickr / Google-Photos style: every photo shows its full shape, the page keeps a calm horizontal rhythm with even gutters. Cleanest, most gallery-serif option — content-forward, least decoration. Responsive by default (rows re-flow on mobile).</p>
  <div class="jrow">${photos.slice(0, 3).map((p) => `<img src="${p.data}" alt="${p.caption}">`).join('')}</div>
  <div class="jrow">${photos.slice(3, 6).map((p) => `<img src="${p.data}" alt="${p.caption}">`).join('')}</div>
  <div class="jrow" style="height:300px">${photos.slice(6).map((p) => `<img src="${p.data}" alt="${p.caption}">`).join('')}</div>
</section>

<!-- ========== OPTION B ========== -->
<section class="option">
  <div class="opt-tag">Option B</div>
  <h2 class="opt-label">Editorial mosaic</h2>
  <p class="opt-desc">One hero photo anchors the story, the rest orbit it in a strict grid with handwritten caption plates. Newspaper-magazine feel — best match for the "A pile of days" headline and the luxe, deliberate tone of the home page.</p>
  <div class="mosaic">
    <figure class="m-hero"><img src="${photos[0].data}" alt="${photos[0].caption}"><span class="cap-plate">the pool — a quiet centre of gravity</span></figure>
    <figure class="m-tall"><img src="${photos[5].data}" alt="${photos[5].caption}"><span class="cap-plate">golden hour</span></figure>
    <figure class="m-cell2"><img src="${photos[1].data}" alt="${photos[1].caption}"></figure>
    <figure class="m-cell3"><img src="${photos[2].data}" alt="${photos[2].caption}"></figure>
  </div>
  <div class="mosaic" style="margin-top:14px; grid-template-rows: repeat(2, 230px);">
    ${[3, 4, 6, 7].map((n) => `<figure class="m-cell" style="grid-column: span 3;"><img src="${photos[n].data}" alt="${photos[n].caption}"><span class="cap-plate">${photos[n].caption}</span></figure>`).join('')}
  </div>
</section>

<!-- ========== OPTION C ========== -->
<section class="option">
  <div class="opt-tag">Option C</div>
  <h2 class="opt-label">Scrapbook tableau (static)</h2>
  <p class="opt-desc">The deck's cousin, parked: tilted polaroids scattered on the table surface, hover lifts a photo — but nothing is draggable, so it stays fast and mobile-safe. Most on-brand continuity with the interactive deck you're moving to the home page (they'd read as the same object in two states).</p>
  <div class="scrap">
    ${[
      { n: 0, x: 30, y: 60, r: -5, z: 3 }, { n: 5, x: 470, y: 40, r: 4, z: 2 },
      { n: 1, x: 950, y: 70, r: -3, z: 4 }, { n: 2, x: 180, y: 300, r: 3, z: 5 },
      { n: 6, x: 660, y: 280, r: -6, z: 3 }, { n: 3, x: 1120, y: 350, r: 5, z: 2 },
      { n: 4, x: 420, y: 430, r: 2, z: 6 }, { n: 7, x: 880, y: 460, r: -2, z: 4 },
    ].map(({ n, x, y, r, z }) => `
      <figure class="polaroid" style="left:${x}px; top:${y}px; transform: rotate(${r}deg); z-index:${z};"><img src="${photos[n].data}" alt="${photos[n].caption}"><span class="pcap">${photos[n].caption}</span></figure>`).join('')}
  </div>
</section>

<!-- ========== OPTION D ========== -->
<section class="option">
  <div class="opt-tag">Option D</div>
  <h2 class="opt-label">Masonry columns</h2>
  <p class="opt-desc">Pinterest-style drip: thin paper-bordered tiles of varied heights fall into three columns, captions on each. Chaotic-charming and photo-hungry — livelier than A, busier than B.</p>
  <div class="masonry">
    ${[
      { n: 0, r: 'r43' }, { n: 1, r: 'r34' }, { n: 2, r: 'r43' }, { n: 3, r: 'r23' },
      { n: 4, r: 'r43' }, { n: 5, r: 'r34' }, { n: 6, r: 'r43' }, { n: 7, r: 'r23' },
    ].map(({ n, r }) => `
      <figure><img class="${r}" src="${photos[n].data}" alt="${photos[n].caption}"><figcaption class="pcap">${photos[n].caption}</figcaption></figure>`).join('')}
  </div>
</section>

</body>
</html>
`;

writeFileSync(path.join(dir, 'collage-options.html'), html);
console.log(`mockups/collage-options.html written (${(html.length / 1024).toFixed(0)} KB)`);
