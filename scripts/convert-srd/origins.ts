import { ABILITY_BY_NAME, type Ability } from '../../src/content/constants';
import { contentId, slugify } from '../../src/content/ids';
import type { BackgroundDef, FeatureDef, SpeciesDef } from '../../src/content/schema';
import { requireField, requireSection, splitSections, toInt, withoutFields } from './markdown';

export interface OriginConversion {
  species: SpeciesDef[];
  backgrounds: BackgroundDef[];
  features: FeatureDef[];
}

const TRAIT_START = /^_([^_]+)\._\s*(.*)$/;

function toAbility(name: string, context: string): Ability {
  const ability = ABILITY_BY_NAME[name.trim()];
  if (!ability) throw new Error(`${context}: unknown ability "${name}"`);
  return ability;
}

function parseTraits(body: string): Array<{ name: string; text: string }> {
  const traits: Array<{ name: string; lines: string[] }> = [];
  for (const line of body.split('\n')) {
    const match = TRAIT_START.exec(line);
    if (match) traits.push({ name: match[1].trim(), lines: [match[2]] });
    else if (traits.length > 0) traits[traits.length - 1].lines.push(line);
  }
  return traits.map((t) => ({ name: t.name, text: t.lines.join('\n').trim() }));
}

function convertBackgrounds(top: ReturnType<typeof splitSections>): BackgroundDef[] {
  const section = requireSection(top, 'Character Backgrounds', 'origins');
  const descriptions = requireSection(splitSections(section.body, 3), 'Background Descriptions', 'origins');
  return splitSections(descriptions.body, 4)
    .filter((s) => s.title !== '')
    .map((bg): BackgroundDef => {
      const context = `background ${bg.title}`;
      const featText = requireField(bg.body, 'Feat', context).replace(/\s*\(see "Feats"\)$/, '');
      const feat = /^(.+?)(?: \((.+)\))?$/.exec(featText)!;
      return {
        id: contentId('srd', 'background', bg.title),
        type: 'background',
        source: 'srd',
        name: bg.title,
        text: withoutFields(bg.body, ['Ability Scores', 'Feat', 'Skill Proficiencies', 'Tool Proficiency', 'Equipment']),
        abilityOptions: requireField(bg.body, 'Ability Scores', context)
          .split(/,\s*/)
          .map((name) => toAbility(name, context)),
        featId: contentId('srd', 'feat', feat[1]),
        featNote: feat[2],
        skillProficiencies: requireField(bg.body, 'Skill Proficiencies', context)
          .split(/\s+and\s+|,\s*/)
          .map((skill) => slugify(skill)),
        toolText: requireField(bg.body, 'Tool Proficiency', context),
        equipmentText: requireField(bg.body, 'Equipment', context),
      };
    });
}

export function convertOrigins(md: string): OriginConversion {
  const top = splitSections(md, 2);
  const out: OriginConversion = { species: [], backgrounds: convertBackgrounds(top), features: [] };

  const section = requireSection(top, 'Character Species', 'origins');
  const descriptions = requireSection(splitSections(section.body, 3), 'Species Descriptions', 'origins');
  for (const sp of splitSections(descriptions.body, 4).filter((s) => s.title !== '')) {
    const context = `species ${sp.title}`;
    const speciesSlug = slugify(sp.title);
    const traits = parseTraits(sp.body);
    const traitIds = traits.map((t) => contentId('srd', 'feature', speciesSlug, t.name));
    traits.forEach((trait, index) => {
      out.features.push({ id: traitIds[index], type: 'feature', source: 'srd', name: trait.name, text: trait.text, effects: [] });
    });
    const firstTrait = sp.body.search(/^_[^_]+\._/m);
    out.species.push({
      id: contentId('srd', 'species', sp.title),
      type: 'species',
      source: 'srd',
      name: sp.title,
      text: withoutFields(firstTrait >= 0 ? sp.body.slice(0, firstTrait) : sp.body, ['Creature Type', 'Size', 'Speed']),
      creatureType: requireField(sp.body, 'Creature Type', context),
      size: requireField(sp.body, 'Size', context),
      speed: toInt(requireField(sp.body, 'Speed', context)),
      traitIds,
    });
  }
  return out;
}
