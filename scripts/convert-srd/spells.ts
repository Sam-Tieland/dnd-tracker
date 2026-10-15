import { ABILITY_BY_NAME } from '../../src/content/constants';
import { contentId } from '../../src/content/ids';
import type { SpellDef } from '../../src/content/schema';
import { field, splitSections, withoutFields } from './markdown';

const HEADER = /^_(?:Level ([1-9]) ([A-Za-z]+)|([A-Za-z]+) Cantrip) \((.+)\)_$/;
// The SRD markdown writes "**Component:**" (singular) for 12 spells, so both labels are read and removed.
const PROPERTY_LABELS = ['Casting Time', 'Range', 'Components', 'Component', 'Duration'];

function cantripInfo(text: string): SpellDef['cantrip'] {
  const damage = /(\d+d\d+) (?:([A-Z][a-z]+) damage|damage of a type you choose)/.exec(text);
  if (!damage) return undefined;
  const save = /(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) saving throw/.exec(text);
  const attackType = /spell attack/i.test(text) ? 'attack' : save ? 'save' : undefined;
  return {
    damageDice: damage[1],
    damageType: damage[2] ?? 'Choice',
    attackType,
    saveAbility: attackType === 'save' && save ? ABILITY_BY_NAME[save[1]] : undefined,
    scales: /_Cantrip Upgrade\._ The damage increases by \d+d\d+/.test(text),
  };
}

export function convertSpells(md: string): SpellDef[] {
  const start = md.indexOf('\n## Spell Descriptions');
  if (start < 0) throw new Error('spells: "## Spell Descriptions" not found');
  const spells: SpellDef[] = [];
  for (const entry of splitSections(md.slice(start), 4)) {
    if (entry.title === '') continue;
    const lines = entry.body.split('\n');
    const headerIndex = lines.findIndex((line) => line.trim() !== '');
    const header = HEADER.exec(lines[headerIndex]?.trim() ?? '');
    if (!header) {
      const previous = spells[spells.length - 1];
      if (!previous) throw new Error(`spells: "${entry.title}" appears before the first spell`);
      previous.text += `\n\n#### ${entry.title}\n\n${entry.body}`;
      continue;
    }
    const rest = lines.slice(headerIndex + 1).join('\n');
    const level = header[1] ? Number(header[1]) : 0;
    const castingTime = field(rest, 'Casting Time') ?? '';
    const duration = field(rest, 'Duration') ?? '';
    const text = withoutFields(rest, PROPERTY_LABELS);
    spells.push({
      id: contentId('srd', 'spell', entry.title),
      type: 'spell',
      source: 'srd',
      name: entry.title,
      level,
      school: header[2] ?? header[3],
      classes: header[4].split(/,\s*/).map((name) => contentId('srd', 'class', name)),
      castingTime,
      ritual: /Ritual/.test(castingTime),
      range: field(rest, 'Range') ?? '',
      components: field(rest, 'Components') ?? field(rest, 'Component') ?? '',
      duration,
      concentration: duration.startsWith('Concentration'),
      text,
      cantrip: level === 0 ? cantripInfo(text) : undefined,
    });
  }
  return spells;
}
