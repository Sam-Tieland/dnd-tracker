import { mkdirSync, writeFileSync } from 'node:fs';
import { encodePng, iconPixel } from './png';

const ICONS: Array<[string, number]> = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];

mkdirSync('public/icons', { recursive: true });
for (const [name, size] of ICONS) writeFileSync(`public/icons/${name}`, encodePng(size, iconPixel(size)));
console.log(`wrote ${ICONS.length} icons to public/icons`);
