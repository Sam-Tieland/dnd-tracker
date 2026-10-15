import { contentId } from '../../src/content/ids';
import type { MagicItemDef } from '../../src/content/schema';
import { splitSections } from './markdown';

const TYPE_LINE = /^_((Armor|Weapon|Wondrous Item|Potion|Ring|Rod|Scroll|Staff|Wand)\b.*)_$/;

const STAT_BLOCK_LINE = /^_(Tiny|Small|Medium|Large|Huge|Gargantuan)\b[^_]*_$/;

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
    const firstLine = lines[headerIndex]?.trim() ?? '';
    const match = TYPE_LINE.exec(firstLine);
    if (!match) {
      // A stat block (such as "Giant Fly") has its own heading but belongs to the item before it.
      // Other headings without a type line (the rules sections before the first item) are skipped.
      const previous = items[items.length - 1];
      if (previous && STAT_BLOCK_LINE.test(firstLine)) {
        previous.text += `\n\n#### ${entry.title}\n\n${entry.body}`;
      }
      continue;
    }
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
