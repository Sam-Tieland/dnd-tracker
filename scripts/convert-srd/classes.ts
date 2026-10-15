import { contentId, slugify } from '../../src/content/ids';
import type { FeatureDef, GeneratedClassDef, SubclassDef } from '../../src/content/schema';
import { requireSection, splitSections, toInt } from './markdown';
import { tableAfter, type Table } from './tables';

export interface ClassConversion {
  classes: GeneratedClassDef[];
  subclasses: SubclassDef[];
  features: FeatureDef[];
}

interface Heading {
  level: number;
  name: string;
  body: string;
}

const NOT_A_COLUMN = new Set(['level', 'class-features']);
const OPTION_GROUPS: Record<string, string> = {
  'Metamagic Options': 'metamagic',
  'Eldritch Invocation Options': 'eldritch-invocation',
};

function levelHeadings(body: string, context: string): Heading[] {
  return splitSections(body, 4)
    .filter((s) => s.title !== '')
    .map((s) => {
      const match = /^Level (\d+): (.+)$/.exec(s.title);
      if (!match) throw new Error(`${context}: unexpected heading "${s.title}"`);
      return { level: Number(match[1]), name: match[2].trim(), body: s.body };
    });
}

function markerFor(name: string, className: string): FeatureDef['marker'] {
  if (name === `${className} Subclass`) return 'subclass';
  if (name === 'Ability Score Improvement') return 'asi';
  if (name === 'Epic Boon') return 'epicBoon';
  return undefined;
}

function feature(id: string, name: string, text: string, extra: Partial<FeatureDef> = {}): FeatureDef {
  return { id, type: 'feature', source: 'srd', name, text, effects: [], ...extra };
}

function parseFeatureTable(table: Table, className: string, classSlug: string, headings: Heading[]) {
  const named: string[] = [];
  let slotCount = 0;
  for (const cell of table.head[0] ?? []) {
    if (cell.text.startsWith('—')) slotCount = cell.colspan;
    else named.push(slugify(cell.text));
  }
  if (table.body.length !== 20) throw new Error(`${className}: expected 20 level rows, got ${table.body.length}`);

  const levels: GeneratedClassDef['levels'] = [];
  const slots: number[][] = [];
  for (const row of table.body) {
    const level = Number(row[0].text);
    const featureIds: string[] = [];
    let subclassFeature = false;
    const names = row[2].text === '—' ? [] : row[2].text.split(/,\s*/);
    for (const raw of names) {
      const name = raw.replace(/\s*\(.*\)$/, '').trim();
      if (/^subclass feature$/i.test(name)) {
        subclassFeature = true;
        continue;
      }
      if (name === `${className} Subclass`) subclassFeature = true;
      const heading = headings
        .filter((h) => slugify(h.name) === slugify(name) && h.level <= level)
        .sort((a, b) => b.level - a.level)[0];
      if (!heading) throw new Error(`${className} level ${level}: no feature heading for "${raw}"`);
      featureIds.push(contentId('srd', 'feature', classSlug, heading.level, heading.name));
    }
    const columns: Record<string, string> = {};
    named.forEach((key, index) => {
      if (!NOT_A_COLUMN.has(key)) columns[key] = row[index].text;
    });
    levels.push({ level, featureIds, subclassFeature, columns });
    if (slotCount > 0) slots.push(row.slice(named.length, named.length + slotCount).map((cell) => toInt(cell.text)));
  }
  return { levels, slots: slotCount > 0 ? slots : undefined };
}

function convertClass(name: string, body: string, out: ClassConversion): void {
  const classSlug = slugify(name);
  const classId = contentId('srd', 'class', name);
  const parts = splitSections(body, 3);

  const intro = parts[0].body;
  const traitsCaption = `Core ${name} Traits`;
  const coreTraits = Object.fromEntries(tableAfter(intro, traitsCaption).body.map((row) => [row[0].text, row[1].text]));
  const hitDie = toInt(/D(\d+)/.exec(coreTraits['Hit Point Die'] ?? '')?.[1]);
  if (!hitDie) throw new Error(`${name}: hit point die not found`);

  const becoming = requireSection(parts, /^Becoming a/, name);
  const multiclassText = requireSection(splitSections(becoming.body, 4), 'As a Multiclass Character', name).body;

  const featureSection = requireSection(parts, `${name} Class Features`, name);
  const headings = levelHeadings(featureSection.body, name);
  for (const h of headings) {
    out.features.push(
      feature(contentId('srd', 'feature', classSlug, h.level, h.name), h.name, h.body, { marker: markerFor(h.name, name) }),
    );
  }
  const { levels, slots } = parseFeatureTable(tableAfter(featureSection.body, `${name} Features`), name, classSlug, headings);
  const pactSlotsByLevel =
    levels[0].columns['slot-level'] !== undefined
      ? levels.map((l) => ({ slots: toInt(l.columns['spell-slots']), slotLevel: toInt(l.columns['slot-level']) }))
      : undefined;

  out.classes.push({
    id: classId,
    type: 'class',
    source: 'srd',
    name,
    text: intro.slice(0, intro.indexOf(`**${traitsCaption}**`)).trim(),
    hitDie,
    coreTraits,
    multiclassText,
    levels,
    slotsByLevel: slots,
    pactSlotsByLevel,
    subclassLevels: levels.filter((l) => l.subclassFeature).map((l) => l.level),
  });

  const subSection = requireSection(parts, new RegExp(`^${name} Subclass: `), name);
  const subName = subSection.title.slice(`${name} Subclass: `.length).trim();
  const subSlug = slugify(subName);
  const subHeadings = levelHeadings(subSection.body, subName);
  for (const h of subHeadings) {
    out.features.push(feature(contentId('srd', 'feature', subSlug, h.level, h.name), h.name, h.body));
  }
  out.subclasses.push({
    id: contentId('srd', 'subclass', subName),
    type: 'subclass',
    source: 'srd',
    name: subName,
    classId,
    text: splitSections(subSection.body, 4)[0].body,
    features: subHeadings.map((h) => ({ level: h.level, featureId: contentId('srd', 'feature', subSlug, h.level, h.name) })),
  });

  for (const part of parts) {
    const group = OPTION_GROUPS[part.title];
    if (!group) continue;
    for (const option of splitSections(part.body, 4).filter((s) => s.title !== '')) {
      out.features.push(feature(contentId('srd', 'feature', group, option.title), option.title, option.body, { optionGroup: group }));
    }
  }
}

export function convertClasses(md: string): ClassConversion {
  const out: ClassConversion = { classes: [], subclasses: [], features: [] };
  for (const section of splitSections(md, 2).filter((s) => s.title !== '')) {
    convertClass(section.title, section.body, out);
  }
  return out;
}
