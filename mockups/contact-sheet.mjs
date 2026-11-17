/**
 * Builds mockups/contact-sheet.html — each gallery photo at readable size with
 * its current filename, so filenames can be re-matched to actual content.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dir = path.resolve(import.meta.dirname);

const files = ['01-the-pool', '02-long-lunches', '03-unhurried-mornings', '04-the-garden', '05-seven-rooms', '06-golden-hour', '07-the-verandah', '08-Siolim-evenings'];

const items = files.map((name) => {
  const file = readFileSync(path.join(root, 'public', 'gallery', `${name}.jpg`));
  return `<figure style="margin:0"><img src="data:image/jpeg;base64,${file.toString('base64')}" alt="${name}" style="width:100%;max-height:560px;object-fit:contain;background:#eee"><figcaption style="font:bold 1.1rem sans-serif;color:#203b30;padding:8px 0 28px">${name}.jpg</figcaption></figure>`;
}).join('\n');

writeFileSync(path.join(dir, 'contact-sheet.html'), `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Contact sheet</title></head><body style="margin:32px;background:#fdf6e9"><div style="max-width:900px margin:0 auto">${items}</div></body></html>`);
console.log('contact-sheet.html written');
