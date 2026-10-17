import { ABILITIES, type Ability } from '../../src/content/constants';
import { contentId, slugify } from '../../src/content/ids';
import type { ContentRegistry } from '../../src/content/registry';
import type { ContentItem, Effect, FeatureDef, Formula, SubclassDef } from '../../src/content/schema';

/**
 * Turns the player's private notes on subclasses (one Markdown file per subclass, format in boek/README.md) into own
 * content for the import. The notes and the import file stay private; this code only knows the format.
 */

export type BookSource = "PHB 2024" | "Xanathar's" | "Tasha's";
const SOURCES: readonly BookSource[] = ['PHB 2024', "Xanathar's", "Tasha's"];

export interface Usage {
  max: Formula;
  recharge: 'short' | 'long';
}

export interface BookFeature {
  level: number;
  name: string;
  text: string;
  usage?: Usage;
}

export interface BookSubclass {
  file: string;
  className: string;
  subclass: string;
  source: BookSource;
  description: string;
  features: BookFeature[];
}

const ABILITY_NAMES: Record<string, Ability> = Object.fromEntries(
  ABILITIES.map((a) => [{ str: 'strength', dex: 'dexterity', con: 'constitution', int: 'intelligence', wis: 'wisdom', cha: 'charisma' }[a], a]),
);

/** "Gebruik: <amount> per Short Rest|Long Rest" with a number, "<Ability> modifier (min 1)" or "Proficiency Bonus". */
export function parseUsage(line: string): Usage | undefined {
  const match = /^Gebruik:\s*(.+?)\s+per\s+(Short|Long)\s+Rest\.?\s*$/i.exec(line.trim());
  if (!match) return undefined;
  const amount = match[1].trim();
  const recharge = match[2].toLowerCase() === 'short' ? 'short' : 'long';
  if (/^\d+$/.test(amount)) return { max: Number(amount), recharge };
  if (/^proficiency bonus$/i.test(amount)) return { max: { pb: true }, recharge };
  const mod = /^(\w+) modifier(?:\s*\(min(?:imum)?\s*(\d+)\))?$/i.exec(amount);
  const ability = mod ? ABILITY_NAMES[mod[1].toLowerCase()] : undefined;
  if (mod && ability) return { max: mod[2] ? { mod: ability, min: Number(mod[2]) } : { mod: ability }, recharge };
  return undefined;
}

