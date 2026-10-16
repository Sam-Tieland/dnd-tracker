import { buildSkeletons } from './skeletons';
import type {
  ArmorDef, BackgroundDef, ClassDef, ContentItem, Effect, FeatDef, FeatureDef, GearDef, GeneratedClassDef, MagicItemDef,
  SpeciesDef, SpellDef, SubclassDef, WeaponDef,
} from './schema';
import { CLASS_MECHANICS } from './srd/class-mechanics';
import { EFFECTS } from './srd/effects';
import armorJson from './srd/generated/armor.json';
import backgroundsJson from './srd/generated/backgrounds.json';
import classesJson from './srd/generated/classes.json';
import featsJson from './srd/generated/feats.json';
import featuresJson from './srd/generated/features.json';
import gearJson from './srd/generated/gear.json';
import magicItemsJson from './srd/generated/magic-items.json';
import speciesJson from './srd/generated/species.json';
import spellsJson from './srd/generated/spells.json';
import subclassesJson from './srd/generated/subclasses.json';
import weaponsJson from './srd/generated/weapons.json';
import { OPTION_FEATURES, OPTION_GROUP_PARENTS } from './srd/options';

const asList = <T>(data: unknown): T[] => data as T[];

function withEffects<T extends { id: string; effects: Effect[] }>(items: T[]): T[] {
  return items.map((item) => (EFFECTS[item.id] ? { ...item, effects: EFFECTS[item.id] } : item));
}

function withOptionParents(items: FeatureDef[]): FeatureDef[] {
  return items.map((item) => {
    const parent = item.optionGroup ? OPTION_GROUP_PARENTS[item.optionGroup] : undefined;
    return parent ? { ...item, optionOf: parent } : item;
  });
}

let cache: ContentItem[] | undefined;

/** All built-in content: generated SRD data + class mechanics + effects + skeleton subclasses. */
export function loadBuiltinContent(): ContentItem[] {
  if (cache) return cache;
  const classes: ClassDef[] = asList<GeneratedClassDef>(classesJson).map((cls) => {
    const mechanics = CLASS_MECHANICS[cls.id];
    if (!mechanics) throw new Error(`no class mechanics for ${cls.id}`);
    return { ...cls, ...mechanics };
  });
  const skeletons = buildSkeletons(classes);
  cache = [
    ...classes,
    ...asList<SubclassDef>(subclassesJson),
    ...skeletons.subclasses,
    ...withEffects(withOptionParents(asList<FeatureDef>(featuresJson))),
    ...OPTION_FEATURES,
    ...skeletons.features,
    ...asList<SpeciesDef>(speciesJson),
    ...asList<BackgroundDef>(backgroundsJson),
    ...withEffects(asList<FeatDef>(featsJson)),
    ...asList<SpellDef>(spellsJson),
    ...asList<WeaponDef>(weaponsJson),
    ...asList<ArmorDef>(armorJson),
    ...asList<GearDef>(gearJson),
    ...asList<MagicItemDef>(magicItemsJson),
  ];
  return cache;
}
