import { contentId } from '../../src/content/ids';
import type { FeatDef } from '../../src/content/schema';
import { requireSection, splitSections } from './markdown';

const CATEGORIES: Record<string, FeatDef['category']> = {
  'Origin Feats': 'origin',
  'General Feats': 'general',
  'Fighting Style Feats': 'fighting-style',
  'Epic Boon Feats': 'epic-boon',
};

export function convertFeats(md: string): FeatDef[] {
  const descriptions = requireSection(splitSections(md, 2), 'Feat Descriptions', 'feats');
  const feats: FeatDef[] = [];
  for (const group of splitSections(descriptions.body, 3)) {
    const category = CATEGORIES[group.title];
    if (!category) continue;
    for (const entry of splitSections(group.body, 4).filter((s) => s.title !== '')) {
      const lines = entry.body.split('\n');
      const headerIndex = lines.findIndex((line) => line.trim() !== '');
      const text = lines.slice(headerIndex + 1).join('\n').trim();
      feats.push({
        id: contentId('srd', 'feat', entry.title),
        type: 'feat',
        source: 'srd',
        name: entry.title,
        category,
        prerequisite: /\(Prerequisite: (.+)\)_$/.exec(lines[headerIndex] ?? '')?.[1],
        repeatable: /_Repeatable\._/.test(text),
        text,
        effects: [],
      });
    }
  }
  return feats;
}
