import { contentId } from '../../src/content/ids';
import type { MagicItemDef } from '../../src/content/schema';
import { splitSections } from './markdown';

const TYPE_LINE = /^_((Armor|Weapon|Wondrous Item|Potion|Ring|Rod|Scroll|Staff|Wand)\b.*)_$/;

/** Split on commas that are not inside parentheses. */
export function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  parts.push(current.trim());
  return parts;
}

export function convertMagicItems(md: string): MagicItemDef[] {
  const items: MagicItemDef[] = [];
  for (const entry of splitSections(md, 4)) {
    if (entry.title === '') continue;
    const lines = entry.body.split('\n');
    const headerIndex = lines.findIndex((line) => line.trim() !== '');
    const match = TYPE_LINE.exec(lines[headerIndex]?.trim() ?? '');
    if (!match) continue;
    const typeLine = match[1];
    const rarity = splitTopLevel(typeLine).slice(1).join(', ').replace(/\s*\(Requires Attunement[^)]*\)/, '').trim();
    items.push({
      id: contentId('srd', 'magic-item', entry.title),
      type: 'magic-item',
      source: 'srd',
      name: entry.title,
      typeLine,
      category: match[2],
      rarity,
      attunement: /Requires Attunement/.test(typeLine),
      text: lines.slice(headerIndex + 1).join('\n').trim(),
    });
  }
  return items;
}
