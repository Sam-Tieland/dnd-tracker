import type { ContentRegistry } from '../content/registry';
import type { FeatDef } from '../content/schema';
import type { Character } from '../model/character';
import type { ActiveFeature, ClassLevel, FeatureOrigin, Warning } from './types';
import { unknownContent } from './warnings';

function collectFeats(character: Character, registry: ContentRegistry, warnings: Warning[]): FeatDef[] {
  const { backgroundId, levels, bonusFeatIds } = character.choices;
  const ids: string[] = [];
  if (backgroundId) {
    const background = registry.getOf('background', backgroundId);
    if (!background) unknownContent(warnings, backgroundId);
    else if (background.featId) ids.push(background.featId);
  }
  for (const choice of levels) if (choice.featId) ids.push(choice.featId);
  ids.push(...bonusFeatIds);
  const feats: FeatDef[] = [];
  for (const id of ids) {
    const feat = registry.getOf('feat', id);
    if (feat) feats.push(feat);
    else unknownContent(warnings, id);
  }
  return feats;
}

export function collectFeatures(character: Character, registry: ContentRegistry, classLevels: ClassLevel[], warnings: Warning[]): ActiveFeature[] {
  const features: ActiveFeature[] = [];
  const seen = new Set<string>();
  const add = (id: string, origin: FeatureOrigin, ownerName?: string, level?: number) => {
    if (seen.has(id)) return;
    seen.add(id);
    const def = registry.getOf('feature', id);
    if (!def) {
      unknownContent(warnings, id);
      return;
    }
    features.push({
      id,
      name: def.name,
      text: def.text,
      effects: def.effects,
      origin,
      ownerName: ownerName ?? def.optionGroup ?? '',
      level,
      placeholder: def.source === 'skeleton' && def.name === '',
    });
  };

  for (const cl of classLevels) {
    const cls = registry.getOf('class', cl.classId);
    if (!cls) continue;
    for (const row of cls.levels.slice(0, cl.level)) for (const id of row.featureIds) add(id, 'class', cls.name, row.level);
    const sub = cl.subclassId ? registry.getOf('subclass', cl.subclassId) : undefined;
    if (sub) for (const f of sub.features) if (f.level <= cl.level) add(f.featureId, 'subclass', sub.name, f.level);
  }

  const { speciesId, featureOptions } = character.choices;
  if (speciesId) {
    const species = registry.getOf('species', speciesId);
    if (species) for (const id of species.traitIds) add(id, 'species', species.name);
    else unknownContent(warnings, speciesId);
  }
  for (const id of featureOptions) {
    // An option only counts while its parent feature is active (Divine Order needs a Cleric level).
    const parentId = registry.getOf('feature', id)?.optionOf;
    if (parentId !== undefined && !seen.has(parentId)) continue;
    add(id, 'option', parentId !== undefined ? registry.getOf('feature', parentId)?.name : undefined);
  }

  for (const feat of collectFeats(character, registry, warnings)) {
    if (seen.has(feat.id)) continue;
    seen.add(feat.id);
    features.push({ id: feat.id, name: feat.name, text: feat.text, effects: feat.effects, origin: 'feat', ownerName: '', placeholder: false });
  }
  return features;
}