/** Reads one file; problems that make it unusable are returned as warnings and no subclass. */
export function parseBookFile(file: string, markdown: string): { subclass?: BookSubclass; warnings: string[] } {
  const warnings: string[] = [];
  const text = markdown.replace(/\r\n?/g, '\n');
  const front = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!front) return { warnings: [`${file}: geen blok tussen --- bovenaan`] };
  const meta: Record<string, string> = {};
  for (const line of front[1].split('\n')) {
    const kv = /^(\w+):\s*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = kv[2].trim();
  }
  if (meta.type !== 'subclass') return { warnings: [`${file}: type is niet "subclass"`] };
  const source = SOURCES.find((s) => s === meta.bron);
  if (!meta.class || !meta.subclass || !source) return { warnings: [`${file}: class, subclass of bron ontbreekt of is onbekend`] };

  const body = text.slice(front[0].length);
  const sections = body.split(/^(?=## )/m);
  const intro = sections.shift() ?? '';
  const description = intro.replace(/^# .*$/m, '').trim();

  const features: BookFeature[] = [];
  for (const section of sections) {
    const [heading, ...rest] = section.split('\n');
    const level = /^## Level (\d+)(?: \(was \d+\))?:\s*(.+?)\s*$/.exec(heading);
    if (!level) {
      if (!/^## Notities\s*$/.test(heading)) warnings.push(`${file}: kop overgeslagen: ${heading.trim()}`);
      continue;
    }
    const lines = rest.join('\n').trim().split('\n');
    let usage: Usage | undefined;
    if (/^Gebruik:/i.test(lines[0] ?? '')) {
      usage = parseUsage(lines[0]);
      if (usage) lines.shift();
      else warnings.push(`${file}: "${lines[0]}" niet herkend; blijft in de tekst`);
    }
    features.push({ level: Number(level[1]), name: level[2], text: lines.join('\n').trim(), usage });
  }
  if (features.length === 0) warnings.push(`${file}: geen features gevonden`);
  return { subclass: { file, className: meta.class, subclass: meta.subclass, source, description, features }, warnings };
}

const effectsOf = (feature: BookFeature, key: string): Effect[] =>
  feature.usage ? [{ kind: 'resource', key, name: feature.name, max: feature.usage.max, recharge: feature.usage.recharge }] : [];

export interface Conversion {
  items: ContentItem[];
  filled: string[];
  added: string[];
  skipped: string[];
  warnings: string[];
}

/**
 * PHB 2024 subclasses that are skeletons get filled (the first feature of a skeleton level fills that level's empty
 * feature; further features are added to the subclass). SRD subclasses are complete already and are skipped. Subclasses
 * from Xanathar's and Tasha's become new subclasses named "<name> (<book>)". All ids are stable, so a new import replaces
 * the previous one.
 */
export function toUserContent(subclasses: readonly BookSubclass[], registry: ContentRegistry): Conversion {
  const result: Conversion = { items: [], filled: [], added: [], skipped: [], warnings: [] };
  const usedIds = new Set<string>();
  const uniqueId = (base: string) => {
    let id = base;
    for (let n = 2; usedIds.has(id); n += 1) id = `${base}-${n}`;
    usedIds.add(id);
    return id;
  };

  for (const book of subclasses) {
    const classId = contentId('srd', 'class', book.className);
    if (!registry.getOf('class', classId)) {
      result.warnings.push(`${book.file}: class "${book.className}" bestaat niet in de app`);
      continue;
    }
    const label = `${book.className}: ${book.subclass}${book.source === 'PHB 2024' ? '' : ` (${book.source})`}`;
    const slug = slugify(book.source === 'PHB 2024' ? `${book.className} ${book.subclass}` : `${book.className} ${book.subclass} ${book.source}`);
    const feature = (f: BookFeature, fills?: string): FeatureDef => {
      const id = uniqueId(`user:feature:${slug}-${f.level}-${slugify(f.name)}`);
      return { id, type: 'feature', source: 'user', name: f.name, text: f.text, effects: effectsOf(f, `${slug}-${slugify(f.name)}`), ...(fills ? { fills } : {}) };
    };

    if (book.source === 'PHB 2024') {
      const existing = registry
        .list('subclass')
        .find((s) => s.classId === classId && s.name.toLowerCase() === book.subclass.toLowerCase());
      if (!existing) {
        result.warnings.push(`${book.file}: geen subclass "${book.subclass}" bij ${book.className} in de app`);
        continue;
      }
      if (existing.source === 'srd') {
        result.skipped.push(label);
        continue;
      }
      const slots = new Map(existing.features.map((f) => [f.level, f.featureId]));
      const extras: SubclassDef['features'] = [];
      const filledLevels = new Set<number>();
      for (const f of book.features) {
        const slot = slots.get(f.level);
        if (slot && !filledLevels.has(f.level)) {
          filledLevels.add(f.level);
          result.items.push(feature(f, slot));
        } else {
          const item = feature(f);
          result.items.push(item);
          extras.push({ level: f.level, featureId: item.id });
        }
      }
      const subclassFill: SubclassDef = {
        id: uniqueId(`user:subclass:${slug}`),
        type: 'subclass',
        source: 'user',
        name: '',
        fills: existing.id,
        classId,
        text: book.description,
        features: extras,
      };
      result.items.push(subclassFill);
      result.filled.push(label);
      continue;
    }

    const items = book.features.map((f) => feature(f));
    result.items.push(...items, {
      id: uniqueId(`user:subclass:${slug}`),
      type: 'subclass',
      source: 'user',
      name: `${book.subclass} (${book.source})`,
      classId,
      text: book.description,
      features: book.features.map((f, i) => ({ level: f.level, featureId: items[i].id })),
    } satisfies SubclassDef);
    result.added.push(label);
  }
  return result;
}
